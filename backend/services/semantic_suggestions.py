# backend/services/semantic_suggestions.py
"""
Service de suggestions sémantiques avec cache intelligent
Solution hybride : correspondance lexicale + analyse sémantique optionnelle
"""

import json
import time
import hashlib
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone, timedelta
from pathlib import Path
import numpy as np

# Import optionnel pour l'analyse sémantique
try:
    from sentence_transformers import SentenceTransformer
    SEMANTIC_AVAILABLE = True
except ImportError:
    SEMANTIC_AVAILABLE = False
    print("⚠️ sentence-transformers non installé. Utilisation du mode lexical uniquement.")


class SemanticSuggestionService:
    """Service hybride de suggestions avec cache intelligent"""
    
    def __init__(self, cache_dir: Optional[Path] = None):
        self.cache_dir = cache_dir or Path.home() / '.notion_clipper' / 'semantic_cache'
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        # Cache en mémoire pour les embeddings
        self.embedding_cache = {}
        self.cache_ttl = 3600 * 24  # 24 heures
        
        # Modèle sémantique (chargé à la demande)
        self.model = None
        self.model_loaded = False
        
        # Statistiques pour optimisation
        self.stats = {
            'cache_hits': 0,
            'cache_misses': 0,
            'semantic_calls': 0,
            'lexical_calls': 0
        }
    
    def _load_model(self):
        """Charge le modèle sémantique à la demande"""
        if not SEMANTIC_AVAILABLE or self.model_loaded:
            return False
            
        try:
            print("📊 Chargement du modèle sémantique...")
            # Modèle multilingue léger (~50MB)
            self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            self.model_loaded = True
            print("✅ Modèle sémantique chargé")
            return True
        except Exception as e:
            print(f"❌ Erreur chargement modèle: {e}")
            return False
    
    def _get_cache_key(self, text: str) -> str:
        """Génère une clé de cache pour un texte"""
        return hashlib.md5(text.encode()).hexdigest()
    
    def _get_embedding_cached(self, text: str) -> Optional[np.ndarray]:
        """Obtient l'embedding avec cache"""
        cache_key = self._get_cache_key(text)
        
        # Vérifier le cache mémoire
        if cache_key in self.embedding_cache:
            cached = self.embedding_cache[cache_key]
            if time.time() - cached['timestamp'] < self.cache_ttl:
                self.stats['cache_hits'] += 1
                return cached['embedding']
        
        # Vérifier le cache disque
        cache_file = self.cache_dir / f"{cache_key}.npy"
        if cache_file.exists():
            try:
                # Vérifier l'âge du fichier
                file_age = time.time() - cache_file.stat().st_mtime
                if file_age < self.cache_ttl:
                    embedding = np.load(cache_file)
                    # Mettre en cache mémoire
                    self.embedding_cache[cache_key] = {
                        'embedding': embedding,
                        'timestamp': time.time()
                    }
                    self.stats['cache_hits'] += 1
                    return embedding
            except Exception:
                pass
        
        self.stats['cache_misses'] += 1
        return None
    
    def _save_embedding_cache(self, text: str, embedding: np.ndarray):
        """Sauvegarde l'embedding en cache"""
        cache_key = self._get_cache_key(text)
        
        # Cache mémoire
        self.embedding_cache[cache_key] = {
            'embedding': embedding,
            'timestamp': time.time()
        }
        
        # Cache disque
        try:
            cache_file = self.cache_dir / f"{cache_key}.npy"
            np.save(cache_file, embedding)
        except Exception:
            pass  # Le cache disque est optionnel
    
    def _lexical_similarity(self, text1: str, text2: str) -> float:
        """Calcul de similarité lexicale améliorée"""
        text1_lower = text1.lower()
        text2_lower = text2.lower()
        
        # Correspondance exacte
        if text1_lower == text2_lower:
            return 1.0
        
        # Correspondance partielle
        if text1_lower in text2_lower or text2_lower in text1_lower:
            return 0.8
        
        # Analyse par mots
        stop_words = {'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'pour', 
                      'dans', 'avec', 'sans', 'sous', 'sur', 'vers', 'chez', 'entre',
                      'et', 'ou', 'mais', 'donc', 'car', 'que', 'qui', 'dont'}
        
        # Extraction des mots significatifs
        words1 = set(w for w in text1_lower.split() if len(w) > 2 and w not in stop_words)
        words2 = set(w for w in text2_lower.split() if len(w) > 2 and w not in stop_words)
        
        if not words1 or not words2:
            return 0.0
        
        # Coefficient de Jaccard
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        jaccard = intersection / union if union > 0 else 0.0
        
        # Bonus pour l'ordre des mots
        if len(words1) == len(words2) and list(words1) == list(words2):
            jaccard += 0.2
        
        return min(jaccard, 1.0)
    
    def get_suggestions(self, 
                       clipboard_content: str, 
                       pages: List[Dict], 
                       favorites: Optional[List[str]] = None,
                       use_semantic: bool = True,
                       semantic_threshold: int = 20) -> List[Dict]:
        """
        Obtient des suggestions avec approche hybride
        
        Args:
            clipboard_content: Contenu du presse-papiers
            pages: Liste des pages Notion
            favorites: IDs des pages favorites
            use_semantic: Activer l'analyse sémantique si disponible
            semantic_threshold: Nombre de mots minimum pour déclencher l'analyse sémantique
        """
        if not clipboard_content or not pages:
            return []
        
        self.stats['lexical_calls'] += 1
        favorites = favorites or []
        
        # Décider si on utilise l'analyse sémantique
        word_count = len(clipboard_content.split())
        should_use_semantic = (
            use_semantic and 
            SEMANTIC_AVAILABLE and 
            word_count >= semantic_threshold
        )
        
        suggestions = []
        
        for page in pages:
            if not page.get('title'):
                continue
            
            score = 0.0
            
            # Score lexical (toujours calculé)
            lexical_score = self._lexical_similarity(clipboard_content, page['title'])
            score += lexical_score * 50
            
            # Score sémantique (si activé et pertinent)
            if should_use_semantic and lexical_score < 0.5:  # Seulement si pas de bonne correspondance lexicale
                if not self.model_loaded:
                    self._load_model()
                if self.model_loaded and self.model is not None:
                    try:
                        # Obtenir les embeddings avec cache
                        clip_embedding = self._get_embedding_cached(clipboard_content)
                        if clip_embedding is None:
                            clip_embedding = self.model.encode(clipboard_content)
                            if hasattr(clip_embedding, "detach"):
                                clip_embedding = clip_embedding.detach().cpu().numpy()
                            clip_embedding = np.asarray(clip_embedding)
                            self._save_embedding_cache(clipboard_content, clip_embedding)
                            self.stats['semantic_calls'] += 1
                        title_embedding = self._get_embedding_cached(page['title'])
                        if title_embedding is None:
                            title_embedding = self.model.encode(page['title'])
                            if hasattr(title_embedding, "detach"):
                                title_embedding = title_embedding.detach().cpu().numpy()
                            title_embedding = np.asarray(title_embedding)
                            self._save_embedding_cache(page['title'], title_embedding)
                        # Similarité cosinus
                        semantic_score = np.dot(clip_embedding, title_embedding) / (
                            np.linalg.norm(clip_embedding) * np.linalg.norm(title_embedding)
                        )
                        # Ajouter le score sémantique seulement s'il est significatif
                        if semantic_score > 0.3:
                            score += semantic_score * 30
                    except Exception:
                        pass  # Fallback silencieux vers lexical
            
            # Autres facteurs
            # Récence
            try:
                last_edited = datetime.fromisoformat(page.get('last_edited_time', '2000-01-01T00:00:00'))
                hours_since = (datetime.now(timezone.utc) - last_edited).total_seconds() / 3600
                if hours_since < 24:
                    score += 25
                elif hours_since < 168:
                    score += 15
                elif hours_since < 720:
                    score += 5
            except:
                pass
            
            # Favoris
            if page.get('id') in favorites:
                score += 30
            
            # Page parente
            if not page.get('parent_id') or page.get('parent_type') == 'workspace':
                score += 10
            
            # Pénalités
            if page.get('archived'):
                score -= 50
            if page.get('in_trash'):
                score -= 100
            
            if score > 0:
                suggestions.append({
                    'page': page,
                    'score': score,
                    'match_type': 'semantic' if should_use_semantic and score > lexical_score * 50 else 'lexical'
                })
        
        # Trier et retourner les meilleures
        suggestions.sort(key=lambda x: x['score'], reverse=True)
        return suggestions[:30]
    
    def get_stats(self) -> Dict:
        """Retourne les statistiques d'utilisation"""
        total_calls = self.stats['cache_hits'] + self.stats['cache_misses']
        cache_rate = self.stats['cache_hits'] / total_calls if total_calls > 0 else 0
        
        return {
            **self.stats,
            'cache_rate': f"{cache_rate:.2%}",
            'model_loaded': self.model_loaded,
            'semantic_available': SEMANTIC_AVAILABLE,
            'cache_size': len(self.embedding_cache)
        }
    
    def clear_cache(self, older_than_hours: int = 24):
        """Nettoie le cache ancien"""
        # Cache mémoire
        current_time = time.time()
        self.embedding_cache = {
            k: v for k, v in self.embedding_cache.items()
            if current_time - v['timestamp'] < older_than_hours * 3600
        }
        
        # Cache disque
        try:
            cutoff_time = time.time() - (older_than_hours * 3600)
            for cache_file in self.cache_dir.glob("*.npy"):
                if cache_file.stat().st_mtime < cutoff_time:
                    cache_file.unlink()
        except Exception:
            pass


# Instance globale du service
suggestion_service = SemanticSuggestionService()
# backend/martian_parser.py
import subprocess
import json
import os
import tempfile
import sys
from typing import List, Dict, Any, Optional

class MartianParser:
    """Parser utilisant Martian via Node.js"""
    
    def __init__(self):
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.script_path = os.path.join(self.script_dir, 'martian_bridge.js')
        self._create_bridge_script()
    
    def _create_bridge_script(self):
        """Crée le script JavaScript qui sert de pont vers Martian"""
        script_content = """
const { markdownToBlocks, markdownToRichText } = require('@tryfabric/martian');

// Lire l'entrée depuis stdin
let inputData = '';
process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', () => {
    try {
        const input = JSON.parse(inputData);
        const { markdown, mode, options } = input;
        
        let result;
        if (mode === 'blocks') {
            result = markdownToBlocks(markdown, options || {});
        } else if (mode === 'richtext') {
            result = markdownToRichText(markdown, options || {});
        } else {
            throw new Error('Mode invalide: ' + mode);
        }
        
        // Envoyer le résultat
        process.stdout.write(JSON.stringify({
            success: true,
            result: result
        }));
    } catch (error) {
        process.stdout.write(JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
        }));
    }
});
"""
        
        with open(self.script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
    
    def _call_node(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Appelle Node.js avec les données d'entrée"""
        try:
            # Convertir l'entrée en JSON
            input_json = json.dumps(input_data, ensure_ascii=False)
            
            # Appeler Node.js
            process = subprocess.Popen(
                ['node', self.script_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8'
            )
            
            stdout, stderr = process.communicate(input=input_json)
            
            if stderr:
                print(f"Avertissement Node.js: {stderr}", file=sys.stderr)
            
            if process.returncode != 0:
                raise Exception(f"Node.js a retourné le code {process.returncode}")
            
            # Parser la réponse
            response = json.loads(stdout)
            
            if not response.get('success'):
                raise Exception(response.get('error', 'Erreur inconnue'))
            
            return response['result']
            
        except json.JSONDecodeError as e:
            print(f"Erreur JSON: {e}", file=sys.stderr)
            print(f"Sortie reçue: {stdout}", file=sys.stderr)
            raise Exception(f"Erreur de parsing JSON: {e}")
        except FileNotFoundError:
            raise Exception("Node.js n'est pas installé ou n'est pas dans le PATH")
        except Exception as e:
            print(f"Erreur lors de l'appel à Node.js: {e}", file=sys.stderr)
            raise
    
    def parse_to_blocks(self, markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Convertit le Markdown en blocs Notion"""
        if not markdown:
            return []
        
        try:
            input_data = {
                'markdown': markdown,
                'mode': 'blocks',
                'options': options or {}
            }
            
            result = self._call_node(input_data)
            # Si le résultat est un dict avec une clé 'result', extraire la liste
            if isinstance(result, dict) and 'result' in result:
                return result['result']
            return result if isinstance(result, list) else [result]
            
        except Exception as e:
            print(f"Erreur dans parse_to_blocks: {e}", file=sys.stderr)
            # Fallback : retourner un simple paragraphe
            return [{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{
                        "type": "text",
                        "text": {"content": markdown},
                        "annotations": {
                            "bold": False,
                            "italic": False,
                            "strikethrough": False,
                            "underline": False,
                            "code": False,
                            "color": "default"
                        }
                    }]
                }
            }]
    
    def parse_to_rich_text(self, markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Convertit le Markdown en rich text Notion"""
        if not markdown:
            return []
        
        try:
            input_data = {
                'markdown': markdown,
                'mode': 'richtext',
                'options': options or {}
            }
            
            result = self._call_node(input_data)
            if isinstance(result, dict) and 'result' in result:
                return result['result']
            return result if isinstance(result, list) else [result]
            
        except Exception as e:
            print(f"Erreur dans parse_to_rich_text: {e}", file=sys.stderr)
            # Fallback
            return [{
                "type": "text",
                "text": {"content": markdown},
                "annotations": {
                    "bold": False,
                    "italic": False,
                    "strikethrough": False,
                    "underline": False,
                    "code": False,
                    "color": "default"
                }
            }]

# Instance globale
_parser = None

def get_parser() -> MartianParser:
    """Obtient l'instance du parser (singleton)"""
    global _parser
    if _parser is None:
        _parser = MartianParser()
    return _parser

# Fonctions publiques
def markdown_to_blocks(markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Convertit du Markdown en blocs Notion via Martian.
    
    Args:
        markdown: Le texte Markdown à convertir
        options: Options pour Martian
            - enableEmojiCallouts: bool (défaut: False)
            - strictImageUrls: bool (défaut: True)
            - notionLimits: dict avec 'truncate' bool
            
    Returns:
        Liste des blocs Notion
    """
    parser = get_parser()
    return parser.parse_to_blocks(markdown, options)

def markdown_to_rich_text(markdown: str, options: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Convertit du Markdown en rich text Notion via Martian.
    
    Args:
        markdown: Le texte Markdown à convertir
        options: Options pour Martian
            
    Returns:
        Liste des éléments rich text
    """
    parser = get_parser()
    return parser.parse_to_rich_text(markdown, options)

# Fonction utilitaire pour tester
def test_parser():
    """Teste le parser avec un exemple simple"""
    test_md = """# Test Martian

Voici du **gras** et de l'*italique*.

- Liste item 1
- Liste item 2

```python
def hello():
    print("Hello Martian!")
```

> [!NOTE]
> Ceci est une note importante.
"""
    
    try:
        print("Test du parser Martian...")
        blocks = markdown_to_blocks(test_md, {
            'enableEmojiCallouts': True
        })
        print(f"✅ Succès ! {len(blocks)} blocs générés")
        print(json.dumps(blocks[0], indent=2, ensure_ascii=False))
        return True
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return False

if __name__ == "__main__":
    # Auto-test lors de l'import
    test_parser()
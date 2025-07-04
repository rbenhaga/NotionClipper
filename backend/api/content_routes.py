"""
Routes API pour la gestion du contenu
"""

import json
from flask import Blueprint, request, jsonify, current_app

from backend.parsers.enhanced_content_parser import EnhancedContentParser, parse_content_for_notion
from backend.parsers.markdown_parser import validate_notion_blocks

content_bp = Blueprint('content', __name__)


@content_bp.route('/send', methods=['POST', 'OPTIONS'])
def send_to_notion():
    """Route unifiée pour l'envoi de contenu vers une ou plusieurs pages Notion"""
    # Gérer les requêtes OPTIONS pour CORS
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    backend = current_app.config['backend']
    
    try:
        data = request.get_json() or {}
        
        # Détecter si c'est un envoi simple ou multiple
        is_multiple = 'page_ids' in data or 'pageIds' in data or 'items' in data
        
        if is_multiple:
            # Envoi multiple
            page_ids = data.get('page_ids') or data.get('pageIds', [])
            items = data.get('items', [])
            
            # Si on a page_ids, créer les items
            if page_ids and not items:
                common_content = data.get('content', '')
                common_type = data.get('contentType') or data.get('content_type')
                parse_markdown = data.get('parseAsMarkdown', data.get('parse_markdown', True))
                
                items = [{
                    'pageId': pid,
                    'content': common_content,
                    'contentType': common_type,
                    'parseAsMarkdown': parse_markdown
                } for pid in page_ids]
            
            results = []
            
            for item in items:
                page_id = item.get('pageId') or item.get('page_id')
                content = item.get('content', '')
                content_type = item.get('contentType') or backend.detect_content_type(content)
                parse_markdown = item.get('parseAsMarkdown', True)
                
                if not page_id or not content:
                    results.append({
                        "pageId": page_id,
                        "success": False,
                        "error": "Paramètres manquants"
                    })
                    continue
                
                try:
                    # Traiter et envoyer le contenu
                    blocks = backend.process_content(
                        content=content,
                        content_type=content_type,
                        parse_markdown=parse_markdown,
                        use_advanced_parser=item.get('useAdvancedParser', True)
                    )
                    
                    result = backend.send_to_notion(page_id, blocks)
                    
                    results.append({
                        "pageId": page_id,
                        "success": result['success'],
                        "error": result.get('error') if not result['success'] else None,
                        "blocksCount": result.get('blocksCount', len(blocks))
                    })
                    
                    if result['success']:
                        backend.stats_manager.increment('successful_sends')
                    else:
                        backend.stats_manager.increment('failed_sends')
                        
                except Exception as e:
                    backend.stats_manager.increment('failed_sends')
                    results.append({
                        "pageId": page_id,
                        "success": False,
                        "error": str(e)
                    })
            
            # Résumé des résultats
            successful = sum(1 for r in results if r['success'])
            failed = len(results) - successful
            
            return jsonify({
                "success": successful > 0,
                "results": results,
                "summary": {
                    "total": len(results),
                    "successful": successful,
                    "failed": failed
                }
            })
            
        else:
            # Envoi simple
            page_id = data.get('pageId') or data.get('page_id')
            content = data.get('content', '')
            content_type = data.get('contentType') or data.get('content_type') or backend.detect_content_type(content)
            parse_markdown = data.get('parseAsMarkdown', data.get('parse_markdown', True))
            
            if not page_id:
                return jsonify({"error": "pageId requis"}), 400
            
            if not content:
                return jsonify({"error": "content requis"}), 400
            
            # Traiter le contenu
            blocks = backend.process_content(
                content=content,
                content_type=content_type,
                parse_markdown=parse_markdown,
                use_advanced_parser=data.get('useAdvancedParser', True)
            )
            
            # Ajouter les métadonnées si fournies
            if data.get('title') or data.get('page_title'):
                title = data.get('title') or data.get('page_title')
                title_block = {
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": title}
                        }]
                    }
                }
                blocks.insert(0, title_block)
            
            if data.get('sourceUrl') or data.get('source_url'):
                source_url = data.get('sourceUrl') or data.get('source_url')
                source_block = {
                    "type": "callout",
                    "callout": {
                        "rich_text": [{
                            "type": "text",
                            "text": {"content": "🔗 Source: "}
                        }, {
                            "type": "text",
                            "text": {
                                "content": source_url,
                                "link": {"url": source_url}
                            }
                        }],
                        "icon": {"emoji": "🔗"}
                    }
                }
                blocks.append(source_block)
            
            # Envoyer à Notion
            result = backend.send_to_notion(page_id, blocks)
            
            if result['success']:
                backend.stats_manager.increment('successful_sends')
                
                return jsonify({
                    "success": True,
                    "message": "Contenu envoyé avec succès",
                    "blocksCount": result.get('blocksCount', len(blocks))
                })
            else:
                backend.stats_manager.increment('failed_sends')
                
                return jsonify({
                    "success": False,
                    "error": result.get('error', 'Erreur inconnue')
                }), 500
                
    except Exception as e:
        backend.stats_manager.increment('failed_sends')
        backend.stats_manager.record_error(str(e), 'send_to_notion')
        
        return jsonify({"error": str(e)}), 500

@content_bp.route('/parse-content', methods=['POST'])
def parse_content():
    """Parse le contenu et retourne les blocs Notion"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json()
        content = data.get('content', '')
        content_type = data.get('contentType', 'mixed')
        parse_as_markdown = data.get('parseAsMarkdown', True)
        
        if not content:
            return jsonify({'blocks': []})
        
        # Utiliser le parser avancé
        blocks = parse_content_for_notion(
            content=content,
            content_type=content_type if content_type != 'mixed' else None,
            imgbb_key=backend.imgbb_key
        )
        
        # Valider les blocs
        validated_blocks = validate_notion_blocks(blocks)
        
        backend.stats_manager.increment('content_processed')
        backend.stats_manager.record_content_type(content_type)
        
        return jsonify({
            'blocks': validated_blocks,
            'count': len(validated_blocks)
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'parse_content')
        return jsonify({'error': str(e)}), 500


@content_bp.route('/analyze-content', methods=['POST'])
def analyze_content():
    """Analyse le contenu et suggère le meilleur type"""
    backend = current_app.config['backend']
    
    try:
        data = request.get_json()
        content = data.get('content', '')
        
        if not content:
            return jsonify({'suggestedType': 'text', 'confidence': 1.0})
        
        # Analyser avec le parser
        parser = EnhancedContentParser()
        blocks = parser.parse_content(content=content, content_type='mixed')
        
        # Déterminer le type dominant
        type_counts = {}
        for block in blocks:
            block_type = block.get("type", "unknown")
            type_counts[block_type] = type_counts.get(block_type, 0) + 1
        
        if not type_counts:
            return jsonify({'suggestedType': 'text', 'confidence': 1.0})
        
        # Si plusieurs types, suggérer 'mixed'
        if len(type_counts) > 1:
            return jsonify({
                'suggestedType': 'mixed',
                'confidence': 0.9,
                'types': type_counts
            })
        
        # Mapper le type de bloc Notion vers le type de contenu
        block_to_content_type = {
            'paragraph': 'text',
            'heading_1': 'markdown',
            'heading_2': 'markdown',
            'heading_3': 'markdown',
            'code': 'code',
            'image': 'image',
            'video': 'video',
            'audio': 'audio',
            'table': 'table',
            'bookmark': 'url',
            'embed': 'url'
        }
        
        suggested_type = list(type_counts.keys())[0]
        content_type = block_to_content_type.get(suggested_type, 'text')
        
        return jsonify({
            'suggestedType': content_type,
            'confidence': 1.0,
            'types': type_counts
        })
        
    except Exception as e:
        backend.stats_manager.record_error(str(e), 'analyze_content')
        return jsonify({'error': str(e)}), 500


@content_bp.route('/content-types', methods=['GET'])
def get_content_types():
    """Retourne les types de contenu supportés"""
    return jsonify({
        'types': [
            {'id': 'text', 'label': 'Texte', 'icon': 'FileText'},
            {'id': 'markdown', 'label': 'Markdown', 'icon': 'FileText'},
            {'id': 'code', 'label': 'Code', 'icon': 'Code'},
            {'id': 'image', 'label': 'Image', 'icon': 'Image'},
            {'id': 'video', 'label': 'Vidéo', 'icon': 'Video'},
            {'id': 'audio', 'label': 'Audio', 'icon': 'Music'},
            {'id': 'table', 'label': 'Tableau', 'icon': 'Table'},
            {'id': 'url', 'label': 'Lien', 'icon': 'Link'},
            {'id': 'mixed', 'label': 'Mixte (auto)', 'icon': 'Layers'}
        ],
        'default': 'mixed'
    })
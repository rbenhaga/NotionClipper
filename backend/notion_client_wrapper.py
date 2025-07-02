from notion_client import Client as NotionClient
from typing import List, Dict
from backend.martian_parser import markdown_to_blocks
from backend.markdown_parser import validate_notion_blocks

class NotionClientWrapper:
    def __init__(self, token: str):
        self.notion = NotionClient(auth=token)

    def send_one(self, page_id: str, content: str, **kwargs) -> Dict:
        items = [{"pageId": page_id, "content": content, **kwargs}]
        succeeded, failed = self.process_content(items)
        return {
            "success": bool(succeeded),
            "error": failed[0]["error"] if failed else None
        }

    def send_multiple(self, items: List[Dict]) -> Dict:
        succeeded, failed = self.process_content(items)
        return {
            "successCount": len(succeeded),
            "failureCount": len(failed),
            "failed": failed
        }

    def process_content(self, items: List[Dict]) -> (List[str], List[Dict]):
        succeeded, failed = [], []
        for item in items:
            page_id = item.get("pageId")
            blocks = markdown_to_blocks(
                item.get("content", ""),
                item.get("contentType"),
                parse_as_markdown=item.get("parseAsMarkdown", True)
            )
            blocks = validate_notion_blocks(blocks)
            result = self._send_to_notion_async(page_id, blocks)
            if result.get("success"):
                succeeded.append(page_id)
            else:
                failed.append({"pageId": page_id, "error": result.get("error")})
        return succeeded, failed

    def _send_to_notion_async(self, page_id: str, blocks: List[Dict]) -> Dict:
        try:
            result = self.notion.blocks.children.append(
                block_id=page_id,
                children=blocks
            )
            if not (isinstance(result, dict) and result.get("object") == "list"):
                msg = result.get("message") or result.get("error") or "Erreur inconnue de Notion"
                return {"success": False, "error": f"Notion API: {msg}"}
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": f"Exception interne: {str(e)}"} 
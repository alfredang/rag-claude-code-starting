import anyio
from typing import List, Optional
from claude_agent_sdk import (
    tool,
    create_sdk_mcp_server,
    query as agent_query,
    ClaudeAgentOptions,
    ResultMessage,
)


class AIGenerator:
    """Handles interactions with Claude via the Agent SDK (uses Claude Code OAuth token)"""

    SYSTEM_PROMPT = """You are an AI assistant specialized in course materials and educational content with access to a search tool for course information.

IMPORTANT RULES:
- Use the mcp__courses__search_course_content tool for questions about course content
- Make at most ONE search call per query - do NOT search multiple lessons separately
- Do NOT use ToolSearch - the search tool is already available to you directly
- Synthesize search results into accurate, fact-based responses
- If search yields no results, state this clearly

Response style:
- Brief, concise, and educational
- No meta-commentary about searching or tools
- Provide direct answers only
"""

    def __init__(self, tool_manager=None):
        self.tool_manager = tool_manager
        self._mcp_server = None

    def set_tool_manager(self, tool_manager):
        """Set the tool manager and build the MCP server with its tools."""
        self.tool_manager = tool_manager
        self._mcp_server = self._build_mcp_server()

    def _build_mcp_server(self):
        """Create an MCP server exposing the search tool."""
        tm = self.tool_manager

        @tool(
            "search_course_content",
            "Search course materials with smart course name matching and lesson filtering. "
            "Parameters: query (string, required), course_name (string, optional - partial matches work), "
            "lesson_number (integer, optional).",
            {"query": str, "course_name": str, "lesson_number": int}
        )
        async def search_course_content(args):
            query_text = args["query"]
            course_name = args.get("course_name")
            lesson_number = args.get("lesson_number")
            result = tm.execute_tool("search_course_content", query=query_text, course_name=course_name, lesson_number=lesson_number)
            return {"content": [{"type": "text", "text": result}]}

        return create_sdk_mcp_server("courses", tools=[search_course_content])

    def generate_response(self, query_text: str,
                         conversation_history: Optional[str] = None,
                         tools: Optional[List] = None,
                         tool_manager=None) -> str:
        """Generate AI response using the Claude Agent SDK."""
        system_content = (
            f"{self.SYSTEM_PROMPT}\n\nPrevious conversation:\n{conversation_history}"
            if conversation_history
            else self.SYSTEM_PROMPT
        )

        return anyio.from_thread.run(self._async_generate, query_text, system_content)

    async def _async_generate(self, query_text: str, system_prompt: str) -> str:
        """Async method that calls the Agent SDK."""
        mcp_servers = {}
        if self._mcp_server:
            mcp_servers = {"courses": self._mcp_server}

        last_text = ""
        result_text = ""
        async for message in agent_query(
            prompt=query_text,
            options=ClaudeAgentOptions(
                system_prompt=system_prompt,
                max_turns=20,
                permission_mode="bypassPermissions",
                allowed_tools=["mcp__courses__search_course_content"],
                mcp_servers=mcp_servers,
            )
        ):
            if isinstance(message, ResultMessage):
                if message.result:
                    result_text = message.result

        return result_text or last_text or "I'm sorry, I couldn't generate a response."

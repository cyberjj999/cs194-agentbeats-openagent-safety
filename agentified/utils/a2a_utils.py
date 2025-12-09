"""Utility functions for A2A communication."""

import httpx
import asyncio
import uuid

from a2a.client import A2ACardResolver, A2AClient
from a2a.types import (
    AgentCard,
    Part,
    TextPart,
    MessageSendParams,
    Message,
    Role,
    SendMessageRequest,
    SendMessageResponse,
)


async def get_agent_card(url: str) -> AgentCard | None:
    """Get agent card from URL."""
    httpx_client = httpx.AsyncClient()
    resolver = A2ACardResolver(httpx_client=httpx_client, base_url=url)
    card: AgentCard | None = await resolver.get_agent_card()
    return card


async def wait_agent_ready(url: str, timeout: int = 10) -> bool:
    """
    Wait until the A2A server is ready by checking the agent card.
    
    Args:
        url: Agent URL
        timeout: Maximum seconds to wait
        
    Returns:
        True if agent is ready, False otherwise
    """
    retry_cnt = 0
    while retry_cnt < timeout:
        retry_cnt += 1
        try:
            card = await get_agent_card(url)
            if card is not None:
                return True
            else:
                print(f"Agent card not available yet, retrying {retry_cnt}/{timeout}")
        except Exception:
            pass
        await asyncio.sleep(1)
    return False


async def send_message(
    url: str,
    message: str,
    task_id: str = None,
    context_id: str = None,
    timeout: float = 1800.0  # 30 minutes default for evaluations
) -> SendMessageResponse:
    """
    Send a message to an A2A agent.
    
    Args:
        url: Agent URL
        message: Message text to send
        task_id: Optional task ID
        context_id: Optional context ID
        timeout: Request timeout in seconds (default: 1800 = 30 minutes for evaluations)
        
    Returns:
        SendMessageResponse from the agent
    """
    card = await get_agent_card(url)
    # Use a longer timeout for evaluations - each task can take several minutes
    # 30 minutes should be enough for multiple tasks
    # Set connect timeout to 30s, but allow read/write to take up to the full timeout
    httpx_timeout = httpx.Timeout(
        connect=30.0,  # 30 seconds to establish connection
        read=timeout,  # Allow read to take up to the full timeout
        write=30.0,   # 30 seconds to write request
        pool=30.0     # 30 seconds to get connection from pool
    )
    httpx_client = httpx.AsyncClient(timeout=httpx_timeout)
    client = A2AClient(httpx_client=httpx_client, agent_card=card)

    message_id = uuid.uuid4().hex
    params = MessageSendParams(
        message=Message(
            role=Role.user,
            parts=[Part(TextPart(text=message))],
            message_id=message_id,
            task_id=task_id,
            context_id=context_id,
        )
    )
    request_id = uuid.uuid4().hex
    req = SendMessageRequest(id=request_id, params=params)
    try:
        response = await client.send_message(request=req)
        return response
    finally:
        # Clean up the httpx client to prevent resource leaks
        await httpx_client.aclose()


def parse_tags(text: str) -> dict:
    """
    Parse XML-style tags from text.
    
    Args:
        text: Text containing XML-style tags
        
    Returns:
        Dictionary mapping tag names to their contents
    """
    import re
    tags = {}
    pattern = r'<(\w+)>(.*?)</\1>'
    matches = re.findall(pattern, text, re.DOTALL)
    for tag_name, content in matches:
        tags[tag_name] = content.strip()
    return tags




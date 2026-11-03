
"""Basic integration test for the WebSocket-to-TCP gateway."""

import asyncio
import json

from websockets.asyncio.client import connect


async def main():
    async with connect("ws://127.0.0.1:8765") as websocket:
        await websocket.send(json.dumps({
            "type": "join",
            "username": "GatewayTester"
        }))

        # Wait for the TCP server to welcome the user.
        while True:
            message = json.loads(
                await asyncio.wait_for(websocket.recv(), timeout=5)
            )
            print("Received:", message)

            if (
                message.get("type") == "system"
                and "Welcome" in message.get("text", "")
            ):
                break

            if message.get("type") == "error":
                raise RuntimeError(message.get("text"))

        # Send a test chat message.
        await websocket.send(json.dumps({
            "type": "chat",
            "text": "Hello from the WebSocket gateway!"
        }))

        while True:
            message = json.loads(
                await asyncio.wait_for(websocket.recv(), timeout=5)
            )
            print("Received:", message)

            if (
                message.get("type") == "chat"
                and message.get("username") == "GatewayTester"
            ):
                print("Gateway test passed.")
                break


if __name__ == "__main__":
    asyncio.run(main())

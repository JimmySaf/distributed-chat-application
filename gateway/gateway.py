
"""WebSocket-to-TCP gateway for the distributed chat application."""

import argparse
import asyncio
import json
import socket
import threading
from contextlib import suppress

from websockets.asyncio.server import serve
from websockets.exceptions import ConnectionClosed

from common.protocol import decode_message, encode_message

MAX_MESSAGE_LENGTH = 2000


def read_tcp_messages(sock, loop, queue, stopped):
    """Read newline-delimited JSON messages from the TCP server."""
    try:
        with sock.makefile("r", encoding="utf-8", newline="\n") as reader:
            for line in reader:
                if stopped.is_set():
                    break
                try:
                    message = decode_message(line)
                except (ValueError, UnicodeError):
                    continue
                loop.call_soon_threadsafe(queue.put_nowait, message)
    except (OSError, RuntimeError):
        pass
    finally:
        with suppress(RuntimeError):
            loop.call_soon_threadsafe(queue.put_nowait, None)


async def handle_browser(websocket, tcp_host, tcp_port):
    """Bridge one browser WebSocket connection to a TCP client."""
    loop = asyncio.get_running_loop()
    incoming = asyncio.Queue()
    stopped = threading.Event()
    tcp_sock = None
    reader_task = None

    try:
        raw_join = await asyncio.wait_for(websocket.recv(), timeout=10)
        join_message = json.loads(raw_join)

        if not isinstance(join_message, dict):
            raise ValueError("The first message must be a JSON object.")

        if join_message.get("type") != "join":
            await websocket.send(json.dumps({
                "type": "error",
                "text": "Send a join message first."
            }))
            return

        username = str(join_message.get("username", "")).strip()

        if not username or len(username) > 24:
            await websocket.send(json.dumps({
                "type": "error",
                "text": "Username must be 1-24 characters."
            }))
            return

        tcp_sock = socket.create_connection(
            (tcp_host, tcp_port), timeout=10
        )
        tcp_sock.settimeout(None)
        tcp_sock.sendall(encode_message({
            "type": "join",
            "username": username
        }))

        reader_task = asyncio.create_task(asyncio.to_thread(
            read_tcp_messages, tcp_sock, loop, incoming, stopped
        ))

        await websocket.send(json.dumps({
            "type": "gateway",
            "text": f"Connected to TCP server {tcp_host}:{tcp_port}."
        }))

        async def tcp_to_browser():
            while True:
                message = await incoming.get()

                if message is None:
                    with suppress(ConnectionClosed):
                        await websocket.send(json.dumps({
                            "type": "error",
                            "text": "TCP connection closed."
                        }))
                    return

                await websocket.send(json.dumps(message))

        async def browser_to_tcp():
            async for raw_message in websocket:
                try:
                    message = json.loads(raw_message)
                except (json.JSONDecodeError, TypeError):
                    await websocket.send(json.dumps({
                        "type": "error",
                        "text": "Invalid JSON message."
                    }))
                    continue

                if not isinstance(message, dict):
                    await websocket.send(json.dumps({
                        "type": "error",
                        "text": "Messages must be JSON objects."
                    }))
                    continue

                if message.get("type") != "chat":
                    await websocket.send(json.dumps({
                        "type": "error",
                        "text": "Only chat messages are accepted after joining."
                    }))
                    continue

                text = str(message.get("text", "")).strip()

                if not text:
                    continue

                if len(text) > MAX_MESSAGE_LENGTH:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "text": "Messages must be 2000 characters or fewer."
                    }))
                    continue

                tcp_sock.sendall(encode_message({
                    "type": "chat",
                    "text": text
                }))

        sender = asyncio.create_task(tcp_to_browser())
        receiver = asyncio.create_task(browser_to_tcp())

        done, pending = await asyncio.wait(
            {sender, receiver},
            return_when=asyncio.FIRST_COMPLETED
        )

        for task in pending:
            task.cancel()

        for task in done:
            if not task.cancelled():
                task.result()

    except (OSError, asyncio.TimeoutError) as exc:
        with suppress(ConnectionClosed):
            await websocket.send(json.dumps({
                "type": "error",
                "text": f"Could not connect to TCP server: {exc}"
            }))

    except (json.JSONDecodeError, ValueError) as exc:
        with suppress(ConnectionClosed):
            await websocket.send(json.dumps({
                "type": "error",
                "text": str(exc)
            }))

    except ConnectionClosed:
        pass

    finally:
        stopped.set()

        if tcp_sock is not None:
            with suppress(OSError):
                tcp_sock.shutdown(socket.SHUT_RDWR)
            with suppress(OSError):
                tcp_sock.close()

        if reader_task is not None:
            with suppress(asyncio.CancelledError, OSError):
                await reader_task


async def main(args):
    async with serve(
        lambda websocket: handle_browser(
            websocket, args.tcp_host, args.tcp_port
        ),
        args.ws_host,
        args.ws_port,
        origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ],
        max_size=16_384,
    ):
        print(
            f"WebSocket gateway listening on "
            f"ws://{args.ws_host}:{args.ws_port}"
        )
        print(
            f"Forwarding TCP connections to "
            f"{args.tcp_host}:{args.tcp_port}"
        )
        await asyncio.Future()


def parse_args():
    parser = argparse.ArgumentParser(
        description="Bridge browser WebSockets to the TCP chat server."
    )
    parser.add_argument("--ws-host", default="127.0.0.1")
    parser.add_argument("--ws-port", type=int, default=8765)
    parser.add_argument("--tcp-host", default="127.0.0.1")
    parser.add_argument("--tcp-port", type=int, default=5000)
    return parser.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(main(parse_args()))
    except KeyboardInterrupt:
        print("\nWebSocket gateway stopped.")

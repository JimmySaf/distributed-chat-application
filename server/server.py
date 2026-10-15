"""Threaded TCP chat server for clients connected to a single node."""
import argparse
import socket
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone

from common.protocol import decode_message, encode_message


@dataclass
class ClientConnection:
    sock: socket.socket
    username: str = ""
    send_lock: threading.Lock = field(default_factory=threading.Lock)


class ChatServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 5000):
        self.host = host
        self.port = port
        self._clients: dict[socket.socket, ClientConnection] = {}
        self._clients_lock = threading.Lock()
        self._server_socket: socket.socket | None = None
        self._stopping = threading.Event()

    def serve_forever(self) -> None:
        """Start listening and create a thread for each incoming client."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            self._server_socket = server
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind((self.host, self.port))
            server.listen()
            print(f"Chat server listening on {self.host}:{self.port}")
            print("Press Ctrl+C to stop the server.")
            try:
                while not self._stopping.is_set():
                    try:
                        client_sock, address = server.accept()
                    except OSError:
                        if self._stopping.is_set():
                            break
                        raise
                    print(f"Connection from {address[0]}:{address[1]}")
                    threading.Thread(
                        target=self._handle_client,
                        args=(client_sock,),
                        daemon=True,
                    ).start()
            except KeyboardInterrupt:
                print("\nStopping chat server...")
            finally:
                self.stop()

    def stop(self) -> None:
        """Close the listening socket and all connected client sockets."""
        self._stopping.set()
        if self._server_socket:
            try:
                self._server_socket.close()
            except OSError:
                pass
        with self._clients_lock:
            clients = list(self._clients.values())
            self._clients.clear()
        for client in clients:
            try:
                client.sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                client.sock.close()
            except OSError:
                pass

    def _send(self, client: ClientConnection, message: dict) -> bool:
        try:
            payload = encode_message(message)
            with client.send_lock:
                client.sock.sendall(payload)
            return True
        except (OSError, ValueError):
            return False

    def _broadcast(self, message: dict, exclude: socket.socket | None = None) -> None:
        """Send a message to every connected, named client except an optional sender."""
        with self._clients_lock:
            recipients = [
                client for sock, client in self._clients.items()
                if sock is not exclude and client.username
            ]
        failed = []
        for recipient in recipients:
            if not self._send(recipient, message):
                failed.append(recipient.sock)
        for sock in failed:
            self._remove_client(sock, announce=True)

    def _remove_client(self, sock: socket.socket, announce: bool = True) -> None:
        with self._clients_lock:
            client = self._clients.pop(sock, None)
        if client:
            try:
                sock.close()
            except OSError:
                pass
            print(f"{client.username or 'Unnamed client'} disconnected.")
            if announce and client.username and not self._stopping.is_set():
                self._broadcast({
                    "type": "system",
                    "text": f"{client.username} left the chat.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })

    def _handle_client(self, sock: socket.socket) -> None:
        client = ClientConnection(sock=sock)
        try:
            reader = sock.makefile("r", encoding="utf-8", newline="\n")
            with self._clients_lock:
                self._clients[sock] = client

            # The first message must identify the user.
            first_line = reader.readline()
            if not first_line:
                return
            first_message = decode_message(first_line)
            if first_message.get("type") != "join":
                self._send(client, {"type": "error", "text": "Send a username to join first."})
                return

            username = str(first_message.get("username", "")).strip()
            if not username or len(username) > 24:
                self._send(client, {"type": "error", "text": "Username must be 1–24 characters."})
                return

            with self._clients_lock:
                existing_names = {
                    c.username.casefold() for s, c in self._clients.items()
                    if s != sock and c.username
                }
                if username.casefold() in existing_names:
                    self._send(client, {"type": "error", "text": "That username is already in use."})
                    return
                client.username = username

            self._send(client, {
                "type": "system",
                "text": f"Welcome, {username}! You are connected to {self.host}:{self.port}.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            self._broadcast({
                "type": "system",
                "text": f"{username} joined the chat.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, exclude=sock)
            print(f"{username} joined.")

            for line in reader:
                if not line:
                    break
                message = decode_message(line)
                if message.get("type") != "chat":
                    self._send(client, {"type": "error", "text": "Unsupported message type."})
                    continue
                text = str(message.get("text", "")).strip()
                if not text:
                    continue
                if len(text) > 2000:
                    self._send(client, {"type": "error", "text": "Messages must be 2000 characters or fewer."})
                    continue
                self._broadcast({
                    "type": "chat",
                    "username": client.username,
                    "text": text,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
        except (OSError, UnicodeError, ValueError) as exc:
            print(f"Client connection ended: {exc}")
        finally:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            self._remove_client(sock)
            try:
                reader.close()  # type: ignore[possibly-undefined]
            except (OSError, UnboundLocalError):
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a threaded TCP chat server.")
    parser.add_argument("--host", default="127.0.0.1", help="Interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=5000, help="TCP port (default: 5000)")
    args = parser.parse_args()
    ChatServer(args.host, args.port).serve_forever()


if __name__ == "__main__":
    main()

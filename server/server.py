"""Threaded TCP chat server with optional peer-server communication."""

import argparse
import socket
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from common.protocol import decode_message, encode_message


@dataclass
class ClientConnection:
    sock: socket.socket
    username: str = ""
    is_peer: bool = False
    send_lock: threading.Lock = field(default_factory=threading.Lock)


class ChatServer:
    def __init__(
        self,
        host="127.0.0.1",
        port=5000,
        peer_host=None,
        peer_port=None,
    ):
        self.host = host
        self.port = port
        self.peer_host = peer_host
        self.peer_port = peer_port

        self._clients = {}
        self._clients_lock = threading.Lock()
        self._server_socket = None
        self._stopping = threading.Event()

    @staticmethod
    def _timestamp():
        return datetime.now(timezone.utc).isoformat()

    def serve_forever(self):
        """Listen for clients and optionally connect to another server."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
            self._server_socket = server
            server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            server.bind((self.host, self.port))
            server.listen()

            print(f"Chat server listening on {self.host}:{self.port}")

            if self.peer_host and self.peer_port:
                threading.Thread(
                    target=self._peer_connector,
                    daemon=True,
                ).start()

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

    def stop(self):
        """Stop accepting connections and close registered sockets."""
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

    def _send(self, client, message):
        try:
            with client.send_lock:
                client.sock.sendall(encode_message(message))
            return True
        except (OSError, ValueError):
            return False

    def _broadcast(self, message, include_peers=True, exclude=None):
        """Send to local clients and, when requested, connected peer servers."""
        with self._clients_lock:
            recipients = [
                client
                for sock, client in self._clients.items()
                if sock is not exclude
                and (client.is_peer or client.username)
                and (include_peers or not client.is_peer)
            ]

        for recipient in recipients:
            if not self._send(recipient, message):
                self._remove_client(recipient.sock, announce=False)

    def _remove_client(self, sock, announce=True):
        with self._clients_lock:
            client = self._clients.pop(sock, None)

        if client is None:
            return

        try:
            sock.close()
        except OSError:
            pass

        if client.is_peer:
            print("Peer server disconnected.")
        else:
            print(f"{client.username or 'Unnamed client'} disconnected.")

            if announce and client.username and not self._stopping.is_set():
                self._broadcast(
                    {
                        "type": "system",
                        "text": f"{client.username} left the chat.",
                        "timestamp": self._timestamp(),
                    },
                    include_peers=False,
                )

    def _peer_connector(self):
        """Retry connecting to the configured peer server."""
        while not self._stopping.is_set():
            peer = None

            try:
                peer_sock = socket.create_connection(
                    (self.peer_host, self.peer_port),
                    timeout=3,
                )
                peer_sock.settimeout(None)

                peer = ClientConnection(
                    sock=peer_sock,
                    username="__peer__",
                    is_peer=True,
                )

                with self._clients_lock:
                    self._clients[peer_sock] = peer

                if not self._send(peer, {"type": "peer_join"}):
                    raise OSError("Could not register with peer server")

                print(
                    f"Connected to peer server "
                    f"{self.peer_host}:{self.peer_port}"
                )

                self._read_peer(peer)

            except OSError as exc:
                if not self._stopping.is_set():
                    print(f"Peer connection unavailable: {exc}")

            finally:
                if peer:
                    self._remove_client(peer.sock, announce=False)

            if not self._stopping.is_set():
                time.sleep(2)

    def _read_peer(self, peer):
        """Read messages coming from the connected peer server."""
        with peer.sock.makefile("r", encoding="utf-8") as reader:
            for line in reader:
                if self._stopping.is_set():
                    break

                try:
                    message = decode_message(line)
                except (ValueError, UnicodeError):
                    continue

                if message.get("type") == "chat":
                    # Do not forward peer messages back to peer servers.
                    self._broadcast(message, include_peers=False)

    def _handle_client(self, sock):
        client = ClientConnection(sock=sock)
        reader = None

        try:
            reader = sock.makefile("r", encoding="utf-8", newline="\n")

            with self._clients_lock:
                self._clients[sock] = client

            first_line = reader.readline()
            if not first_line:
                return

            first_message = decode_message(first_line)

            if first_message.get("type") == "peer_join":
                client.is_peer = True
                client.username = "__peer__"
                print("Peer server registered.")
                self._read_peer(client)
                return

            if first_message.get("type") != "join":
                self._send(
                    client,
                    {"type": "error", "text": "Send a username to join first."},
                )
                return

            username = str(first_message.get("username", "")).strip()

            if not username or len(username) > 24:
                self._send(
                    client,
                    {"type": "error", "text": "Username must be 1–24 characters."},
                )
                return

            with self._clients_lock:
                existing_names = {
                    c.username.casefold()
                    for s, c in self._clients.items()
                    if s != sock and c.username and not c.is_peer
                }

                if username.casefold() in existing_names:
                    self._send(
                        client,
                        {"type": "error", "text": "That username is already in use."},
                    )
                    return

                client.username = username

            self._send(
                client,
                {
                    "type": "system",
                    "text": (
                        f"Welcome, {username}! You are connected to "
                        f"{self.host}:{self.port}."
                    ),
                    "timestamp": self._timestamp(),
                },
            )

            self._broadcast(
                {
                    "type": "system",
                    "text": f"{username} joined the chat.",
                    "timestamp": self._timestamp(),
                },
                include_peers=False,
                exclude=sock,
            )

            print(f"{username} joined.")

            for line in reader:
                if not line:
                    break

                message = decode_message(line)

                if message.get("type") != "chat":
                    self._send(
                        client,
                        {"type": "error", "text": "Unsupported message type."},
                    )
                    continue

                text = str(message.get("text", "")).strip()

                if not text:
                    continue

                if len(text) > 2000:
                    self._send(
                        client,
                        {
                            "type": "error",
                            "text": "Messages must be 2000 characters or fewer.",
                        },
                    )
                    continue

                chat_message = {
                    "type": "chat",
                    "username": client.username,
                    "text": text,
                    "timestamp": self._timestamp(),
                }

                # Messages from local users cross to the peer.
                # Messages from a peer only reach local users.
                self._broadcast(
                    chat_message,
                    include_peers=not client.is_peer,
                    exclude=sock if client.is_peer else None,
                )

        except (OSError, UnicodeError, ValueError) as exc:
            if not self._stopping.is_set():
                print(f"Client connection ended: {exc}")

        finally:
            if reader:
                try:
                    reader.close()
                except OSError:
                    pass

            self._remove_client(sock)


def main():
    parser = argparse.ArgumentParser(
        description="Run a TCP chat server with optional peer forwarding."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=5000)
    parser.add_argument("--peer-host", default=None)
    parser.add_argument("--peer-port", type=int, default=None)
    args = parser.parse_args()

    if (args.peer_host is None) != (args.peer_port is None):
        parser.error("--peer-host and --peer-port must be supplied together")

    ChatServer(
        args.host,
        args.port,
        args.peer_host,
        args.peer_port,
    ).serve_forever()


if __name__ == "__main__":
    main()
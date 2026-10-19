
"""Integration tests for communication between distributed chat servers."""

import socket
import threading
import time
import unittest

from common.protocol import decode_message, encode_message
from server.server import ChatServer


def free_port():
    """Ask the operating system for an available TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class DistributedServerTests(unittest.TestCase):
    def start_server(self, server):
        """Run a server in a background thread and wait until it listens."""
        thread = threading.Thread(
            target=server.serve_forever,
            daemon=True,
        )
        thread.start()

        deadline = time.time() + 3

        while time.time() < deadline:
            try:
                with socket.create_connection(
                    (server.host, server.port),
                    timeout=0.2,
                ):
                    return thread
            except OSError:
                time.sleep(0.05)

        self.fail(f"Server on port {server.port} did not start")

    def connect_user(self, port, username):
        """Connect a client and send its join message."""
        sock = socket.create_connection(
            ("127.0.0.1", port),
            timeout=3,
        )
        sock.settimeout(3)

        reader = sock.makefile(
            "r",
            encoding="utf-8",
            newline="\n",
        )

        sock.sendall(
            encode_message({
                "type": "join",
                "username": username,
            })
        )

        return sock, reader

    def read_message(self, reader):
        """Read one JSON message from a client connection."""
        line = reader.readline()

        self.assertTrue(
            line,
            "Expected a message, but the connection closed",
        )

        return decode_message(line)

    def read_chat_from(self, reader, username, expected_text):
        """Read until the expected chat message arrives."""
        deadline = time.time() + 3

        while time.time() < deadline:
            message = self.read_message(reader)

            if (
                message.get("type") == "chat"
                and message.get("username") == username
                and message.get("text") == expected_text
            ):
                return message

        self.fail(
            f"Did not receive expected message from {username}: "
            f"{expected_text}"
        )

    def wait_for_peer(self, server):
        """Wait until the server has registered its peer connection."""
        deadline = time.time() + 4

        while time.time() < deadline:
            with server._clients_lock:
                connected = any(
                    client.is_peer
                    for client in server._clients.values()
                )

            if connected:
                return

            time.sleep(0.05)

        self.fail(
            "The two server nodes did not establish a peer connection"
        )

    def test_clients_on_different_servers_exchange_messages(self):
        """Verify clients can exchange messages across two server nodes."""
        # Node 1 accepts client connections and peer connections.
        port1 = free_port()
        node1 = ChatServer("127.0.0.1", port1)

        # Node 2 initiates a peer connection to Node 1.
        port2 = free_port()
        node2 = ChatServer(
            "127.0.0.1",
            port2,
            peer_host="127.0.0.1",
            peer_port=port1,
        )

        thread1 = self.start_server(node1)
        thread2 = None

        alice = None
        bob = None
        alice_reader = None
        bob_reader = None

        try:
            thread2 = self.start_server(node2)
            self.wait_for_peer(node1)

            # Connect Alice to Node 1.
            alice, alice_reader = self.connect_user(port1, "Alice")

            alice_welcome = self.read_message(alice_reader)
            self.assertEqual(alice_welcome["type"], "system")

            # Connect Bob to Node 2.
            bob, bob_reader = self.connect_user(port2, "Bob")

            bob_welcome = self.read_message(bob_reader)
            self.assertEqual(bob_welcome["type"], "system")

            # Verify a message travels from Node 1 to Node 2.
            alice.sendall(
                encode_message({
                    "type": "chat",
                    "text": "Hello from Node 1",
                })
            )

            message_for_bob = self.read_chat_from(
                bob_reader,
                "Alice",
                "Hello from Node 1",
            )

            self.assertEqual(message_for_bob["type"], "chat")

            # Verify a message travels from Node 2 to Node 1.
            bob.sendall(
                encode_message({
                    "type": "chat",
                    "text": "Hello from Node 2",
                })
            )

            message_for_alice = self.read_chat_from(
                alice_reader,
                "Bob",
                "Hello from Node 2",
            )

            self.assertEqual(message_for_alice["type"], "chat")

        finally:
            # Close client connections and their readers.
            for reader in (alice_reader, bob_reader):
                if reader is not None:
                    reader.close()

            for sock in (alice, bob):
                if sock is not None:
                    try:
                        sock.close()
                    except OSError:
                        pass

            # Stop both servers and wait briefly for their threads.
            node2.stop()
            node1.stop()

            if thread2 is not None:
                thread2.join(timeout=2)

            thread1.join(timeout=2)


if __name__ == "__main__":
    unittest.main()

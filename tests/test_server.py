import socket
import threading
import time
import unittest

from server.server import ChatServer
from common.protocol import decode_message, encode_message


def free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class ServerIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.port = free_port()
        self.server = ChatServer("127.0.0.1", self.port)
        self.server_thread = threading.Thread(
            target=self.server.serve_forever, daemon=True
        )
        self.server_thread.start()
        deadline = time.time() + 3
        while time.time() < deadline:
            try:
                probe = socket.create_connection(("127.0.0.1", self.port), timeout=0.2)
                probe.close()
                break
            except OSError:
                time.sleep(0.05)
        else:
            self.fail("Server did not start in time")

    def tearDown(self):
        self.server.stop()
        self.server_thread.join(timeout=2)

    def connect_user(self, username):
        sock = socket.create_connection(("127.0.0.1", self.port), timeout=2)
        sock.settimeout(2)
        reader = sock.makefile("r", encoding="utf-8", newline="\n")
        sock.sendall(encode_message({"type": "join", "username": username}))
        return sock, reader

    def read_message(self, reader):
        line = reader.readline()
        self.assertTrue(line, "Expected a message but connection closed")
        return decode_message(line)

    def test_two_clients_receive_broadcast(self):
        alice, alice_reader = self.connect_user("Alice")
        try:
            self.assertEqual(self.read_message(alice_reader)["type"], "system")
            bob, bob_reader = self.connect_user("Bob")
            try:
                self.assertEqual(self.read_message(bob_reader)["type"], "system")
                # Alice receives Bob's join notification before the chat message.
                self.assertIn("joined", self.read_message(alice_reader)["text"])
                alice.sendall(encode_message({"type": "chat", "text": "Hello Bob"}))
                received = self.read_message(bob_reader)
                self.assertEqual(received["type"], "chat")
                self.assertEqual(received["username"], "Alice")
                self.assertEqual(received["text"], "Hello Bob")
            finally:
                bob.close()
                bob_reader.close()
        finally:
            alice.close()
            alice_reader.close()


if __name__ == "__main__":
    unittest.main()

"""Test recovery when a peer chat server becomes unavailable and returns."""

import socket
import threading
import time
import unittest

from server.server import ChatServer


def free_port():
    """Find an available local TCP port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class PeerReconnectTests(unittest.TestCase):
    def start_server(self, server):
        """Start a server and wait for its listening socket."""
        thread = threading.Thread(
            target=server.serve_forever,
            daemon=True,
        )
        thread.start()

        deadline = time.time() + 3
        while time.time() < deadline:
            try:
                with socket.create_connection(
                    (server.host, server.port), timeout=0.2
                ):
                    return thread
            except OSError:
                time.sleep(0.05)

        self.fail(f"Server on port {server.port} did not start")

    def wait_for_peer_state(self, server, expected, timeout=6):
        """Wait until a server has or has lost its peer connection."""
        deadline = time.time() + timeout

        while time.time() < deadline:
            with server._clients_lock:
                connected = any(
                    client.is_peer for client in server._clients.values()
                )

            if connected == expected:
                return

            time.sleep(0.1)

        state = "connected" if expected else "disconnected"
        self.fail(f"Peer did not become {state} within {timeout} seconds")

    def test_peer_reconnects_when_server_returns(self):
        port1 = free_port()
        port2 = free_port()

        node1 = ChatServer("127.0.0.1", port1)
        node1_thread = self.start_server(node1)

        node2 = ChatServer(
            "127.0.0.1",
            port2,
            peer_host="127.0.0.1",
            peer_port=port1,
        )
        node2_thread = None
        restarted_node1 = None
        restarted_thread = None

        try:
            node2_thread = self.start_server(node2)

            # Initially, Node 2 should connect to Node 1.
            self.wait_for_peer_state(node1, True)
            self.wait_for_peer_state(node2, True)

            # Simulate Node 1 failing.
            node1.stop()
            node1_thread.join(timeout=2)

            # Node 2 should detect the lost peer connection.
            self.wait_for_peer_state(node2, False, timeout=6)

            # Restart Node 1 on the same port.
            restarted_node1 = ChatServer("127.0.0.1", port1)
            restarted_thread = self.start_server(restarted_node1)

            # Node 2 should retry and reconnect automatically.
            self.wait_for_peer_state(node2, True, timeout=8)
            self.wait_for_peer_state(restarted_node1, True, timeout=4)

        finally:
            node2.stop()

            if restarted_node1 is not None:
                restarted_node1.stop()

            node2_thread.join(timeout=2) if node2_thread else None

            if restarted_thread is not None:
                restarted_thread.join(timeout=2)

            node1.stop()


if __name__ == "__main__":
    unittest.main()

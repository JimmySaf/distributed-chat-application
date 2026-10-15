"""Command-line client for the distributed chat assignment."""
import argparse
import socket
import threading

from common.protocol import decode_message, encode_message


def receive_messages(sock: socket.socket, stopped: threading.Event) -> None:
    """Read and display server messages until the connection closes."""
    try:
        with sock.makefile("r", encoding="utf-8", newline="\n") as reader:
            for line in reader:
                if not line:
                    break
                try:
                    message = decode_message(line)
                except (ValueError, UnicodeError):
                    print("\n[Warning] Received an invalid server message.")
                    continue

                kind = message.get("type")
                if kind == "chat":
                    print(f"\n{message.get('username', 'Unknown')}: {message.get('text', '')}")
                elif kind in ("system", "error"):
                    print(f"\n[{kind.upper()}] {message.get('text', '')}")
                else:
                    print(f"\n[SERVER] {message}")
                print("> ", end="", flush=True)
    except OSError as exc:
        if not stopped.is_set():
            print(f"\nConnection error: {exc}")
    finally:
        stopped.set()
        print("\nDisconnected from the server.")


def run_client(host: str, port: int, username: str) -> None:
    """Connect to the server, send the join message, and process user input."""
    stopped = threading.Event()
    with socket.create_connection((host, port), timeout=10) as sock:
        sock.settimeout(None)
        sock.sendall(encode_message({"type": "join", "username": username}))
        receiver = threading.Thread(
            target=receive_messages, args=(sock, stopped), daemon=True
        )
        receiver.start()
        print(f"Connected to {host}:{port}. Type /quit to leave.")
        try:
            while not stopped.is_set():
                try:
                    text = input("> ").strip()
                except (EOFError, KeyboardInterrupt):
                    print()
                    break
                if text.lower() == "/quit":
                    break
                if text:
                    try:
                        sock.sendall(encode_message({"type": "chat", "text": text}))
                    except OSError:
                        print("Could not send message: connection lost.")
                        break
        finally:
            stopped.set()
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Connect to a TCP chat server.")
    parser.add_argument("--host", default="127.0.0.1", help="Server hostname or IP")
    parser.add_argument("--port", type=int, default=5000, help="Server TCP port")
    parser.add_argument("--username", required=True, help="Your chat username (max 24 characters)")
    args = parser.parse_args()
    if not args.username.strip() or len(args.username.strip()) > 24:
        parser.error("username must contain 1–24 non-whitespace characters")
    try:
        run_client(args.host, args.port, args.username.strip())
    except (OSError, TimeoutError) as exc:
        print(f"Could not connect to {args.host}:{args.port}: {exc}")


if __name__ == "__main__":
    main()

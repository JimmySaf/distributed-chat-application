
# Distributed Chat Application

A simple distributed real-time chat application built with Python TCP sockets, threading, and JSON-based message communication.

The application supports multiple clients, message broadcasting, communication between two server nodes, and automatic peer reconnection after a server becomes available again.

## Features

- Real-time messaging between connected clients.
- Multiple clients supported by threaded TCP servers.
- Broadcast messages to clients connected to the same server.
- Cross-server message forwarding between two server nodes.
- JSON-based communication protocol.
- Username validation and duplicate username prevention per server.
- System notifications when users join or leave.
- Automatic peer reconnection attempts when a peer server is unavailable.
- Automated protocol, server integration, distributed messaging, and peer reconnection tests.

## Technologies

- Python 3.11 or later
- TCP sockets
- Python threading
- JSON
- `unittest`

No third-party Python packages are required.

## Project Structure

```text
distributed-chat-application/
├── client/
│   ├── __init__.py
│   └── client.py
├── common/
│   ├── __init__.py
│   └── protocol.py
├── server/
│   ├── __init__.py
│   └── server.py
├── tests/
│   ├── __init__.py
│   ├── test_protocol.py
│   ├── test_server.py
│   ├── test_distributed_server.py
│   └── test_peer_reconnect.py
├── .gitignore
└── README.md
```

## Requirements

Install Python 3.11 or later and ensure Python is available in your terminal.

Verify your installation:

```powershell
python --version
```

Run all commands from the project root directory.

## Running the Application

Open separate PowerShell terminals for the servers and clients.

### 1. Start Server Node 1

```powershell
cd D:\Sajims\distributed-chat-application
python -m server.server --host 127.0.0.1 --port 5055
```

Node 1 listens for client connections and connections from peer servers.

### 2. Start Server Node 2

Open another terminal:

```powershell
cd D:\Sajims\distributed-chat-application
python -m server.server --host 127.0.0.1 --port 5056 --peer-host 127.0.0.1 --peer-port 5055
```

Node 2 connects to Node 1 and forwards chat messages between the two servers.

For this demonstration, configure only Node 2 to initiate the peer connection. Do not configure both nodes to connect to each other.

### 3. Connect Alice to Node 1

Open another terminal:

```powershell
cd D:\Sajims\distributed-chat-application
python -m client.client --host 127.0.0.1 --port 5055 --username Alice
```

### 4. Connect Bob to Node 2

Open another terminal:

```powershell
cd D:\Sajims\distributed-chat-application
python -m client.client --host 127.0.0.1 --port 5056 --username Bob
```

Type a message and press Enter. Verify that messages sent by Alice appear in Bob's terminal and vice versa.

Type `/quit` to leave the chat.

Press `Ctrl + C` in a server terminal to stop that server.

## Message Protocol

The application uses JSON messages separated by newline characters. Each message is encoded as UTF-8.

Example chat message:

```json
{
  "type": "chat",
  "username": "Alice",
  "text": "Hello everyone"
}
```

Clients send join messages before sending chat messages. Servers use system messages for notifications and error messages for invalid requests.

## Running the Automated Tests

Run the complete test suite:

```powershell
python -m unittest discover -s tests -v
```

The tests cover:

- JSON protocol handling, including Unicode text.
- Rejection of non-object JSON messages.
- Broadcasting between two clients connected to one server.
- Bidirectional chat between clients connected to different servers.
- Peer reconnection after a server stops and restarts.

The test suite currently contains five tests, all of which have passed in the development environment.

## Fault Tolerance

Node 2 retries its peer connection when Node 1 is unavailable. An integration test verifies that Node 2 reconnects after Node 1 restarts.

This is basic peer-connection recovery, not complete client failover. The current implementation does not guarantee delivery of messages sent while a server is unavailable, preserve chat history, or automatically migrate existing client connections to another server.

## Limitations

- The demonstration uses two server nodes on one computer.
- The default example uses localhost addresses.
- Messages are not stored persistently.
- There is no user authentication or end-to-end encryption.
- Clients must connect to a server manually.
- Messages sent during a disconnection are not queued for later delivery.

## Future Improvements

- Add persistent chat history.
- Add client-side reconnection and server selection.
- Support deployment across multiple computers.
- Add authentication and secure communication.
- Improve delivery guarantees and message deduplication.

## Authors

Add the names and admission numbers of all group members here.

## Assignment

**Title:** Building a Simple Distributed Chat Application

**Course:** Distributed Computing Systems

ConnectChat — Distributed Chat Application
Overview
ConnectChat is a browser-based shared-room chat application. It combines Python TCP sockets, a newline-delimited JSON protocol, a WebSocket gateway, and a React + TypeScript frontend. Python threads allow the server to handle multiple TCP clients. Optional peer connections allow messages to be relayed between separate server nodes.

Scope: The current application provides a shared chat room. Private messaging, persistent message history, full user authentication, TLS/WSS, file attachments, voice/video calls, and transparent browser-client failover are not implemented.
Technologies
- Python: TCP server, command-line client, gateway and tests.
- TCP sockets and threads: concurrent client connections and server communication.
- JSON over UTF-8 with newline framing: message format and message boundaries.
- websockets: WebSocket gateway for browser communication.
- React and TypeScript: browser interface and application state.
- Vite: frontend development server and production build.
- Tailwind CSS: utility styling support.
Architecture and message flow
1. The React frontend collects a display name and sends chat messages over WebSocket.
2. The WebSocket gateway receives browser messages and forwards them to the TCP server.
3. The TCP server processes protocol messages and broadcasts messages to connected clients.
4. If peer communication is configured, the server can relay messages to another server node.
5. The gateway forwards server messages to the browser, where React displays them.
The browser uses WebSocket because browser applications do not connect directly to ordinary TCP sockets.
Project structure
distributed-chat-application/
├── client/
│   └── client.py
├── common/
│   └── protocol.py
├── gateway/
│   ├── __init__.py
│   ├── gateway.py
│   └── test_gateway.py
├── server/
│   └── server.py
├── tests/
│   └── ...                 # Python unit tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatSidebar.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   └── MessageBubble.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── requirements.txt
└── README.md
Main modules
- server/server.py: threaded TCP server; accepts clients, processes messages, broadcasts to connected clients and supports optional peer-server communication.
- common/protocol.py: shared JSON encoding/decoding helpers using UTF-8 and newline-delimited messages.
- client/client.py: command-line TCP client for joining and exchanging messages.
- gateway/gateway.py: WebSocket service that bridges the browser and TCP server.
- gateway/test_gateway.py: gateway connection and message-forwarding test.
- frontend/src/App.tsx: username handling, WebSocket lifecycle, connection state, received messages and sending messages.
- frontend/src/components/: reusable chat sidebar, chat window and message bubble components.
- frontend/src/App.css, frontend/src/index.css: application and global styling.
Requirements and installation
Install Python dependencies from the repository root:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Install frontend dependencies:
cd frontend
npm install
Requirements: Python 3.13 or compatible Python 3, Node.js and npm.
Run the application
Use three separate PowerShell terminals. In the local Windows setup, port 5000 was occupied by a system process, so the TCP server was moved to 5001.

Terminal 1 — TCP server
cd D:\Sajims\distributed-chat-application
python -m server.server --host 127.0.0.1 --port 5001
Terminal 2 — WebSocket gateway
cd D:\Sajims\distributed-chat-application
python -m gateway.gateway --tcp-host 127.0.0.1 --tcp-port 5001 --ws-port 8765
Expected gateway addresses: ws://127.0.0.1:8765, forwarding to 127.0.0.1:5001.

Terminal 3 — React frontend
cd D:\Sajims\distributed-chat-application\frontend
npm run dev
Open the Vite URL printed in the terminal, usually http://localhost:5173. The frontend gateway URL is configured in frontend/src/App.tsx as ws://127.0.0.1:8765.
User guide
1. Open the Vite URL.
2. Enter a display name and join.
3. Wait for the connection status to show connected.
4. Type a message and press Enter to send. Use Shift+Enter for a new line.
5. Open a second browser window and join with a different display name to test message exchange.
6. Sign out to leave the browser session.
The username is stored in local browser storage for convenience; this is not account authentication.
Distributed server testing
Inspect the server command options:
python -m server.server --help
Run two server instances on different available ports and configure each with the other server's peer address using the options supported by the checked-out server/server.py. Connect clients to different nodes and verify cross-server message exchange. Do not bind both servers to the same port.
Tests
Run the Python suite from the repository root:
python -m unittest discover -s tests -v
A previously recorded run passed five tests:
1. Clients on different servers exchange messages.
2. A peer reconnects when the remote server returns.
3. Non-object JSON is rejected.
4. Unicode messages round-trip through the protocol.
5. Two connected clients receive a broadcast.
Run the gateway test while the TCP server and gateway are running:
python -m gateway.test_gateway
Build the frontend:
cd frontend
npm run build
Rerun all tests and the frontend build on the final submission version. Do not report a successful build unless it completes successfully.
Troubleshooting
- Port 5000 permission error: inspect with netstat -ano | findstr :5000. If PID 4 is listening, do not terminate the System process. Use another port such as 5001 and configure the gateway to use the same TCP port.
- Browser cannot connect: confirm the TCP server and gateway are running, and that the gateway forwards to the correct TCP port.
- No messages: check that both browser clients joined and inspect server/gateway terminal output.
- Frontend changes not visible: save the files, verify the correct project directory, inspect the Vite terminal and run npm run build.
Future improvements
Potential extensions include authentication, TLS/WSS, persistent message storage, private rooms, automatic client reconnection/failover, delivery acknowledgements, user presence, file sharing, load testing and deployment configuration.


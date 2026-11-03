
import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Wifi, WifiOff, Server, ShieldCheck } from "lucide-react";
import ChatSidebar, { type ChatContact } from "./components/ChatSidebar";
import ChatWindow from "./components/ChatWindow";
import type { ChatMessage } from "./components/MessageBubble";
import "./App.css";

const GATEWAY_URL = "ws://127.0.0.1:8765";
const ROOM_ID = "global-room";

function getTime(value?: string): string {
  if (!value) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem("connectchat-username") ?? "",
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [lastMessage, setLastMessage] = useState("Start a conversation");
  const [notice, setNotice] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const selectedContactId = ROOM_ID;

  const contact: ChatContact = {
    id: ROOM_ID,
    name: "Global Chat Room",
    initials: "GC",
    color: "bg-gradient-to-br from-blue-500 to-indigo-700",
    lastMessage,
    time: messages.length > 0 ? messages[messages.length - 1].timestamp : "",
    unread: 0,
    online: connected,
    node: "TCP Server · 127.0.0.1:5000",
  };

  useEffect(() => {
    if (!username) return;

    let socket: WebSocket;

    try {
      socket = new WebSocket(GATEWAY_URL);
      socketRef.current = socket;
    } catch {
      setConnectionError("Could not create a WebSocket connection.");
      return;
    }

    socket.onopen = () => {
      setConnectionError("");
      socket.send(
        JSON.stringify({
          type: "join",
          username,
        }),
      );
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as {
          type?: string;
          username?: string;
          text?: string;
          timestamp?: string;
        };

        if (data.type === "gateway") {
          setConnected(true);
          setConnectionError("");
          return;
        }

        if (data.type === "error") {
          setConnectionError(data.text ?? "A server error occurred.");
          return;
        }

        if (data.type === "chat") {
          const sender = data.username ?? "Unknown";
          const text = data.text ?? "";

          const message: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            sender,
            text,
            timestamp: getTime(data.timestamp),
            outgoing: sender === username,
            status: "delivered",
          };

          setMessages((current) => [...current, message]);
          setLastMessage(`${sender}: ${text}`);
          return;
        }

        if (data.type === "system") {
          const text = data.text ?? "Server notification";

          const message: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            sender: "System",
            text,
            timestamp: getTime(data.timestamp),
            outgoing: false,
          };

          setMessages((current) => [...current, message]);
          setLastMessage(text);
        }
      } catch {
        setConnectionError("Received an invalid message from the gateway.");
      }
    };

    socket.onerror = () => {
      setConnectionError("Unable to reach the WebSocket gateway.");
    };

    socket.onclose = () => {
      setConnected(false);
      socketRef.current = null;
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [username]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = usernameInput.trim();

    if (!cleanUsername || cleanUsername.length > 24) {
      setNotice("Enter a username containing 1–24 characters.");
      return;
    }

    localStorage.setItem("connectchat-username", cleanUsername);
    setUsername(cleanUsername);
    setNotice("");
    setConnectionError("");
  }

  function handleSendMessage(text: string) {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN || !connected) {
      setConnectionError("You are not connected to the chat server.");
      return;
    }

    if (text.length > 2000) {
      setConnectionError("Messages must be 2000 characters or fewer.");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "chat",
        text,
      }),
    );
  }

  function handleLogout() {
    socketRef.current?.close();
    localStorage.removeItem("connectchat-username");
    setUsername("");
    setUsernameInput("");
    setMessages([]);
    setConnected(false);
    setLastMessage("Start a conversation");
    setConnectionError("");
  }

  if (!username) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <div className="login-logo">
            <MessageCircle size={30} />
          </div>

          <p className="login-eyebrow">DISTRIBUTED MESSAGING</p>
          <h1>ConnectChat</h1>
          <p className="login-description">
            Connect to your distributed network and start communicating
            with other users in the shared chat room.
          </p>

          <form onSubmit={handleLogin} className="login-form">
            <label htmlFor="username">Your username</label>
            <input
              id="username"
              type="text"
              value={usernameInput}
              onChange={(event) => setUsernameInput(event.target.value)}
              placeholder="Enter your username"
              maxLength={24}
              autoComplete="nickname"
              required
            />

            {notice && <p className="login-error">{notice}</p>}

            <button type="submit">
              Join ConnectChat
              <MessageCircle size={17} />
            </button>
          </form>

          <div className="login-security">
            <ShieldCheck size={15} />
            Messages are transmitted through your chat server.
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="connectchat-app">
      <div className="app-topbar">
        <div className="topbar-brand">
          <div className="topbar-logo">
            <MessageCircle size={19} />
          </div>
          <span>ConnectChat</span>
        </div>

        <div className="topbar-status">
          {connected ? (
            <>
              <Wifi size={15} />
              <span>Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={15} />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>

      <div className="chat-layout">
        <aside className="chat-sidebar">
          <ChatSidebar
            contacts={[contact]}
            selectedContactId={selectedContactId}
            currentUsername={username}
            connected={connected}
            onSelectContact={() => undefined}
            onNewChat={() =>
              setNotice(
                "This version uses a shared room. Private conversations are not implemented yet.",
              )
            }
          />

          <button
            className="logout-button"
            type="button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </aside>

        <section className="chat-main">
          <div className="network-banner">
            <div>
              <Server size={16} />
              <span>Distributed network</span>
            </div>
            <span className={connected ? "network-online" : "network-offline"}>
              {connected ? "Server online" : "Server unavailable"}
            </span>
          </div>

          {connectionError && (
            <div className="connection-alert" role="status">
              {connectionError}
            </div>
          )}

          {notice && (
            <div className="connection-alert notice-alert" role="status">
              {notice}
              <button type="button" onClick={() => setNotice("")}>
                Dismiss
              </button>
            </div>
          )}

          <ChatWindow
            contact={contact}
            messages={messages}
            currentUsername={username}
            connected={connected}
            onSendMessage={handleSendMessage}
          />
        </section>
      </div>

      <footer className="app-footer">
        ConnectChat · Distributed TCP Messaging System
      </footer>
    </main>
  );
}

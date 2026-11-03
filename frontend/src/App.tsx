
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  MoreHorizontal,
  Phone,
  Video,
  Info,
  LogOut,
  Wifi,
  WifiOff,
  Users,
  ShieldCheck,
  Smile,
  Paperclip,
  ArrowLeft,
  Check,
  CheckCheck,
  Menu,
  X,
} from "lucide-react";
import "./App.css";

const GATEWAY_URL = "ws://127.0.0.1:8765";

const MAX_MESSAGE_LENGTH = 2000;

type ChatMessage = {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  outgoing: boolean;
  system?: boolean;
};

type IncomingMessage = {
  type?: string;
  username?: string;
  text?: string;
  timestamp?: string;
};

function formatTime(value?: string): string {
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

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem("connectchat-username") ?? "",
  );
  const [usernameInput, setUsernameInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!username) return;

    let socket: WebSocket;

    try {
      socket = new WebSocket(GATEWAY_URL);
      socketRef.current = socket;
    } catch {
      setConnectionError("Unable to create a connection to the chat gateway.");
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
        const data = JSON.parse(event.data) as IncomingMessage;

        if (data.type === "gateway") {
          setConnected(true);
          setConnectionError("");
          return;
        }

        if (data.type === "error") {
          setConnectionError(data.text ?? "The server returned an error.");
          return;
        }

        if (data.type === "chat") {
          const sender = data.username ?? "Unknown";
          const text = data.text ?? "";

          const newMessage: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            sender,
            text,
            timestamp: formatTime(data.timestamp),
            outgoing: sender === username,
          };

          setMessages((current) => [...current, newMessage]);
          return;
        }

        if (data.type === "system") {
          const newMessage: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            sender: "System",
            text: data.text ?? "A server notification was received.",
            timestamp: formatTime(data.timestamp),
            outgoing: false,
            system: true,
          };

          setMessages((current) => [...current, newMessage]);
        }
      } catch {
        setConnectionError("A message from the gateway could not be read.");
      }
    };

    socket.onerror = () => {
      setConnected(false);
      setConnectionError("Cannot reach the WebSocket gateway.");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanUsername = usernameInput.trim();

    if (!cleanUsername || cleanUsername.length > 24) {
      setLoginError("Your username must contain between 1 and 24 characters.");
      return;
    }

    localStorage.setItem("connectchat-username", cleanUsername);
    setMessages([]);
    setLoginError("");
    setConnectionError("");
    setUsername(cleanUsername);
  }

  function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = messageInput.trim();
    const socket = socketRef.current;

    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setConnectionError("Messages cannot exceed 2000 characters.");
      return;
    }

    if (!socket || socket.readyState !== WebSocket.OPEN || !connected) {
      setConnectionError("You are currently disconnected from the chat server.");
      return;
    }

    socket.send(
      JSON.stringify({
        type: "chat",
        text,
      }),
    );

    setMessageInput("");
    setConnectionError("");
    messageInputRef.current?.focus();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      messageInputRef.current?.form?.requestSubmit();
    }
  }

  function handleLogout() {
    socketRef.current?.close();
    socketRef.current = null;

    localStorage.removeItem("connectchat-username");

    setUsername("");
    setUsernameInput("");
    setMessages([]);
    setMessageInput("");
    setConnected(false);
    setConnectionError("");
    setShowSidebar(false);
  }

  const lastMessage = messages[messages.length - 1];

  if (!username) {
    return (
      <main className="login-page">
        <div className="login-decoration login-decoration-one" />
        <div className="login-decoration login-decoration-two" />

        <section className="login-panel">
          <div className="login-brand">
            <div className="brand-mark">
              <MessageCircle size={25} strokeWidth={2.3} />
            </div>
            <span>ConnectChat</span>
          </div>

          <div className="login-content">
            <span className="section-kicker">DISTRIBUTED CHAT APPLICATION</span>
            <h1>Good conversations start here.</h1>
            <p className="login-description">
              Join your network and connect with people in the shared
              conversation space.
            </p>

            <form className="login-form" onSubmit={handleLogin}>
              <label htmlFor="username">Choose your display name</label>
              <input
                id="username"
                type="text"
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="e.g. Jimmy"
                maxLength={24}
                autoComplete="nickname"
                autoFocus
                required
              />

              {loginError && (
                <p className="form-error" role="alert">
                  {loginError}
                </p>
              )}

              <button className="primary-button login-submit" type="submit">
                Enter ConnectChat
                <ArrowLeft className="button-arrow" size={18} />
              </button>
            </form>

            <div className="login-note">
              <ShieldCheck size={17} />
              <span>Your messages are sent through the chat server.</span>
            </div>
          </div>

          <div className="login-footer">
            <span>ConnectChat</span>
            <span>Distributed messaging system</span>
          </div>
        </section>

        <aside className="login-side">
          <div className="login-side-content">
            <div className="side-icon">
              <Users size={24} />
            </div>
            <p className="side-overline">ONE SPACE. EVERYONE CONNECTED.</p>
            <h2>Communication made simple.</h2>
            <p>
              A lightweight messaging experience powered by a distributed
              TCP server and a WebSocket gateway.
            </p>
            <div className="side-status">
              <span className="status-dot" />
              Built for real-time communication
            </div>
          </div>
          <div className="side-bottom">
            <span>CONNECTCHAT / 01</span>
            <span>COMMUNICATE BETTER</span>
          </div>
        </aside>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <button
            className="mobile-menu-button icon-button"
            type="button"
            aria-label="Open conversations"
            onClick={() => setShowSidebar((current) => !current)}
          >
            {showSidebar ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="brand-mark header-brand-mark">
            <MessageCircle size={21} strokeWidth={2.3} />
          </div>

          <div className="header-brand-text">
            <span className="header-brand-name">ConnectChat</span>
            <span className="header-brand-caption">MESSAGING WORKSPACE</span>
          </div>
        </div>

        <div className="header-right">
          <div className={`connection-pill ${connected ? "is-online" : "is-offline"}`}>
            {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{connected ? "Connected" : "Connecting"}</span>
          </div>

          <div className="header-divider" />

          <div className="profile-summary">
            <div className="profile-avatar">{getInitials(username)}</div>
            <div className="profile-text">
              <strong>{username}</strong>
              <span>My account</span>
            </div>
          </div>

          <button
            className="icon-button logout-icon"
            type="button"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className={`conversation-sidebar ${showSidebar ? "sidebar-open" : ""}`}>
          <div className="sidebar-heading">
            <div>
              <span className="section-kicker">WORKSPACE</span>
              <h2>Messages</h2>
            </div>
            <button
              className="new-chat-button icon-button"
              type="button"
              title="Shared room"
              aria-label="Shared room"
            >
              <Plus size={19} />
            </button>
          </div>

          <div className="search-box">
            <Search size={17} />
            <input type="search" placeholder="Search conversations" disabled />
            <span className="search-shortcut">⌘ K</span>
          </div>

          <div className="conversation-section-label">
            <span>CONVERSATIONS</span>
            <span className="conversation-count">01</span>
          </div>

          <button className="conversation-item selected" type="button">
            <div className="conversation-avatar group-avatar">
              <Users size={21} />
              <span className="avatar-online-indicator" />
            </div>

            <div className="conversation-details">
              <div className="conversation-title-row">
                <strong>Global Chat Room</strong>
                <span className="conversation-time">
                  {lastMessage?.timestamp ?? ""}
                </span>
              </div>
              <p>
                {lastMessage
                  ? `${lastMessage.sender}: ${lastMessage.text}`
                  : "Start a conversation"}
              </p>
            </div>
          </button>

          <div className="sidebar-empty-note">
            <div className="empty-note-icon">
              <MessageCircle size={19} />
            </div>
            <strong>Your shared space</strong>
            <p>
              Messages sent here are visible to everyone connected to this
              chat room.
            </p>
          </div>

          <div className="sidebar-bottom">
            <div className="server-card">
              <div className="server-card-top">
                <span className="server-indicator">
                  <span className={connected ? "status-dot" : "status-dot offline"} />
                  Network status
                </span>
                <MoreHorizontal size={17} />
              </div>
              <strong>{connected ? "Server connected" : "Waiting for server"}</strong>
              <span>TCP network · 127.0.0.1:5001</span>
            </div>
            <div className="sidebar-version">
              <span>CONNECTCHAT</span>
              <span>LOCAL NETWORK</span>
            </div>
          </div>
        </aside>

        <section className="chat-panel">
          <div className="chat-header">
            <div className="chat-header-main">
              <div className="conversation-avatar header-room-avatar">
                <Users size={21} />
              </div>
              <div className="chat-header-title">
                <h1>Global Chat Room</h1>
                <div className="chat-header-subtitle">
                  <span className={connected ? "status-dot" : "status-dot offline"} />
                  {connected ? "Active conversation" : "Waiting for connection"}
                  <span className="subtitle-separator">·</span>
                  Shared room
                </div>
              </div>
            </div>

            <div className="chat-header-actions">
              <button
                className="icon-button"
                type="button"
                title="Voice calls are not available"
                aria-label="Voice calls unavailable"
                disabled
              >
                <Phone size={18} />
              </button>
              <button
                className="icon-button"
                type="button"
                title="Video calls are not available"
                aria-label="Video calls unavailable"
                disabled
              >
                <Video size={19} />
              </button>
              <span className="action-divider" />
              <button
                className={`icon-button ${showInfo ? "active" : ""}`}
                type="button"
                title="Room information"
                aria-label="Room information"
                onClick={() => setShowInfo((current) => !current)}
              >
                <Info size={19} />
              </button>
            </div>
          </div>

          {showInfo && (
            <div className="room-info-panel">
              <div className="room-info-icon">
                <Users size={21} />
              </div>
              <div>
                <strong>Global Chat Room</strong>
                <p>
                  A shared conversation room. All connected users can see
                  messages sent here.
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close room information"
                onClick={() => setShowInfo(false)}
              >
                <X size={17} />
              </button>
            </div>
          )}

          {connectionError && (
            <div className="connection-alert" role="status">
              <WifiOff size={16} />
              <span>{connectionError}</span>
              <button
                type="button"
                onClick={() => setConnectionError("")}
                aria-label="Dismiss connection message"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="messages-area">
            <div className="conversation-intro">
              <div className="intro-avatar">
                <Users size={27} />
              </div>
              <h2>Welcome to the conversation</h2>
              <p>
                This is the beginning of your shared chat room. Say hello
                and start connecting.
              </p>
              <div className="intro-meta">
                <span><Users size={14} /> Shared room</span>
                <span><ShieldCheck size={14} /> Server-based messaging</span>
              </div>
            </div>

            {messages.length > 0 && (
              <div className="message-date-divider">
                <span>MESSAGES</span>
              </div>
            )}

            <div className="message-list">
              {messages.map((message, index) => {
                const previous = messages[index - 1];
                const grouped =
                  previous &&
                  previous.sender === message.sender &&
                  !message.system &&
                  !previous.system;

                if (message.system) {
                  return (
                    <div className="system-message" key={message.id}>
                      <span>{message.text}</span>
                      <time>{message.timestamp}</time>
                    </div>
                  );
                }

                return (
                  <article
                    className={`message-row ${message.outgoing ? "message-outgoing" : "message-incoming"} ${grouped ? "message-grouped" : ""}`}
                    key={message.id}
                  >
                    {!message.outgoing && (
                      <div className="message-avatar">
                        {getInitials(message.sender)}
                      </div>
                    )}

                    <div className="message-content">
                      {!grouped && (
                        <div className="message-meta">
                          <strong>
                            {message.outgoing ? "You" : message.sender}
                          </strong>
                          <time>{message.timestamp}</time>
                        </div>
                      )}

                      <div className="message-bubble">
                        <p>{message.text}</p>
                      </div>

                      {message.outgoing && (
                        <div className="message-status">
                          <CheckCheck size={13} />
                          <span>Sent</span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="composer-section">
            <form className="message-composer" onSubmit={handleSendMessage}>
              <div className="composer-tools">
                <button
                  className="composer-tool"
                  type="button"
                  title="Attachments are not available"
                  aria-label="Attachments unavailable"
                  disabled
                >
                  <Paperclip size={19} />
                </button>
                <button
                  className="composer-tool"
                  type="button"
                  title="Emoji picker is not available"
                  aria-label="Emoji picker unavailable"
                  disabled
                >
                  <Smile size={19} />
                </button>
              </div>

              <textarea
                ref={messageInputRef}
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={
                  connected
                    ? "Write a message..."
                    : "Waiting for server connection..."
                }
                maxLength={MAX_MESSAGE_LENGTH}
                rows={1}
                disabled={!connected}
                aria-label="Write a message"
              />

              <div className="composer-submit-area">
                <span className="character-count">
                  {messageInput.length}/{MAX_MESSAGE_LENGTH}
                </span>
                <button
                  className="send-button"
                  type="submit"
                  disabled={!connected || !messageInput.trim()}
                  aria-label="Send message"
                  title="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>

            <div className="composer-hint">
              <span>Press <kbd>Enter</kbd> to send</span>
              <span><kbd>Shift + Enter</kbd> for a new line</span>
            </div>
          </div>
        </section>
      </div>

      <footer className="app-footer">
        <span>ConnectChat</span>
        <span className="footer-separator">·</span>
        <span>Distributed TCP Messaging System</span>
        <span className="footer-spacer" />
        <span className="footer-network">
          {connected ? <Check size={13} /> : <WifiOff size={13} />}
          {connected ? "Network operational" : "Network disconnected"}
        </span>
      </footer>

      {showSidebar && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close conversations"
          onClick={() => setShowSidebar(false)}
        />
      )}
    </main>
  );
}
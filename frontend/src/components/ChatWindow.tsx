
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Send,
  Smile,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import MessageBubble, { type ChatMessage } from "./MessageBubble";
import type { ChatContact } from "./ChatSidebar";

interface ChatWindowProps {
  contact: ChatContact | undefined;
  messages: ChatMessage[];
  currentUsername: string;
  connected: boolean;
  onSendMessage: (text: string) => void;
  onBack?: () => void;
}

export default function ChatWindow({
  contact,
  messages,
  currentUsername,
  connected,
  onSendMessage,
  onBack,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = draft.trim();

    if (!text || !connected) return;

    onSendMessage(text);
    setDraft("");
  }

  if (!contact) {
    return (
      <main className="flex h-full flex-1 items-center justify-center bg-slate-900 p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 text-blue-400">
            <Send size={32} />
          </div>
          <h2 className="text-xl font-semibold text-white">
            Welcome to ConnectChat
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Select a conversation to start chatting across your
            distributed network.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-slate-900">
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-950/70 px-4 py-4 sm:px-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft size={19} />
          </button>
        )}

        <div className="relative shrink-0">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold text-white ${contact.color}`}
          >
            {contact.initials}
          </div>
          <span
            className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[3px] border-slate-950 ${
              contact.online ? "bg-emerald-400" : "bg-slate-600"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-white">
            {contact.name}
          </h2>
          <p className="mt-1 truncate text-xs text-slate-500">
            {contact.node} ·{" "}
            {contact.online ? "Online" : "Offline"}
          </p>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            title="Voice call (not implemented)"
            aria-label="Voice call"
            className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <Phone size={18} />
          </button>
          <button
            type="button"
            title="More options"
            aria-label="More options"
            className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <MoreVertical size={19} />
          </button>
        </div>
      </header>

      <div className="flex items-center justify-center gap-2 border-b border-slate-800/70 px-3 py-2 text-center text-[11px] text-slate-500">
        <ShieldCheck size={14} className="text-emerald-500" />
        Signed in as {currentUsername}. Messages use the chat protocol.
      </div>

      <section
        aria-label={`Conversation with ${contact.name}`}
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-6"
      >
        <div className="flex justify-center">
          <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-[10px] text-slate-500">
            Conversation with {contact.name}
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="m-auto max-w-xs py-8 text-center">
            <p className="text-sm text-slate-400">
              No messages yet.
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Send a message to start the conversation.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        <div ref={bottomRef} />
      </section>

      <footer className="border-t border-slate-800 bg-slate-950/60 p-3 sm:p-5">
        {!connected && (
          <p className="mb-3 text-xs text-amber-400">
            You're disconnected. Reconnect to send messages.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-2 focus-within:border-blue-500"
        >
          <button
            type="button"
            title="Attachments (not implemented)"
            aria-label="Attachments"
            className="hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 sm:block"
          >
            <Paperclip size={19} />
          </button>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={
              connected
                ? `Message ${contact.name}...`
                : "Waiting for connection..."
            }
            aria-label="Message text"
            disabled={!connected}
            className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2 py-2.5 text-sm leading-5 text-slate-100 outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
          />

          <button
            type="button"
            title="Emoji (not implemented)"
            aria-label="Emoji"
            className="hidden rounded-xl p-2.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200 sm:block"
          >
            <Smile size={19} />
          </button>

          <button
            type="submit"
            disabled={!draft.trim() || !connected}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
          >
            <Send size={17} />
          </button>
        </form>

        <p className="mt-2 text-center text-[10px] text-slate-600">
          Press Enter to send · Shift + Enter for a new line
        </p>
      </footer>
    </main>
  );
}

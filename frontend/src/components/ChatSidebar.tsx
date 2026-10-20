
import { useMemo, useState } from "react";
import {
  MessageCircle,
  Search,
  Settings,
  CircleHelp,
  LogOut,
  Plus,
  Wifi,
  WifiOff,
} from "lucide-react";

export interface ChatContact {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  node: string;
}

interface ChatSidebarProps {
  contacts: ChatContact[];
  selectedContactId: string;
  currentUsername: string;
  connected: boolean;
  onSelectContact: (contactId: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({
  contacts,
  selectedContactId,
  currentUsername,
  connected,
  onSelectContact,
  onNewChat,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return contacts;

    return contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.lastMessage.toLowerCase().includes(term)
    );
  }, [contacts, search]);

  const initials = currentUsername
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-950/40">
          <MessageCircle size={23} />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold tracking-tight">
            ConnectChat
          </h1>
          <p className="text-xs text-slate-500">
            Distributed messaging
          </p>
        </div>

        <button
          type="button"
          onClick={onNewChat}
          title="Start a chat"
          aria-label="Start a chat"
          className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <Plus size={19} />
        </button>
      </div>

      <div className="px-4 pb-3 pt-5">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Messages
        </h2>
        <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] text-slate-400">
          {contacts.length}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filteredContacts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No conversations found.
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const selected = contact.id === selectedContactId;

            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => onSelectContact(contact.id)}
                aria-pressed={selected}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                  selected
                    ? "bg-blue-600/15 ring-1 ring-blue-500/30"
                    : "hover:bg-slate-900"
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold text-white ${contact.color}`}
                  >
                    {contact.initials}
                  </div>

                  <span
                    className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-[3px] border-slate-950 ${
                      contact.online
                        ? "bg-emerald-400"
                        : "bg-slate-600"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-100">
                      {contact.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {contact.time}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {contact.lastMessage}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-600">
                    {contact.node}
                  </p>
                </div>

                {contact.unread > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white">
                    {contact.unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-900 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
            {initials || "U"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {currentUsername}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              {connected ? (
                <Wifi size={12} className="text-emerald-400" />
              ) : (
                <WifiOff size={12} className="text-amber-400" />
              )}
              <span
                className={`text-xs ${
                  connected
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            title="Settings"
            className="flex flex-col items-center gap-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-slate-200"
          >
            <Settings size={17} />
            <span className="text-[10px]">Settings</span>
          </button>

          <button
            type="button"
            title="Help"
            className="flex flex-col items-center gap-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-slate-200"
          >
            <CircleHelp size={17} />
            <span className="text-[10px]">Help</span>
          </button>

          <button
            type="button"
            title="Log out"
            onClick={() => {
              window.alert(
                "Login and logout will be connected in a later step."
              );
            }}
            className="flex flex-col items-center gap-1 rounded-lg p-2 text-slate-500 transition hover:bg-slate-900 hover:text-rose-400"
          >
            <LogOut size={17} />
            <span className="text-[10px]">Log out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

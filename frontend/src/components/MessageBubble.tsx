
import { CheckCheck } from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
  outgoing: boolean;
  status?: "sent" | "delivered" | "read";
}

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({
  message,
}: MessageBubbleProps) {
  const { sender, text, timestamp, outgoing, status } = message;

  return (
    <div
      className={`flex w-full ${
        outgoing ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex max-w-[85%] flex-col gap-1 sm:max-w-[70%] ${
          outgoing ? "items-end" : "items-start"
        }`}
      >
        {!outgoing && (
          <span className="px-1 text-xs font-medium text-slate-400">
            {sender}
          </span>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            outgoing
              ? "rounded-br-md bg-blue-600 text-white"
              : "rounded-bl-md border border-slate-700 bg-slate-800 text-slate-100"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>

        <div className="flex items-center gap-1 px-1">
          <span className="text-[11px] text-slate-500">
            {timestamp}
          </span>

          {outgoing && (
            <CheckCheck
              size={14}
              aria-label={`Message ${status ?? "sent"}`}
              className={
                status === "read"
                  ? "text-sky-400"
                  : "text-slate-500"
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

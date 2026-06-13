import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X, Send } from "lucide-react";
import { useSetting } from "@/hooks/use-site-content";

export type LiveChatWidgetSettings = {
  enabled: boolean;
  whatsapp_number: string;
  chat_message: string;
  position: "bottom-right" | "bottom-left";
  heading: string;
  subheading: string;
};

export const LIVE_CHAT_DEFAULTS: LiveChatWidgetSettings = {
  enabled: false,
  whatsapp_number: "",
  chat_message: "Hi, I need help",
  position: "bottom-right",
  heading: "How can we help?",
  subheading: "Chat with our team — we usually reply within minutes.",
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.001 2.667C8.638 2.667 2.667 8.638 2.667 16c0 2.353.616 4.652 1.787 6.677L2.667 29.333l6.86-1.764A13.27 13.27 0 0 0 16 29.333C23.363 29.333 29.333 23.363 29.333 16S23.363 2.667 16.001 2.667Zm6.123 16.03c-.335-.168-1.984-.978-2.291-1.09-.308-.112-.531-.168-.755.168-.224.335-.866 1.09-1.062 1.314-.196.224-.392.252-.726.084-.335-.168-1.414-.521-2.694-1.661-.996-.888-1.668-1.984-1.864-2.319-.196-.335-.021-.516.147-.683.151-.15.335-.392.503-.587.168-.196.224-.336.336-.56.112-.224.056-.42-.028-.587-.084-.168-.755-1.819-1.034-2.49-.272-.654-.55-.566-.755-.577l-.643-.012a1.24 1.24 0 0 0-.895.42c-.308.335-1.174 1.147-1.174 2.797 0 1.65 1.202 3.244 1.37 3.468.168.224 2.367 3.614 5.736 5.066.802.346 1.428.552 1.916.706.805.256 1.538.22 2.117.134.646-.096 1.984-.811 2.264-1.594.28-.783.28-1.455.196-1.594-.084-.14-.308-.224-.643-.392Z" />
    </svg>
  );
}

function buildWaHref(phone: string, message: string) {
  const p = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!p) return null;
  const m = message.trim();
  return m ? `https://wa.me/${p}?text=${encodeURIComponent(m)}` : `https://wa.me/${p}`;
}

export function LiveChatWidget() {
  const settings = useSetting<LiveChatWidgetSettings>("live_chat_widget", LIVE_CHAT_DEFAULTS);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!settings.enabled) return null;

  // Hide on admin shell and site-preview iframe to avoid overlapping admin actions.
  const path = location.pathname;
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("site-preview") === "1"
  ) {
    return null;
  }

  const waBase = buildWaHref(settings.whatsapp_number, settings.chat_message);
  if (!waBase) return null;

  const composed = [name.trim() ? `Hi, I'm ${name.trim()}.` : "", msg.trim()]
    .filter(Boolean)
    .join(" ");
  const waSendHref =
    buildWaHref(settings.whatsapp_number, composed || settings.chat_message) ?? waBase;

  const pos =
    settings.position === "bottom-left"
      ? "left-4 sm:left-6 items-start"
      : "right-4 sm:right-6 items-end";

  return (
    <div
      className={`fixed bottom-4 z-[9999] flex flex-col gap-3 sm:bottom-6 ${pos}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label="Live chat"
          className="animate-in fade-in zoom-in-95 slide-in-from-bottom-4 w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-white/10 bg-background shadow-2xl duration-200"
        >
          <div
            className="relative px-5 pb-5 pt-6 text-white"
            style={{
              background:
                "linear-gradient(135deg, #128C7E 0%, #25D366 60%, #25D366 100%)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15">
                <WhatsAppIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold leading-tight">{settings.heading}</h3>
                <p className="text-xs text-white/85">{settings.subheading}</p>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <a
              href={waBase}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Open WhatsApp Chat
            </a>

            <div className="rounded-2xl border border-border bg-background/50 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contact us
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="Your name (optional)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value.slice(0, 600))}
                rows={3}
                placeholder="How can we help?"
                className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
              <a
                href={waSendHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (!msg.trim()) return;
                  setTimeout(() => {
                    setMsg("");
                    setOpen(false);
                  }, 150);
                }}
                aria-disabled={!msg.trim()}
                className={`mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white transition ${
                  msg.trim()
                    ? "hover:brightness-110"
                    : "pointer-events-none opacity-50"
                }`}
                style={{ background: "#25D366" }}
              >
                <Send className="h-4 w-4" /> Send via WhatsApp
              </a>
            </div>
            <p className="text-center text-[10px] text-muted-foreground">
              We&apos;ll never share your details.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat widget" : "Open chat widget"}
        aria-expanded={open}
        className="group relative grid h-14 w-14 place-items-center self-end rounded-full text-white shadow-[0_10px_28px_rgba(37,211,102,0.5)] ring-1 ring-black/5 transition-transform duration-150 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
        style={{ backgroundColor: open ? "#0f172a" : "#25D366" }}
      >
        {!open && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 0 0 rgba(37,211,102,0.55)",
              animation: "lcw-pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
            }}
          />
        )}
        {open ? (
          <X className="relative h-6 w-6" />
        ) : (
          <MessageCircle className="relative h-7 w-7" />
        )}
      </button>
      <style>{`@keyframes lcw-pulse{0%{box-shadow:0 0 0 0 rgba(37,211,102,0.55)}70%{box-shadow:0 0 0 14px rgba(37,211,102,0)}100%{box-shadow:0 0 0 0 rgba(37,211,102,0)}}`}</style>
    </div>
  );
}

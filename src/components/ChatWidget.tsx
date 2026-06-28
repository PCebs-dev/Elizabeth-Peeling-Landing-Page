"use client";

import { useState } from "react";
import type { SiteContent } from "@/content/types";
import { links } from "@/config/links";
import { trackEvent, trackOutboundLink } from "@/lib/analytics";

interface ChatWidgetProps {
  content: SiteContent;
}

export function ChatWidget({ content }: ChatWidgetProps) {
  const { chat } = content;
  const [open, setOpen] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null);

  const handleOpen = () => {
    setOpen(true);
    setBubbleDismissed(true);
    trackEvent("chat_open");
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setActiveAnswer(null);
  };

  const dismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBubbleDismissed(true);
    trackEvent("chat_bubble_dismiss");
  };

  const Avatar = ({ className }: { className: string }) =>
    photoError ? (
      <div
        className={`flex items-center justify-center bg-brand-300 text-white ${className}`}
        aria-hidden
      >
        <svg className="h-2/3 w-2/3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      </div>
    ) : (
      // Generic assistant avatar (not Dr. Peeling).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={links.chatAvatar}
        alt=""
        className={`object-cover object-center ${className}`}
        onError={() => setPhotoError(true)}
      />
    );

  const handleSearch = () => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return;

    trackEvent("chat_query", { query_length: normalized.length });

    const match = chat.faqs.find(
      (faq) =>
        faq.question.toLowerCase().includes(normalized) ||
        faq.answer.toLowerCase().includes(normalized)
    );

    setActiveAnswer(
      match
        ? `${match.question}\n\n${match.answer}`
        : content.locale === "en"
          ? "I couldn't find an exact match. Try one of the topics below or book a consultation for personalized guidance."
          : "Je n'ai pas trouvé de correspondance exacte. Essayez un des sujets ci-dessous ou prenez rendez-vous pour des conseils personnalisés."
    );
  };

  const handleFaqClick = (question: string, answer: string) => {
    setActiveAnswer(`${question}\n\n${answer}`);
    trackEvent("chat_faq_click", { question });
  };

  return (
    <>
      {!open && (
        <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6">
          {!bubbleDismissed && (
            <div className="relative flex max-w-[18rem] items-center gap-3 rounded-2xl bg-white px-4 py-3 pr-9 shadow-float">
              <button
                type="button"
                onClick={handleOpen}
                className="flex items-center gap-3 text-left"
                aria-label={chat.title}
              >
                <Avatar className="h-10 w-10 shrink-0 rounded-full" />
                <span className="text-sm font-medium leading-snug text-brand-900">
                  {chat.bubblePrompt}
                </span>
              </button>
              <button
                type="button"
                onClick={dismissBubble}
                className="absolute right-2 top-2 text-brand-400 hover:text-brand-700"
                aria-label="Dismiss"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-white shadow-float" />
            </div>
          )}

          <button
            type="button"
            onClick={handleOpen}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700 shadow-float ring-1 ring-brand-200 transition hover:bg-brand-200"
            aria-label={chat.title}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 10h.01M12 10h.01M7 16l-3 3V6a2 2 0 012-2h9a2 2 0 012 2v6a2 2 0 01-2 2H7z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M16 9h2a2 2 0 012 2v9l-3-3h-5a2 2 0 01-2-2"
              />
            </svg>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed bottom-20 right-4 z-50 flex w-[min(100vw-2rem,24rem)] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-white shadow-float sm:bottom-6"
          role="dialog"
          aria-label={chat.title}
        >
          <header className="flex items-center justify-between bg-brand-600 px-4 py-3 text-white">
            <h3 className="font-semibold">{chat.title}</h3>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full px-2 py-1 text-lg leading-none hover:bg-brand-700"
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <div className="max-h-80 space-y-3 overflow-y-auto p-4">
            <p className="text-sm text-brand-700">{chat.greeting}</p>
            <p className="text-xs text-brand-500">{chat.privacyNote}</p>

            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={chat.placeholder}
                className="flex-1 rounded-xl border border-brand-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                →
              </button>
            </div>

            {activeAnswer && (
              <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-800 whitespace-pre-line">
                {activeAnswer}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {chat.quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 hover:border-brand-400"
                  onClick={() =>
                    action.trackEvent && trackOutboundLink(action.href, action.trackEvent)
                  }
                >
                  {action.label}
                </a>
              ))}
            </div>

            <ul className="space-y-2">
              {chat.faqs.map((faq) => (
                <li key={faq.question}>
                  <button
                    type="button"
                    onClick={() => handleFaqClick(faq.question, faq.answer)}
                    className="w-full rounded-xl border border-brand-100 px-3 py-2 text-left text-sm text-brand-800 hover:border-brand-300 hover:bg-brand-50"
                  >
                    {faq.question}
                  </button>
                  {faq.action && activeAnswer?.startsWith(faq.question) && (
                    <a
                      href={faq.action.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-brand-600 underline"
                      onClick={() =>
                        faq.action?.trackEvent &&
                        trackOutboundLink(faq.action.href, faq.action.trackEvent)
                      }
                    >
                      {faq.action.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

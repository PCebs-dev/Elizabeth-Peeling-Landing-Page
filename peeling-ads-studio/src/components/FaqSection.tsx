import type { SiteContent } from "@/content/types";

interface FaqSectionProps {
  content: SiteContent;
}

export function FaqSection({ content }: FaqSectionProps) {
  return (
    <section id="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-serif text-2xl font-semibold text-brand-900">
        {content.faq.heading}
      </h2>
      <div className="mt-4 space-y-2">
        {content.faq.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-brand-100 bg-white shadow-card"
          >
            <summary className="cursor-pointer list-none px-4 py-3 font-medium text-brand-900 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                {item.question}
                <span className="text-brand-400 transition group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="border-t border-brand-50 px-4 py-3 text-sm leading-relaxed text-brand-600">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

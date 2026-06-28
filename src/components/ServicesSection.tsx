import type { SiteContent } from "@/content/types";

interface TrustStripProps {
  items: string[];
}

export function TrustStrip({ items }: TrustStripProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

interface ServicesSectionProps {
  content: SiteContent;
}

export function ServicesSection({ content }: ServicesSectionProps) {
  return (
    <section id="services" aria-labelledby="services-heading">
      <h2
        id="services-heading"
        className="font-serif text-2xl font-semibold text-brand-900"
      >
        {content.services.heading}
      </h2>
      <ul className="mt-4 space-y-3">
        {content.services.items.map((service) => (
          <li
            key={service.title}
            className="rounded-2xl border border-brand-100 bg-white p-4 shadow-card"
          >
            <h3 className="font-semibold text-brand-900">{service.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-brand-600">
              {service.description}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

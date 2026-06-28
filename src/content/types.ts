export type Locale = "en" | "fr";

export interface CtaLink {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  external?: boolean;
  primary?: boolean;
  trackEvent?: string;
}

export interface Testimonial {
  quote: string;
  name: string;
  rating?: number;
  source?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceItem {
  title: string;
  description: string;
}

export interface ChatFaq {
  question: string;
  answer: string;
  action?: {
    label: string;
    href: string;
    trackEvent?: string;
  };
}

export interface SiteContent {
  locale: Locale;
  alternateLocale: Locale;
  meta: {
    title: string;
    description: string;
    keywords: string[];
  };
  hero: {
    name: string;
    credentials: string;
    location: string;
    tagline: string;
    bio: string;
  };
  ctas: CtaLink[];
  trust: string[];
  services: {
    heading: string;
    items: ServiceItem[];
  };
  reviews: {
    label: string;
    heading: string;
    pressLink: {
      label: string;
      href: string;
    };
    initialCount: number;
    showMore: string;
    showLess: string;
    disclaimer: string;
    viewAllLabel: string;
    items: Testimonial[];
  };
  faq: {
    heading: string;
    items: FaqItem[];
  };
  chat: {
    title: string;
    bubblePrompt: string;
    greeting: string;
    placeholder: string;
    privacyNote: string;
    faqs: ChatFaq[];
    quickActions: { label: string; href: string; trackEvent?: string }[];
  };
  footer: {
    disclaimer: string;
    copyright: string;
    clinicNote: string;
  };
  stickyCta: string;
  langToggle: { label: string; switchTo: string };
}

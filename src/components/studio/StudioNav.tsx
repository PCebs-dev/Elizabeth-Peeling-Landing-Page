"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/studio",
    label: "Ads",
    match: (path: string) => path === "/studio",
  },
  {
    href: "/studio/enhance",
    label: "Enhance",
    match: (path: string) => path.startsWith("/studio/enhance"),
  },
  {
    href: "/studio/themes",
    label: "Themes",
    match: (path: string) => path.startsWith("/studio/themes"),
  },
] as const;

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mt-4 flex flex-wrap gap-1"
      aria-label="Studio sections"
    >
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`min-h-10 rounded-lg px-3 py-2 text-sm font-medium ${
              active
                ? "bg-[rgb(var(--brand-800))] text-white"
                : "border border-[rgb(var(--brand-300))] bg-white text-[rgb(var(--brand-800))] hover:bg-[rgb(var(--brand-50))]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

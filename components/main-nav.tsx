"use client";

import { usePathname } from "next/navigation";

const links = [
  ["Home", "/"],
  ["Donate", "/donate"],
  ["Listings", "/listings"],
  ["Dashboard", "/dashboard"],
  ["My activity", "/my"],
  ["Model", "/model"],
  ["About", "/about"]
] as const;

export function MainNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav aria-label="Main navigation" className="flex w-full flex-col gap-1 text-sm sm:w-auto sm:flex-row sm:flex-wrap">
      {links.map(([label, href]) => {
        const active = pathname === href;
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 font-medium transition-colors ${active ? "bg-green-100 text-green-950" : "text-gray-700 hover:bg-gray-100 hover:text-gray-950"}`}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}

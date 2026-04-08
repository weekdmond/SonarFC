"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { useAppPreferences } from "@/components/preferences-provider";
import { messages } from "@/lib/i18n";

const NAV_ITEMS = [
  { href: "/", key: "news" as const },
  { href: "/world-cup", key: "worldCup" as const },
  { href: "/competition/champions-league", key: "champions" as const },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { locale, theme, setTheme } = useAppPreferences();
  const copy = messages[locale];

  return (
    <div className="app-frame">
      <header className="header">
        <Link href="/" className="logo">
          <span className="logo-icon">⚡</span>
          <span>{copy.appName}</span>
        </Link>

        <input
          type="search"
          className="header-search"
          placeholder={copy.common.search}
          aria-label={copy.common.search}
        />

        <nav className="header-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`header-nav__link${active ? " header-nav__link--active" : ""}`}
              >
                {copy.nav[item.key]}
              </Link>
            );
          })}

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {copy.common.light} / {copy.common.dark}
          </button>
        </nav>
      </header>

      <main className="page-shell">{children}</main>
    </div>
  );
}

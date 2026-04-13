"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { EntityMark } from "@/components/entity-mark";
import { useAppPreferences } from "@/components/preferences-provider";
import { translateText } from "@/lib/i18n";
import { messages } from "@/lib/i18n";
import type { LocalizedText } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/", key: "news" as const },
  { href: "/world-cup", key: "worldCup" as const },
  { href: "/competition/champions-league", key: "champions" as const },
];

type SearchCompetitionResult = {
  id: string;
  name: LocalizedText;
  subtitle: string;
  href: string;
  icon: string;
};

type SearchTeamResult = {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: string;
};

type SearchPlayerResult = {
  slug: string;
  name: string;
  subtitle: string;
  href: string;
  photo: string;
};

type SearchResponse = {
  competitions: SearchCompetitionResult[];
  teams: SearchTeamResult[];
  players: SearchPlayerResult[];
};

type SearchGroupKey = "teams" | "players" | "competitions";
type SearchItem =
  | (SearchCompetitionResult & { group: "competitions"; label: string; key: string })
  | (SearchTeamResult & { group: "teams"; label: string; key: string })
  | (SearchPlayerResult & { group: "players"; label: string; key: string });

const EMPTY_SEARCH_RESULTS: SearchResponse = {
  competitions: [],
  teams: [],
  players: [],
};

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, theme, setTheme } = useAppPreferences();
  const copy = messages[locale];
  const shellRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse>(EMPTY_SEARCH_RESULTS);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setSearchExpanded(true);
      }

      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!searchExpanded) {
      return;
    }

    inputRef.current?.focus();
  }, [searchExpanded]);

  useEffect(() => {
    setSearchExpanded(false);
    setQuery("");
    setResults(EMPTY_SEARCH_RESULTS);
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    if (!searchExpanded) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (shellRef.current?.contains(event.target as Node)) {
        return;
      }

      closeSearch();
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchExpanded]);

  useEffect(() => {
    if (!searchExpanded) {
      return;
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setLoading(false);
      setResults(EMPTY_SEARCH_RESULTS);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Search failed with ${response.status}`);
        }

        const payload = (await response.json()) as SearchResponse;
        setResults(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        console.warn("[SonarFC] Search request failed.", error);
        setResults(EMPTY_SEARCH_RESULTS);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [query, searchExpanded]);

  const searchPlaceholder = useMemo(() => copy.common.search, [copy.common.search]);
  const searchItems = useMemo<SearchItem[]>(
    () => [
      ...results.teams.map((item) => ({
        ...item,
        group: "teams" as const,
        label: item.name,
        key: `team-${item.id}`,
      })),
      ...results.players.map((item) => ({
        ...item,
        group: "players" as const,
        label: item.name,
        key: `player-${item.slug}`,
      })),
      ...results.competitions.map((item) => ({
        ...item,
        group: "competitions" as const,
        label: translateText(item.name, locale),
        key: `competition-${item.id}`,
      })),
    ],
    [locale, results]
  );
  const searchGroups: Array<{ key: SearchGroupKey; label: string; items: SearchItem[] }> = useMemo(
    () => [
      {
        key: "teams",
        label: locale === "zh" ? "球队" : "Teams",
        items: searchItems.filter((item) => item.group === "teams"),
      },
      {
        key: "players",
        label: locale === "zh" ? "球员" : "Players",
        items: searchItems.filter((item) => item.group === "players"),
      },
      {
        key: "competitions",
        label: locale === "zh" ? "联赛" : "Competitions",
        items: searchItems.filter((item) => item.group === "competitions"),
      },
    ],
    [locale, searchItems]
  );
  const hasSearchQuery = query.trim().length >= 2;
  const showDropdown = searchExpanded && hasSearchQuery;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, results]);

  function closeSearch() {
    setSearchExpanded(false);
  }

  function navigateToResult(href: string) {
    closeSearch();
    router.push(href);
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (event.key === "Escape") {
        closeSearch();
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (searchItems.length ? (current + 1) % searchItems.length : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        searchItems.length ? (current - 1 + searchItems.length) % searchItems.length : 0
      );
      return;
    }

    if (event.key === "Enter") {
      const target = searchItems[highlightedIndex];
      if (!target) {
        return;
      }

      event.preventDefault();
      navigateToResult(target.href);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
    }
  }

  return (
    <div className="app-frame">
      <header className="header">
        <Link href="/" className="logo">
          <span className="logo-icon">⚡</span>
          <span>{copy.appName}</span>
        </Link>

        <div
          ref={shellRef}
          className={`header-search-shell${searchExpanded ? " header-search-shell--expanded" : ""}`}
        >
          <button
            type="button"
            className="header-search-toggle"
            aria-label={searchPlaceholder}
            onClick={() => setSearchExpanded((value) => !value)}
          >
            ⌕
          </button>
          <input
            ref={inputRef}
            type="search"
            className="header-search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchExpanded(true)}
            onKeyDown={handleSearchKeyDown}
          />
          {showDropdown ? (
            <div className="search-dropdown" role="listbox">
              {loading ? (
                <div className="search-loading">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div className="search-loading__row" key={`loading-${index}`}>
                      <div className="skeleton skeleton-circle" />
                      <div className="search-loading__body">
                        <div className="skeleton skeleton-line skeleton-line--short" />
                        <div className="skeleton skeleton-line skeleton-line--tiny" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchItems.length ? (
                searchGroups.map((group) =>
                  group.items.length ? (
                    <Fragment key={group.key}>
                      <div className="search-group-title">{group.label}</div>
                      {group.items.map((item) => {
                        const itemIndex = searchItems.findIndex((candidate) => candidate.key === item.key);
                        const active = itemIndex === highlightedIndex;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            className={`search-result${active ? " search-result--active" : ""}`}
                            onMouseEnter={() => setHighlightedIndex(itemIndex)}
                            onClick={() => navigateToResult(item.href)}
                          >
                            <span className="search-result__icon">
                              {item.group === "players" ? (
                                item.photo ? (
                                  <img src={item.photo} alt={item.name} className="search-result__photo" />
                                ) : (
                                  <span className="search-result__fallback">{initials(item.name)}</span>
                                )
                              ) : (
                                <EntityMark
                                  value={item.icon}
                                  label={item.label}
                                  className="search-result__mark"
                                />
                              )}
                            </span>
                            <span className="search-result__copy">
                              <span className="search-result__title">
                                {highlightMatch(item.label, query)}
                              </span>
                              <span className="search-result-meta">
                                {highlightMatch(item.subtitle, query)}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </Fragment>
                  ) : null
                )
              ) : (
                <div className="search-empty">
                  <div className="search-empty__icon">⌕</div>
                  <div className="search-empty__title">
                    {locale === "zh" ? "未找到相关结果" : "No results found"}
                  </div>
                  <div className="search-empty__body">
                    {locale === "zh"
                      ? `试试更换关键词：${query}`
                      : `Try another keyword for "${query}".`}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

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
            aria-label={theme === "dark" ? copy.common.light : copy.common.dark}
          >
            {theme === "dark" ? "◐" : "◑"}
          </button>
        </nav>
      </header>

      <main className="page-shell">{children}</main>
    </div>
  );
}

function highlightMatch(value: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return value;
  }

  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(`(${escapedQuery})`, "ig");
  const parts = value.split(matcher).filter(Boolean);

  return parts.map((part, index) =>
    part.toLowerCase() === trimmedQuery.toLowerCase() ? <mark key={`${part}-${index}`}>{part}</mark> : part
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0] ?? "")
    .join("")
    .toUpperCase();
}

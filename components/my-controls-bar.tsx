"use client";

import Link from "next/link";

import { useAppPreferences } from "@/components/preferences-provider";
import { messages } from "@/lib/i18n";

export function MyControlsBar({ active }: { active: "my" | "settings" }) {
  const { locale, theme, setTheme, setLocale } = useAppPreferences();
  const copy = messages[locale];

  return (
    <div className="my-controls">
      <div className="my-controls__nav">
        <Link
          href="/my"
          className={`my-controls__tab${active === "my" ? " my-controls__tab--active" : ""}`}
        >
          {copy.nav.my}
        </Link>
        <Link
          href="/settings"
          className={`my-controls__tab${active === "settings" ? " my-controls__tab--active" : ""}`}
        >
          {copy.nav.settings}
        </Link>
      </div>

      <div className="my-controls__actions">
        <div className="segmented-control">
          {(["dark", "light"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`segmented-control__button${
                theme === mode ? " segmented-control__button--active" : ""
              }`}
              onClick={() => setTheme(mode)}
            >
              {mode === "dark" ? copy.common.dark : copy.common.light}
            </button>
          ))}
        </div>

        <div className="segmented-control">
          {(["zh", "en"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`segmented-control__button${
                locale === mode ? " segmented-control__button--active" : ""
              }`}
              onClick={() => setLocale(mode)}
            >
              {mode === "zh" ? copy.common.chinese : copy.common.english}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

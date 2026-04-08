"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { defaultPreferences } from "@/lib/data";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchPreferencesFromSupabase,
  mergePreferences,
  parseStoredPreferences,
  savePreferencesToSupabase,
} from "@/lib/supabase/preferences";
import type {
  Locale,
  NotificationPreferences,
  PreferencesBackendMode,
  PreferencesSyncState,
  ThemeMode,
  UserPreferencesState,
} from "@/lib/types";

const STORAGE_KEY = "sonarfc.preferences";

interface PreferencesContextValue extends UserPreferencesState {
  backendMode: PreferencesBackendMode;
  syncState: PreferencesSyncState;
  setTheme: (theme: ThemeMode) => void;
  setLocale: (locale: Locale) => void;
  toggleTeam: (teamId: string) => void;
  toggleCompetition: (competitionId: string) => void;
  setNotification: (
    key: keyof NotificationPreferences,
    enabled: boolean
  ) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferencesState>(defaultPreferences);
  const [isHydrated, setIsHydrated] = useState(false);
  const [backendMode, setBackendMode] = useState<PreferencesBackendMode>("local");
  const [syncState, setSyncState] = useState<PreferencesSyncState>("local");
  const clientRef = useRef<ReturnType<typeof getSupabaseBrowserClient> | null>(null);
  const canSyncRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function hydratePreferences() {
      const storedPreferences = parseStoredPreferences(window.localStorage.getItem(STORAGE_KEY));
      const localPreferences = mergePreferences(defaultPreferences, storedPreferences);

      if (!cancelled) {
        setPreferences(localPreferences);
      }

      if (!isSupabaseConfigured()) {
        if (!cancelled) {
          setBackendMode("local");
          setSyncState("local");
          setIsHydrated(true);
        }
        return;
      }

      try {
        const client = getSupabaseBrowserClient();
        clientRef.current = client;
        if (!cancelled) {
          setBackendMode("supabase");
          setSyncState("syncing");
        }

        const remote = await fetchPreferencesFromSupabase(client);
        const remotePreferences = remote?.preferences;
        const localChanged =
          JSON.stringify(localPreferences) !== JSON.stringify(defaultPreferences);
        const remoteChanged =
          JSON.stringify(remotePreferences ?? defaultPreferences) !==
          JSON.stringify(defaultPreferences);

        if (!cancelled) {
          if (remotePreferences && !localChanged && remoteChanged) {
            setPreferences(remotePreferences);
          } else if (localChanged) {
            await savePreferencesToSupabase(client, localPreferences);
          }

          canSyncRef.current = true;
          setSyncState("synced");
        }
      } catch {
        if (!cancelled) {
          setSyncState("error");
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    void hydratePreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.locale === "zh" ? "zh-CN" : "en";

    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences, isHydrated]);

  useEffect(() => {
    if (
      !isHydrated ||
      backendMode !== "supabase" ||
      !clientRef.current ||
      !canSyncRef.current
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSyncState("syncing");
        await savePreferencesToSupabase(clientRef.current!, preferences);
        setSyncState("synced");
      } catch {
        setSyncState("error");
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [preferences, isHydrated, backendMode]);

  const value: PreferencesContextValue = {
    ...preferences,
    backendMode,
    syncState,
    setTheme(theme) {
      setPreferences((current) => ({ ...current, theme }));
    },
    setLocale(locale) {
      setPreferences((current) => ({ ...current, locale }));
    },
    toggleTeam(teamId) {
      setPreferences((current) => {
        const exists = current.followedTeams.includes(teamId);
        return {
          ...current,
          followedTeams: exists
            ? current.followedTeams.filter((item) => item !== teamId)
            : [...current.followedTeams, teamId],
        };
      });
    },
    toggleCompetition(competitionId) {
      setPreferences((current) => {
        const exists = current.followedCompetitions.includes(competitionId);
        return {
          ...current,
          followedCompetitions: exists
            ? current.followedCompetitions.filter((item) => item !== competitionId)
            : [...current.followedCompetitions, competitionId],
        };
      });
    },
    setNotification(key, enabled) {
      setPreferences((current) => ({
        ...current,
        notifications: {
          ...current.notifications,
          [key]: enabled,
        },
      }));
    },
    resetPreferences() {
      setPreferences(defaultPreferences);
    },
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error("useAppPreferences must be used within PreferencesProvider");
  }

  return context;
}

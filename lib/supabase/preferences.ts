"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import { defaultPreferences } from "@/lib/data";
import { shouldUseAnonymousAuth } from "@/lib/supabase/env";
import type { Locale, ThemeMode, UserPreferencesState } from "@/lib/types";

const TABLE_NAME = "user_preferences";

export type PreferencesSyncStatus = "local" | "syncing" | "synced" | "error";

interface UserPreferencesRow {
  id: string;
  followed_team_ids: string[] | null;
  followed_competition_ids: string[] | null;
  language: Locale | null;
  theme: ThemeMode | null;
  pre_match_alert: boolean | null;
  daily_digest: boolean | null;
  is_pro: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export function mergePreferences(
  base: UserPreferencesState,
  partial?: Partial<UserPreferencesState> | null
): UserPreferencesState {
  if (!partial) {
    return base;
  }

  return {
    ...base,
    ...partial,
    notifications: {
      ...base.notifications,
      ...partial.notifications,
    },
  };
}

export function parseStoredPreferences(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    return mergePreferences(defaultPreferences, JSON.parse(raw) as Partial<UserPreferencesState>);
  } catch {
    return null;
  }
}

export function mapRowToPreferences(row: UserPreferencesRow | null | undefined) {
  if (!row) {
    return null;
  }

  return mergePreferences(defaultPreferences, {
    theme: row.theme ?? defaultPreferences.theme,
    locale: row.language ?? defaultPreferences.locale,
    followedTeams: row.followed_team_ids ?? defaultPreferences.followedTeams,
    followedCompetitions:
      row.followed_competition_ids ?? defaultPreferences.followedCompetitions,
    notifications: {
      preMatch: row.pre_match_alert ?? defaultPreferences.notifications.preMatch,
      dailyDigest: row.daily_digest ?? defaultPreferences.notifications.dailyDigest,
    },
  });
}

export function mapPreferencesToRow(
  userId: string,
  preferences: UserPreferencesState
): UserPreferencesRow {
  return {
    id: userId,
    followed_team_ids: preferences.followedTeams,
    followed_competition_ids: preferences.followedCompetitions,
    language: preferences.locale,
    theme: preferences.theme,
    pre_match_alert: preferences.notifications.preMatch,
    daily_digest: preferences.notifications.dailyDigest,
    is_pro: false,
  };
}

export async function ensureSupabaseUser(client: SupabaseClient) {
  const sessionResult = await client.auth.getSession();
  const existingUser = sessionResult.data.session?.user ?? null;

  if (existingUser) {
    return existingUser.id;
  }

  if (!shouldUseAnonymousAuth()) {
    return null;
  }

  const authResult = await client.auth.signInAnonymously();
  return authResult.data.user?.id ?? null;
}

export async function fetchPreferencesFromSupabase(client: SupabaseClient) {
  const userId = await ensureSupabaseUser(client);

  if (!userId) {
    return null;
  }

  const result = await client
    .from(TABLE_NAME)
    .select("*")
    .eq("id", userId)
    .maybeSingle<UserPreferencesRow>();

  if (result.error) {
    throw result.error;
  }

  return {
    userId,
    preferences: mapRowToPreferences(result.data),
  };
}

export async function savePreferencesToSupabase(
  client: SupabaseClient,
  preferences: UserPreferencesState
) {
  const userId = await ensureSupabaseUser(client);

  if (!userId) {
    return null;
  }

  const payload = mapPreferencesToRow(userId, preferences);
  const result = await client.from(TABLE_NAME).upsert(payload).select("id").single();

  if (result.error) {
    throw result.error;
  }

  return result.data.id;
}

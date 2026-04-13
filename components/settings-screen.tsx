"use client";

import { MyControlsBar } from "@/components/my-controls-bar";
import { useAppPreferences } from "@/components/preferences-provider";
import { messages } from "@/lib/i18n";

export function SettingsScreen() {
  const {
    locale,
    notifications,
    backendMode,
    syncState,
    setNotification,
    resetPreferences,
  } = useAppPreferences();
  const copy = messages[locale];

  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="page-block-header">
          <div className="page-block-header__title">{copy.settings.title}</div>
          <div className="page-block-header__meta">{copy.settings.description}</div>
        </div>

        <MyControlsBar active="settings" />

        <div className="sonar-panel">
          <div className="info-grid info-grid--two">
            <div className="info-card">
              <div className="info-card__title">{copy.settings.notifications}</div>
              <div className="list-stack">
                <button
                  type="button"
                  className={`list-row list-row--button${notifications.preMatch ? " list-row--active" : ""}`}
                  onClick={() => setNotification("preMatch", !notifications.preMatch)}
                >
                  <div className="list-row__content">
                    <div className="list-row__title">{copy.my.preMatch}</div>
                    <div className="list-row__meta">Push</div>
                  </div>
                  <span className="list-row__status list-row__status--fresh">
                    {notifications.preMatch ? "On" : "Off"}
                  </span>
                </button>
                <button
                  type="button"
                  className={`list-row list-row--button${notifications.dailyDigest ? " list-row--active" : ""}`}
                  onClick={() => setNotification("dailyDigest", !notifications.dailyDigest)}
                >
                  <div className="list-row__content">
                    <div className="list-row__title">{copy.my.digest}</div>
                    <div className="list-row__meta">Daily</div>
                  </div>
                  <span className="list-row__status list-row__status--fresh">
                    {notifications.dailyDigest ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>

            <div className="info-card">
              <div className="info-card__title">{copy.settings.build}</div>
              <div className="list-stack">
                <div className="list-row">
                  <div className="list-row__content">
                    <div className="list-row__title">Data mode</div>
                    <div className="list-row__meta">
                      {backendMode === "supabase" ? "Supabase" : "Local"}
                    </div>
                  </div>
                  <span className="list-row__status list-row__status--fresh">
                    {syncState}
                  </span>
                </div>
                <button type="button" className="settings-reset" onClick={resetPreferences}>
                  {locale === "zh" ? "重置本地偏好" : "Reset local preferences"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

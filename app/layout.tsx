import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PreferencesProvider } from "@/components/preferences-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "SonarFC",
  description: "Pre-match condition sonar for football fans, fantasy players and bettors.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <PreferencesProvider>
          <AppShell>{children}</AppShell>
        </PreferencesProvider>
      </body>
    </html>
  );
}

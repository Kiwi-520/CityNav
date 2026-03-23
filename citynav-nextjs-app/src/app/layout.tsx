import type { ReactNode } from "react";
import PwaRegister from "@/app/pwa-register";
import BottomNavigation from "@/components/BottomNavigation";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import WelcomeAuthPrompt from "@/components/WelcomeAuthPrompt";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2E7D5E" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthSessionProvider>
          <PwaRegister />
          <WelcomeAuthPrompt />
          <main style={{ paddingBottom: "60px" }}>{children}</main>
          <BottomNavigation />
        </AuthSessionProvider>
      </body>
    </html>
  );
}

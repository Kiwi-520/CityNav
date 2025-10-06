import type { ReactNode } from 'react';
import PwaRegister from "@/app/pwa-register";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4a90e2" />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}


import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/Header";

export const metadata: Metadata = {
  title: "CityNav - Urban Navigation Assistant",
  description: "Smart city navigation app for urban travelers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CityNav"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0070f3"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}

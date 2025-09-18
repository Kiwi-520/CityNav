import './globals.css'

export const metadata = {
  title: "CityNav",
  description: "Your urban navigation assistant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/icon-192x192.svg" sizes="192x192" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
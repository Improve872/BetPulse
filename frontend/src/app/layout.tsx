import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "BetPulse — Apuestas simuladas de Dota 2",
  description:
    "Partidas en vivo, resultados y cuotas propias de Dota 2 con saldo ficticio.",
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

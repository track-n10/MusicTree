import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Link Finder — links por ISRC",
  description: "Cole um ISRC ou busque por nome e abra a música em Spotify, Apple Music, YouTube e outras plataformas."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

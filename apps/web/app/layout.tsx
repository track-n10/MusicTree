import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Music Link Finder",
  description: "Find music links and metadata across streaming platforms."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

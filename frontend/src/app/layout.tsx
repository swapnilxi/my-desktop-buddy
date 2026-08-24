import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HamsterDesk — AI Desktop Pet & Productivity Assistant",
  description:
    "Meet Hammy, your cute animated hamster desktop companion. AI chatbot, to-do manager, voice assistant, and more!",
  keywords: ["AI assistant", "desktop pet", "hamster", "productivity", "chatbot"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

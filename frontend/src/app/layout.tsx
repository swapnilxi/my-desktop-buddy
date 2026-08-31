import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desktop Buddy — AI Desktop Companions & Productivity Assistant",
  description:
    "Meet your cute animated desktop companions (Hammy the Hamster & Bambu the Panda). AI chatbot, to-do manager, voice assistant, and focus buddy!",
  keywords: ["AI assistant", "desktop pet", "desktop buddy", "hamster", "panda", "productivity", "chatbot"],
  icons: {
    icon: "/icon.png",
  },
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
      <body>
        {children}
        <audio id="flute-bg-music" src="/flute.mp3" loop />
      </body>
    </html>
  );
}

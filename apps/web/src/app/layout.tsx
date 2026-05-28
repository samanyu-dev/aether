import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aether-observatory.vercel.app"),
  title: "Aether 🌌 — Local-First AI Cognition Debugger & Visual Replay Workspace",
  description:
    "Watch AI agents think in realtime. Inspect reasoning trees, replay cognition sessions, trace tools, and debug hallucinations in a local-first cognition debugger.",
  keywords: [
    "AI debugger",
    "agent debugging",
    "reasoning visualization",
    "LLM tracing",
    "cognition replay",
    "Aether AI",
  ],
  openGraph: {
    title: "Aether 🌌 — Local-First AI Cognition Debugger & Visual Replay Workspace",
    description:
      "Watch AI agents think in realtime. Inspect reasoning trees, replay cognition sessions, trace tools, and debug hallucinations in a local-first cognition debugger.",
    url: "https://aether-observatory.vercel.app",
    siteName: "Aether",
    images: [
      {
        url: "/docs/assets/hero_hallucination.png",
        width: 1200,
        height: 630,
        alt: "Aether AI Cognition Debugger Replay Screen",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aether 🌌 — Local-First AI Cognition Debugger & Visual Replay Workspace",
    description:
      "Watch AI agents think in realtime. Inspect reasoning trees, replay cognition sessions, trace tools, and debug hallucinations in a local-first cognition debugger.",
    images: ["/docs/assets/hero_hallucination.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col noise-overlay">
        {children}
      </body>
    </html>
  );
}

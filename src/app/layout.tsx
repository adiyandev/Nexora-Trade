import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";
import "./design-tokens.css";
import "./terminal-shell.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nexora-trade-bice.vercel.app"),
  title: { default: "NexoraTrade — Simulated Trading Workspace", template: "%s | NexoraTrade" },
  description: "Practice simulated market orders, manage a virtual portfolio, explore fictional instruments, and learn trading fundamentals. No real-money trading.",
  applicationName: "NexoraTrade",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "NexoraTrade — Simulated Trading Workspace",
    description: "A focused environment to learn trading with a virtual portfolio. No deposits or real-money orders.",
    url: "https://nexora-trade-bice.vercel.app",
    siteName: "NexoraTrade",
    type: "website",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "NexoraTrade simulated trading workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexoraTrade — Simulated Trading Workspace",
    description: "Practice trading with a virtual portfolio. No real-money orders.",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}

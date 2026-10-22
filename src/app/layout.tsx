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
  icons: { icon: "/logos/nexoratrade-mark.jpg", shortcut: "/logos/nexoratrade-mark.jpg" },
  openGraph: {
    title: "NexoraTrade — Simulated Trading Workspace",
    description: "A focused environment to learn trading with a virtual portfolio. No deposits or real-money orders.",
    url: "https://nexora-trade-bice.vercel.app",
    siteName: "NexoraTrade",
    type: "website",
    images: [{ url: "/logos/nexoratrade-expanded.jpg", alt: "NexoraTrade" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NexoraTrade — Simulated Trading Workspace",
    description: "Practice trading with a virtual portfolio. No real-money orders.",
    images: ["/logos/nexoratrade-expanded.jpg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}

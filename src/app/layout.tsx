import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexoraTrade — Practice trading, risk-free",
  description: "Learn cryptocurrency markets with a virtual portfolio. No real-money trading.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, ChartNoAxesCombined, CircleHelp, LayoutDashboard, Settings, Wallet } from "lucide-react";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: ChartNoAxesCombined },
  { href: "/trade", label: "Trade", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/academy", label: "Academy", icon: BookOpen },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
];
export function AppShell({ children }: { children: React.ReactNode }) {
 const pathname=usePathname();
 return <div className="shell"><aside className="sidebar"><Link className="brand" href="/">Nexora<span>Trade</span></Link><nav className="nav" aria-label="Main navigation">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":""}><Icon size={16} style={{display:"inline",marginRight:10,verticalAlign:"-3px"}}/>{label}</Link>)}</nav><div className="sidebar-note"><b>Demo environment</b><br/>Practice with virtual funds. No real assets or money are involved.<br/><br/><CircleHelp size={14} style={{display:"inline",verticalAlign:"-3px",marginRight:5}}/> Learn at your own pace.</div></aside><main className="main"><div className="topbar"><div><div className="eyebrow">Paper trading workspace</div></div><span className="pill">● Demo account</span></div>{children}</main></div>;
}

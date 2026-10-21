import { AccountView } from "@neondatabase/auth-ui";
import { accountViewPaths } from "@neondatabase/auth-ui/server";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.values(accountViewPaths).map((path) => ({ path }));
}

export default async function AccountPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!Object.values(accountViewPaths).includes(path as (typeof accountViewPaths)[keyof typeof accountViewPaths])) notFound();
  return <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12"><AccountView path={path as (typeof accountViewPaths)[keyof typeof accountViewPaths]} /></main>;
}

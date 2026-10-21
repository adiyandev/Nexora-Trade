import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  if (!Object.values(authViewPaths).includes(path as (typeof authViewPaths)[keyof typeof authViewPaths])) notFound();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-neutral-950">← Back to NexoraTrade</Link>
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <AuthView path={path as (typeof authViewPaths)[keyof typeof authViewPaths]} />
      </div>
      <p className="max-w-md text-center text-xs leading-5 text-neutral-500">NexoraTrade is a paper-trading learning app. Authentication does not enable real-money trading.</p>
    </main>
  );
}

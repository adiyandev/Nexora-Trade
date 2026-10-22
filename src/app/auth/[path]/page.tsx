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
    <main className="auth-page">
      <header className="auth-header">
        <Link href="/" className="auth-brand" aria-label="NexoraTrade home">
          <span className="auth-brand-symbol" aria-hidden="true">N</span>
          <span>Nexora<span>Trade</span></span>
        </Link>
        <Link href="/" className="auth-back-link">Back to home</Link>
      </header>
      <section className="auth-main">
        <div className="auth-context">
          <span className="auth-context-label">NEXORATRADE ACCOUNT</span>
          <h1>Practice with a clearer view.</h1>
          <p>Your account keeps your virtual portfolio, saved markets and learning progress together.</p>
          <div className="auth-context-note"><span className="auth-context-status" /><span>Paper trading only</span><span className="auth-context-divider" /><span>No deposits or real-money orders</span></div>
        </div>
        <div className="auth-panel">
          <div className="auth-panel-heading"><span>ACCOUNT ACCESS</span><span>SECURE SIGN-IN</span></div>
          <div className="auth-form-card"><AuthView path={path as (typeof authViewPaths)[keyof typeof authViewPaths]} /></div>
          <p className="auth-panel-footnote">Never share your verification code with anyone.</p>
        </div>
      </section>
      <footer className="auth-footer"><span>© {new Date().getFullYear()} NexoraTrade</span><span>Educational trading simulation</span></footer>
    </main>
  );
}

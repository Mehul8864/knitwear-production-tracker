import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl font-bold text-[var(--text-muted)]">404</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Page not found</h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--navy)] text-white text-sm font-medium hover:bg-[var(--navy-light)] transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

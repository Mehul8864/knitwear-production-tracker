import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign In — StitchOps' }

const FEATURES = [
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 mt-0.5" aria-hidden="true">
        <path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 4-6" />
      </svg>
    ),
    title: 'Real-time run-rate tracking',
    desc: 'Know your production velocity before it becomes a crisis.',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 mt-0.5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    title: 'Multi-unit coordination',
    desc: 'Supervisors update from the factory floor. You see it instantly.',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 mt-0.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h4M18 12h4M12 2v4M12 18v4" />
      </svg>
    ),
    title: 'Buyer transparency portal',
    desc: 'Share verified progress with international buyers, without the emails.',
  },
  {
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 mt-0.5" aria-hidden="true">
        <path d="M18.364 5.636A9 9 0 1 1 5.636 18.364" /><polyline points="15 2 22 2 22 9" />
      </svg>
    ),
    title: 'Offline-first mobile',
    desc: 'Works on poor connectivity. Updates sync automatically when back online.',
  },
]

export default function LoginPage() {
  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-base)' }}>
      {/* ─── Left panel — branding ─── */}
      <div
        className="hidden lg:flex lg:w-[460px] xl:w-[520px] flex-col justify-between p-12 relative overflow-hidden shrink-0"
        style={{ background: 'var(--navy)' }}
      >
        {/* Subtle mesh pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 20%, rgba(79,110,247,0.12) 0%, transparent 60%),
              radial-gradient(circle at 80% 80%, rgba(16,185,129,0.06) 0%, transparent 60%)
            `,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        />
        {/* Grid dots */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
          aria-hidden="true"
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.16)' }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <span className="text-white font-semibold text-[19px] tracking-[-0.015em]">StitchOps</span>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Production visibility.<br />Without the chasing.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-5">
          {FEATURES.map(f => (
            <div key={f.title} className="flex gap-3.5">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>{f.icon}</span>
              <div>
                <p className="text-white font-medium text-[13.5px] leading-snug">{f.title}</p>
                <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[11.5px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            © 2026 StitchOps · Tiruppur, Tamil Nadu, India
          </p>
        </div>
      </div>

      {/* ─── Right panel — login form ─── */}
      <div
        className="flex-1 flex items-center justify-center p-5 sm:p-8"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--navy)' }}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-[17px] tracking-[-0.012em]" style={{ color: 'var(--text-primary)' }}>
              StitchOps
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1
              className="text-[24px] font-bold tracking-[-0.022em]"
              style={{ color: 'var(--text-primary)' }}
            >
              Welcome back
            </h1>
            <p className="text-[13.5px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Sign in to your production workspace
            </p>
          </div>

          {/* Form */}
          <LoginForm />

          {/* Demo credentials */}
          <div
            className="mt-7 rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-xs)' }}
          >
            <div
              className="px-4 py-2.5"
              style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)' }}
            >
              <p className="text-label-caps">Demo credentials</p>
            </div>
            <div className="bg-white divide-y divide-[var(--border-light)]">
              {[
                { role: 'Merchandiser',     email: 'merchandiser@stitchops.demo', password: 'Demo@2026!' },
                { role: 'Supervisor',       email: 'supervisor@stitchops.demo',   password: 'Demo@2026!' },
                { role: 'Buyer (Company B)',email: 'buyer-b@stitchops.demo',      password: 'Demo@2026!' },
              ].map(cred => (
                <div key={cred.role} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{cred.role}</p>
                    <p className="text-[11.5px] text-mono-sm truncate" style={{ color: 'var(--text-muted)' }}>{cred.email}</p>
                  </div>
                  <span className="text-[11.5px] text-mono-sm shrink-0" style={{ color: 'var(--text-faint)' }}>
                    {cred.password}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

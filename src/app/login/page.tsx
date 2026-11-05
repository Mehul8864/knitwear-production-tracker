import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'var(--navy)' }}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z"
                  fill="white"
                  fillOpacity="0.9"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">StitchOps</span>
          </div>
          <p className="text-white/60 text-sm">Production visibility. Without the chasing.</p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-6">
          {[
            {
              icon: '📊',
              title: 'Real-time run-rate tracking',
              desc: 'Know your production velocity before it becomes a crisis.',
            },
            {
              icon: '🏭',
              title: 'Multi-unit coordination',
              desc: 'Supervisors update from the factory floor. You see it instantly.',
            },
            {
              icon: '🌐',
              title: 'Buyer transparency portal',
              desc: 'Share verified progress with international buyers — without the emails.',
            },
            {
              icon: '⚡',
              title: 'Offline-first mobile',
              desc: 'Works even on poor factory floor connectivity. Syncs when back online.',
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-3.5">
              <span className="text-lg mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white font-medium text-sm">{f.title}</p>
                <p className="text-white/50 text-sm mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-white/30 text-xs">
            © 2026 StitchOps · Tiruppur, Tamil Nadu, India
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg-base)]">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-[var(--navy)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 7v11h5v-6h4v6h5V7L10 2z" fill="white" />
              </svg>
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-lg tracking-tight">StitchOps</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              Welcome back
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1.5">
              Sign in to your production workspace
            </p>
          </div>

          <LoginForm />

          {/* Demo credentials */}
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Demo credentials
            </p>
            <div className="space-y-2">
              {[
                { role: 'Merchandiser', email: 'merchandiser@stitchops.demo', password: 'Demo@2026!' },
                { role: 'Supervisor', email: 'supervisor@stitchops.demo', password: 'Demo@2026!' },
                { role: 'Buyer (Company B)', email: 'buyer-b@stitchops.demo', password: 'Demo@2026!' },
              ].map((cred) => (
                <div key={cred.role} className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)]">{cred.role}</p>
                    <p className="text-xs text-[var(--text-muted)] font-mono">{cred.email}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)] font-mono shrink-0">{cred.password}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

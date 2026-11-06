'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } =
    useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginValues) {
    setServerError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'Incorrect email or password. Please try again.'
          : error.message
      )
      return
    }
    toast.success('Signed in successfully')
    router.push('/dashboard')
    router.refresh()
  }

  function fillDemo(email: string, password: string) {
    setValue('email', email)
    setValue('password', password)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          className="flex items-start gap-2.5 p-3.5 rounded-[var(--radius-md)] text-[13px]"
          style={{
            background: 'var(--red-bg)',
            border: '1px solid var(--red-border)',
            color: 'var(--red-text)',
          }}
          role="alert"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Email address
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          error={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-[12px] flex items-center gap-1" style={{ color: 'var(--red)' }}>
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          Password
        </Label>
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={!!errors.password}
          suffixSlot={
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[15px] w-[15px]" /> : <Eye className="h-[15px] w-[15px]" />}
            </button>
          }
          {...register('password')}
        />
        {errors.password && (
          <p className="text-[12px] flex items-center gap-1" style={{ color: 'var(--red)' }}>
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>

      {/* Quick fill */}
      <div>
        <p className="text-[11.5px] mb-2" style={{ color: 'var(--text-faint)' }}>Quick fill demo account:</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: 'Merchandiser', email: 'merchandiser@stitchops.demo', password: 'Demo@2026!' },
            { label: 'Supervisor',   email: 'supervisor@stitchops.demo',   password: 'Demo@2026!' },
            { label: 'Buyer',        email: 'buyer-b@stitchops.demo',      password: 'Demo@2026!' },
          ].map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => fillDemo(c.email, c.password)}
              className="text-[11.5px] px-2.5 py-1 rounded-[var(--radius-sm)] border transition-all duration-150"
              style={{
                border: '1px solid var(--border)',
                background: 'white',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  )
}

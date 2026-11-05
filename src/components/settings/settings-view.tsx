'use client'

import { useState } from 'react'
import { Copy, Check, ExternalLink, AlertTriangle, CheckCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Profile, Buyer, ProductionUnit, BuyerAccessToken } from '@/types/database'

interface TokenWithBuyer extends BuyerAccessToken {
  buyer: { name: string } | null
}

interface SettingsViewProps {
  profile: Profile | null
  buyers: Buyer[]
  units: ProductionUnit[]
  tokens: TokenWithBuyer[]
  aiConfigured: boolean
}

export function SettingsView({ profile, buyers, units, tokens, aiConfigured }: SettingsViewProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [newTokens, setNewTokens] = useState<{ buyerId: string; url: string }[]>([])

  async function copyToClipboard(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Copied to clipboard')
  }

  async function generateBuyerLink(buyerId: string, buyerName: string) {
    setGeneratingToken(true)
    try {
      const res = await fetch('/api/buyer-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: buyerId, label: `${buyerName} portal link` }),
      })
      if (!res.ok) throw new Error('Failed to generate link')
      const { token } = await res.json()
      const url = `${window.location.origin}/buyer/${token}`
      setNewTokens((prev) => [...prev, { buyerId, url }])
      toast.success('Buyer access link generated')
    } catch {
      toast.error('Failed to generate link')
    } finally {
      setGeneratingToken(false)
    }
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="buyers">Buyers</TabsTrigger>
        <TabsTrigger value="units">Production Units</TabsTrigger>
        <TabsTrigger value="access">Buyer Access Links</TabsTrigger>
        <TabsTrigger value="ai">AI Configuration</TabsTrigger>
      </TabsList>

      {/* Profile */}
      <TabsContent value="profile">
        <Card>
          <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Full Name', value: profile?.full_name },
              { label: 'Email', value: profile?.email },
              { label: 'Role', value: profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : '—' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
                <span className="text-sm text-[var(--text-muted)]">{item.label}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Buyers */}
      <TabsContent value="buyers">
        <Card>
          <CardHeader><CardTitle>Registered Buyers</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)]">
              {buyers.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{b.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{b.country}</p>
                  </div>
                  <Badge variant="default">{b.country}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Units */}
      <TabsContent value="units">
        <Card>
          <CardHeader><CardTitle>Production Units</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-[var(--border)]">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{u.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{u.location}</p>
                  </div>
                  <span className="text-xs text-[var(--text-muted)]">
                    Capacity: {u.capacity_per_day.toLocaleString()} pcs/day
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Buyer Access Links */}
      <TabsContent value="access">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate Buyer Access Link</CardTitle>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Each buyer gets a unique, secure, read-only link. Links are scoped to that buyer&apos;s orders only.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {buyers.map((b) => {
                  const newTokenUrl = newTokens.find((t) => t.buyerId === b.id)?.url
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{b.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{b.country}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {newTokenUrl ? (
                          <>
                            <code className="text-xs bg-white border border-[var(--border)] px-2 py-1 rounded-lg text-[var(--text-muted)] max-w-[240px] truncate">
                              {newTokenUrl}
                            </code>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(newTokenUrl, b.id)}
                            >
                              {copied === b.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <a href={newTokenUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="icon-sm" variant="ghost">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => generateBuyerLink(b.id, b.name)}
                            loading={generatingToken}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Generate Link
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {tokens.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Existing Access Tokens</CardTitle></CardHeader>
              <CardContent>
                <div className="divide-y divide-[var(--border)]">
                  {tokens.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {(t.buyer as { name: string } | null)?.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Created {formatDate(t.created_at)}
                          {t.expires_at && ` · Expires ${formatDate(t.expires_at)}`}
                        </p>
                      </div>
                      {t.revoked_at ? (
                        <Badge variant="red">Revoked</Badge>
                      ) : (
                        <Badge variant="green">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* AI Configuration */}
      <TabsContent value="ai">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {aiConfigured ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <CardTitle>AI Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded-xl border ${aiConfigured ? 'border-emerald-200 bg-[var(--green-bg)]' : 'border-amber-200 bg-[var(--amber-bg)]'}`}>
              <p className="font-medium text-sm">
                {aiConfigured ? 'AI is configured and active' : 'AI is not configured'}
              </p>
              <p className="text-sm mt-1 text-[var(--text-secondary)]">
                {aiConfigured
                  ? 'Tamil text translation, voice transcription, and issue classification are all available.'
                  : 'Set OPENAI_API_KEY in your environment to enable Tamil translation, voice transcription, and automatic issue classification. Manual category selection is available without AI.'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text-secondary)]">Required environment variables:</p>
              {[
                { name: 'OPENAI_API_KEY', desc: 'Your OpenAI API key (required for all AI features)' },
                { name: 'OPENAI_MODEL', desc: 'Classification model (default: gpt-4o-mini)' },
                { name: 'WHISPER_MODEL', desc: 'Transcription model (default: whisper-1)' },
              ].map((v) => (
                <div key={v.name} className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)]">
                  <code className="text-xs font-mono text-[var(--accent)] shrink-0">{v.name}</code>
                  <span className="text-xs text-[var(--text-muted)]">{v.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

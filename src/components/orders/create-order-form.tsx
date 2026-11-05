'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Buyer, ProductionUnit, TNATemplate, TNATemplateMilestone } from '@/types/database'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const orderSchema = z.object({
  po_number: z.string().min(1, 'PO number is required').max(50),
  buyer_id: z.string().uuid('Select a buyer'),
  style_name: z.string().min(1, 'Style name is required').max(100),
  style_description: z.string().max(500).optional(),
  production_unit_id: z.string().uuid('Select a production unit'),
  ex_factory_date: z.string().min(1, 'Ex-factory date is required'),
  notes: z.string().max(1000).optional(),
  tna_template_id: z.string().optional(),
})
type OrderValues = z.infer<typeof orderSchema>

interface SizeEntry {
  colour: string
  sizes: Record<string, number>
}

interface TNATemplateWithMilestones extends TNATemplate {
  milestones: TNATemplateMilestone[]
}

interface CreateOrderFormProps {
  buyers: Buyer[]
  units: ProductionUnit[]
  templates: TNATemplateWithMilestones[]
}

export function CreateOrderForm({ buyers, units, templates }: CreateOrderFormProps) {
  const router = useRouter()
  const [sizeEntries, setSizeEntries] = useState<SizeEntry[]>([
    { colour: '', sizes: Object.fromEntries(SIZES.map((s) => [s, 0])) },
  ])
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
  })

  const exFactoryDate = watch('ex_factory_date')
  const templateId = watch('tna_template_id')

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  )

  const previewMilestones = useMemo(() => {
    if (!selectedTemplate || !exFactoryDate) return []
    const exFactory = new Date(exFactoryDate)
    return selectedTemplate.milestones
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => {
        const d = new Date(exFactory)
        d.setDate(d.getDate() - m.days_before_exfactory)
        return { ...m, computed_date: d.toISOString().split('T')[0] }
      })
  }, [selectedTemplate, exFactoryDate])

  const totalQuantity = useMemo(() => {
    return sizeEntries.reduce((sum, entry) => {
      return sum + Object.values(entry.sizes).reduce((s, v) => s + (v || 0), 0)
    }, 0)
  }, [sizeEntries])

  function addColour() {
    setSizeEntries((prev) => [
      ...prev,
      { colour: '', sizes: Object.fromEntries(SIZES.map((s) => [s, 0])) },
    ])
  }

  function removeColour(i: number) {
    setSizeEntries((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateColour(i: number, colour: string) {
    setSizeEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, colour } : e)))
  }

  function updateSize(i: number, size: string, value: string) {
    const n = parseInt(value) || 0
    setSizeEntries((prev) =>
      prev.map((e, idx) =>
        idx === i ? { ...e, sizes: { ...e.sizes, [size]: n } } : e
      )
    )
  }

  async function onSubmit(data: OrderValues) {
    // Validate colours
    const validEntries = sizeEntries.filter(
      (e) => e.colour.trim() && Object.values(e.sizes).some((v) => v > 0)
    )
    if (validEntries.length === 0) {
      toast.error('Please add at least one colour with quantities')
      return
    }
    if (totalQuantity === 0) {
      toast.error('Total quantity must be greater than 0')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          total_quantity: totalQuantity,
          items: validEntries.flatMap((e) =>
            SIZES.filter((s) => (e.sizes[s] ?? 0) > 0).map((s) => ({
              colour: e.colour,
              size: s,
              quantity: e.sizes[s],
            }))
          ),
          milestones: previewMilestones.map((m) => ({
            stage: m.stage,
            name: m.name,
            target_date: m.computed_date,
            sort_order: m.sort_order,
            target_quantity: totalQuantity,
            completed_quantity: 0,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to create order')
      }

      const { id } = await res.json()
      toast.success('Order created successfully')
      router.push(`/dashboard/orders/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>PO Number *</Label>
              <Input
                placeholder="e.g. B-PO-88213"
                error={!!errors.po_number}
                {...register('po_number')}
              />
              {errors.po_number && <p className="text-xs text-red-600">{errors.po_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Buyer *</Label>
              <Select onValueChange={(v) => setValue('buyer_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select buyer" />
                </SelectTrigger>
                <SelectContent>
                  {buyers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.buyer_id && <p className="text-xs text-red-600">{errors.buyer_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Style Name *</Label>
              <Input
                placeholder="e.g. Men's crew neck tee, navy"
                error={!!errors.style_name}
                {...register('style_name')}
              />
              {errors.style_name && <p className="text-xs text-red-600">{errors.style_name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Production Unit *</Label>
              <Select onValueChange={(v) => setValue('production_unit_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.production_unit_id && <p className="text-xs text-red-600">{errors.production_unit_id.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Ex-factory Date *</Label>
              <Input
                type="date"
                error={!!errors.ex_factory_date}
                {...register('ex_factory_date')}
              />
              {errors.ex_factory_date && <p className="text-xs text-red-600">{errors.ex_factory_date.message}</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Style Description</Label>
            <Textarea
              placeholder="Brief description of the style..."
              {...register('style_description')}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Any special instructions or notes..."
              {...register('notes')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Colour / Size Matrix */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Colour / Size Quantity Matrix</CardTitle>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Total order quantity:{' '}
                <strong className="text-[var(--text-primary)]">
                  {totalQuantity.toLocaleString()} pcs
                </strong>
              </p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={addColour}>
              <Plus className="h-4 w-4" />
              Add Colour
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    Colour
                  </th>
                  {SIZES.map((s) => (
                    <th key={s} className="text-center py-2 px-2 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-20">
                      {s}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-4 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {sizeEntries.map((entry, i) => {
                  const rowTotal = Object.values(entry.sizes).reduce((s, v) => s + (v || 0), 0)
                  return (
                    <tr key={i}>
                      <td className="py-2 pr-4">
                        <Input
                          placeholder="e.g. Navy"
                          value={entry.colour}
                          onChange={(e) => updateColour(i, e.target.value)}
                          className="w-28"
                        />
                      </td>
                      {SIZES.map((s) => (
                        <td key={s} className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            min={0}
                            value={entry.sizes[s] || ''}
                            onChange={(e) => updateSize(i, s, e.target.value)}
                            className="w-16 text-center"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="py-2 pl-4 text-right font-bold text-[var(--text-primary)]">
                        {rowTotal.toLocaleString()}
                      </td>
                      <td className="py-2 pl-2">
                        {sizeEntries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColour(i)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-[var(--red-bg)] transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--bg-subtle)]">
                  <td className="py-2 pr-4 font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    Total
                  </td>
                  {SIZES.map((s) => {
                    const colTotal = sizeEntries.reduce((sum, e) => sum + (e.sizes[s] || 0), 0)
                    return (
                      <td key={s} className="py-2 px-2 text-center font-semibold text-[var(--text-primary)]">
                        {colTotal.toLocaleString()}
                      </td>
                    )
                  })}
                  <td className="py-2 pl-4 text-right font-bold text-[var(--text-primary)]">
                    {totalQuantity.toLocaleString()}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* TNA Template */}
      <Card>
        <CardHeader>
          <CardTitle>TNA Template</CardTitle>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Select a template to auto-generate milestone dates from the ex-factory date
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>TNA Template</Label>
            <Select onValueChange={(v) => setValue('tna_template_id', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template (optional)" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewMilestones.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <div className="bg-[var(--bg-subtle)] px-4 py-2.5 border-b border-[var(--border)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Generated Milestones Preview
                </p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {previewMilestones.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-[var(--text-secondary)]">{m.name}</span>
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {new Date(m.computed_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Create Order
        </Button>
      </div>
    </form>
  )
}

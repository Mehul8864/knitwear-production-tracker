import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OrderItem } from '@/types/database'

interface ColourSizeMatrixProps {
  items: OrderItem[]
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', 'Free Size', 'One Size']

export function ColourSizeMatrix({ items }: ColourSizeMatrixProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">No size/colour data</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Colour and size breakdown will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  // Build matrix
  const colours = [...new Set(items.map((i) => i.colour))].sort()
  const sizes = [...new Set(items.map((i) => i.size))].sort(
    (a, b) => (SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)) || a.localeCompare(b)
  )

  const matrix: Record<string, Record<string, number>> = {}
  for (const item of items) {
    if (!matrix[item.colour]) matrix[item.colour] = {}
    matrix[item.colour][item.size] = (matrix[item.colour][item.size] ?? 0) + item.quantity
  }

  const colourTotals: Record<string, number> = {}
  const sizeTotals: Record<string, number> = {}
  let grandTotal = 0

  for (const colour of colours) {
    colourTotals[colour] = 0
    for (const size of sizes) {
      const qty = matrix[colour]?.[size] ?? 0
      colourTotals[colour] += qty
      sizeTotals[size] = (sizeTotals[size] ?? 0) + qty
      grandTotal += qty
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Colour / Size Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  Colour
                </th>
                {sizes.map((s) => (
                  <th
                    key={s}
                    className="text-center py-2 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                  >
                    {s}
                  </th>
                ))}
                <th className="text-right py-2 pl-4 text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {colours.map((colour) => (
                <tr key={colour} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-[var(--border)]"
                        style={{
                          backgroundColor:
                            colour.toLowerCase() === 'white'
                              ? '#f8fafc'
                              : colour.toLowerCase() === 'navy'
                              ? '#17243A'
                              : colour.toLowerCase() === 'black'
                              ? '#1e293b'
                              : colour.toLowerCase() === 'yellow'
                              ? '#fbbf24'
                              : colour.toLowerCase() === 'red'
                              ? '#ef4444'
                              : colour.toLowerCase() === 'blue'
                              ? '#3b82f6'
                              : '#94a3b8',
                        }}
                      />
                      {colour}
                    </div>
                  </td>
                  {sizes.map((s) => (
                    <td key={s} className="py-3 px-3 text-center text-[var(--text-secondary)]">
                      {(matrix[colour]?.[s] ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="py-3 pl-4 text-right font-bold text-[var(--text-primary)]">
                    {(colourTotals[colour] ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--border-strong)] bg-[var(--bg-subtle)]">
                <td className="py-3 pr-4 font-semibold text-[var(--text-primary)] text-xs uppercase tracking-wider">
                  Total
                </td>
                {sizes.map((s) => (
                  <td key={s} className="py-3 px-3 text-center font-semibold text-[var(--text-primary)]">
                    {(sizeTotals[s] ?? 0).toLocaleString()}
                  </td>
                ))}
                <td className="py-3 pl-4 text-right font-bold text-[var(--text-primary)]">
                  {grandTotal.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * StitchOps TDD PDF Generator
 *
 * Generates TDD.pdf from TDD.md using jsPDF.
 * Fixes:
 *  - Cover page: correct live URL and date
 *  - Font encoding: all non-ASCII chars mapped to safe ASCII equivalents
 *    so helvetica (Latin-1) renders every character without broken spacing
 *  - Rupee symbol (INR) substituted for PDF-safe output
 *  - Box-drawing characters replaced with ASCII art
 *  - Unicode arrows/ticks replaced with safe ASCII
 *
 * Run: node scripts/generate-tdd-pdf.js
 */
const fs = require('fs')

// ─── Character sanitiser ─────────────────────────────────────────────────────
// Maps every known non-Latin-1 character to a PDF-safe ASCII replacement.
// jsPDF uses helvetica which covers Latin-1 (ISO 8859-1) only.
function sanitise(text) {
  return String(text)
    // Currency
    .replace(/₹/g, 'INR ')
    .replace(/€/g, 'EUR ')
    .replace(/£/g, 'GBP ')
    // Dashes & hyphens
    .replace(/—/g, '--')   // em dash
    .replace(/–/g, '-')    // en dash
    .replace(/−/g, '-')    // minus sign
    // Arrows
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/↓/g, 'v')
    .replace(/↑/g, '^')
    .replace(/▼/g, 'v')
    .replace(/▶/g, '>')
    // Comparison & math
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/÷/g, '/')
    .replace(/×/g, 'x')
    .replace(/Σ/g, 'sum')
    .replace(/~8\.75/g, 'approx 8.75')
    // Ticks & crosses
    .replace(/✓/g, '[OK]')
    .replace(/✗/g, '[X]')
    .replace(/✅/g, '[PASS]')
    .replace(/❌/g, '[FAIL]')
    .replace(/⚠/g, '[!]')
    // Box-drawing characters
    .replace(/├──/g, '+--')
    .replace(/└──/g, '+--')
    .replace(/├─/g, '+-')
    .replace(/└─/g, '+-')
    .replace(/│/g, '|')
    .replace(/─/g, '-')
    .replace(/┼/g, '+')
    // Dots & bullets
    .replace(/·/g, '-')
    .replace(/•/g, '-')
    // Quotes
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    // Ellipsis
    .replace(/…/g, '...')
    // Remaining non-ASCII (catch-all)
    .replace(/[^\x00-\xFF]/g, '?')
}

async function main() {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const tddContent = fs.readFileSync('TDD.md', 'utf8')
  const lines = tddContent.split('\n')

  // Colours
  const NAVY     = [23, 36, 58]
  const SLATE    = [45, 62, 92]
  const TEXT     = [26, 26, 26]
  const MUTED    = [100, 116, 139]
  const LIGHT_BG = [247, 248, 250]

  function addPageIfNeeded(needed) {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  function writeText(raw, options = {}) {
    const {
      size       = 10,
      style      = 'normal',
      color      = TEXT,
      indent     = 0,
      lineHeight = Math.max(4, size * 0.52),
    } = options

    const text = sanitise(raw)
    if (!text.trim()) return

    addPageIfNeeded(lineHeight)
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)

    const maxWidth = contentWidth - indent
    const wrapped  = doc.splitTextToSize(text, maxWidth)
    for (const line of wrapped) {
      addPageIfNeeded(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    }
  }

  function writeTable(rows, isHeader = false) {
    if (rows.length === 0) return

    // Determine column count from widest row
    const colCount = Math.max(...rows.map(r => r.length))
    if (colCount === 0) return

    const colWidth  = contentWidth / colCount
    const rowHeight = 7

    for (let i = 0; i < rows.length; i++) {
      addPageIfNeeded(rowHeight + 2)
      const row = rows[i]
      const isHeaderRow = isHeader && i === 0

      if (isHeaderRow) {
        doc.setFillColor(...NAVY)
        doc.rect(margin, y - 5, contentWidth, rowHeight, 'F')
      } else if (i % 2 === 1) {
        doc.setFillColor(...LIGHT_BG)
        doc.rect(margin, y - 5, contentWidth, rowHeight, 'F')
      }

      for (let j = 0; j < colCount; j++) {
        const cellText = sanitise(String(row[j] || '')).trim()
        doc.setFont('helvetica', isHeaderRow ? 'bold' : 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...(isHeaderRow ? [255, 255, 255] : TEXT))
        const truncated = doc.splitTextToSize(cellText, colWidth - 4)[0] || ''
        doc.text(truncated, margin + j * colWidth + 2, y)
      }
      y += rowHeight
    }
    y += 3
  }

  // ─── Cover header ────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 40, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('StitchOps', margin, 17)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Technical Design Document', margin, 26)
  doc.setFontSize(8.5)
  doc.text('6 November 2026  |  Author: Mehul8864', margin, 34)

  // ─── Info box ─────────────────────────────────────────────────────────────
  y = 48
  doc.setFillColor(...LIGHT_BG)
  doc.setDrawColor(200, 210, 225)
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD')

  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT)

  doc.setFont('helvetica', 'bold')
  doc.text('GitHub Repository:', margin + 3, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.text('https://github.com/Mehul8864/knitwear-production-tracker', margin + 37, y + 6)

  doc.setFont('helvetica', 'bold')
  doc.text('Live Application:', margin + 3, y + 13)
  doc.setFont('helvetica', 'normal')
  doc.text('https://stitchops-mehul8864.vercel.app', margin + 37, y + 13)

  y += 25

  // ─── Markdown renderer ───────────────────────────────────────────────────
  // Lines to skip (already rendered in the header box above)
  const SKIP_PREFIXES = [
    '# StitchOps',
    '**GitHub',
    '**Live',
    '**Version',
    '**Date',
    '**Author',
  ]

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Skip header metadata lines
    if (SKIP_PREFIXES.some(p => line.startsWith(p))) { i++; continue }
    if (line.trim() === '---' && i < 12) { i++; continue }

    // ── Code block ──
    if (line.trim().startsWith('```')) {
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(sanitise(lines[i]))
        i++
      }
      i++ // closing ```

      const codeHeight = codeLines.length * 4.2 + 6
      addPageIfNeeded(codeHeight + 4)
      doc.setFillColor(...LIGHT_BG)
      doc.setDrawColor(200, 210, 225)
      doc.roundedRect(margin, y - 3, contentWidth, codeHeight, 1, 1, 'FD')
      doc.setFont('courier', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...TEXT)
      for (let cl = 0; cl < codeLines.length; cl++) {
        addPageIfNeeded(4.2)
        // Truncate long code lines to avoid overflow
        const safe = codeLines[cl].length > 90 ? codeLines[cl].slice(0, 87) + '...' : codeLines[cl]
        doc.text(safe, margin + 3, y + cl * 4.2)
      }
      y += codeHeight + 3
      continue
    }

    // ── Table ──
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableRows = [line.split('|').slice(1, -1)]
      i += 2 // skip header + separator row
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i].split('|').slice(1, -1))
        i++
      }
      writeTable(tableRows, true)
      continue
    }

    // ── Headings ──
    if (line.startsWith('# ')) {
      y += 5
      writeText(line.slice(2), { size: 15, style: 'bold', color: NAVY, lineHeight: 8 })
      doc.setDrawColor(...NAVY)
      doc.setLineWidth(0.5)
      doc.line(margin, y - 2, pageWidth - margin, y - 2)
      y += 3
    } else if (line.startsWith('## ')) {
      y += 5
      writeText(line.slice(3), { size: 12, style: 'bold', color: NAVY, lineHeight: 7 })
      doc.setDrawColor(200, 210, 225)
      doc.setLineWidth(0.3)
      doc.line(margin, y - 1, pageWidth - margin, y - 1)
      y += 2
    } else if (line.startsWith('### ')) {
      y += 3
      writeText(line.slice(4), { size: 10.5, style: 'bold', color: SLATE, lineHeight: 6 })
    } else if (line.startsWith('---')) {
      y += 2
      doc.setDrawColor(200, 210, 225)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4

    // ── List items ──
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.trim().slice(2)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
      writeText('- ' + text, { size: 9, indent: 5, lineHeight: 5 })
      
    } else if (/^\d+\.\s/.test(line.trim())) {
      // Numbered list
      const text = line.trim().replace(/^\d+\.\s/, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
      writeText(line.trim().match(/^(\d+\.)/)[0] + ' ' + text, { size: 9, indent: 5, lineHeight: 5 })

    } else if (line.trim() === '') {
      y += 2

    } else if (line.trim().startsWith('|')) {
      // Orphan table row (already handled above) — skip
      i++
      continue

    } else {
      // Normal paragraph — strip markdown formatting
      const clean = sanitise(line)
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      if (clean.trim()) {
        writeText(clean, { size: 9, lineHeight: 5 })
      }
    }

    i++
  }

  // ─── Page footers ─────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - 32, pageHeight - 8)
    doc.text('StitchOps TDD  |  Mehul8864  |  6 November 2026', margin, pageHeight - 8)
  }

  doc.save('TDD.pdf')
  console.log('TDD.pdf generated successfully')
}

main().catch(console.error)

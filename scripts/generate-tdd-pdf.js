/**
 * Generates TDD.pdf from the TDD.md content using jsPDF.
 * Run: node scripts/generate-tdd-pdf.js
 */
const fs = require('fs')

async function main() {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const tddContent = fs.readFileSync('TDD.md', 'utf8')
  const lines = tddContent.split('\n')

  // Colors
  const NAVY = [23, 36, 58]
  const SLATE = [45, 62, 92]
  const TEXT = [26, 26, 26]
  const MUTED = [100, 116, 139]
  const LIGHT_BG = [247, 248, 250]

  function addPageIfNeeded(lineHeight) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  function writeText(text, options = {}) {
    const {
      size = 10,
      style = 'normal',
      color = TEXT,
      indent = 0,
      lineHeight = size * 0.5,
    } = options

    addPageIfNeeded(lineHeight)
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)

    // Split text to fit width
    const maxWidth = contentWidth - indent
    const wrapped = doc.splitTextToSize(text, maxWidth)
    for (const line of wrapped) {
      addPageIfNeeded(lineHeight)
      doc.text(line, margin + indent, y)
      y += lineHeight
    }
  }

  function writeTable(rows, isHeader = false) {
    if (rows.length === 0) return
    const colCount = rows[0].length
    const colWidth = contentWidth / colCount
    const rowHeight = 7

    for (let i = 0; i < rows.length; i++) {
      addPageIfNeeded(rowHeight + 2)
      const row = rows[i]
      const isHeaderRow = isHeader && i === 0

      // Background
      if (isHeaderRow) {
        doc.setFillColor(...NAVY)
        doc.rect(margin, y - 5, contentWidth, rowHeight, 'F')
      } else if (i % 2 === 0) {
        doc.setFillColor(...LIGHT_BG)
        doc.rect(margin, y - 5, contentWidth, rowHeight, 'F')
      }

      // Cell text
      for (let j = 0; j < colCount; j++) {
        const cellText = String(row[j] || '').trim()
        doc.setFont('helvetica', isHeaderRow ? 'bold' : 'normal')
        doc.setFontSize(8)
        if (isHeaderRow) {
          doc.setTextColor(255, 255, 255)
        } else {
          doc.setTextColor(...TEXT)
        }
        const truncated = doc.splitTextToSize(cellText, colWidth - 4)[0]
        doc.text(truncated, margin + j * colWidth + 2, y)
      }

      y += rowHeight
    }
    y += 3
  }

  // ─── Header ───
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('StitchOps', margin, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Technical Design Document', margin, 25)
  doc.setFontSize(8)
  doc.text('5 November 2026  |  Author: Mehul8864', margin, 30)

  // Repository info box
  y = 42
  doc.setFillColor(...LIGHT_BG)
  doc.setDrawColor(200, 210, 225)
  doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT)
  doc.setFont('helvetica', 'bold')
  doc.text('GitHub Repository:', margin + 3, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.text('https://github.com/Mehul8864/knitwear-production-tracker', margin + 35, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.text('Live Application:', margin + 3, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.text('Deploy to Vercel — see deployment.md', margin + 35, y + 10)
  y += 20

  // ─── Process markdown ───
  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Skip the title line and repository info (already in header)
    if (line.startsWith('# StitchOps') || line.startsWith('**GitHub') || line.startsWith('**Live') || line.startsWith('**Version') || line.startsWith('**Date') || line.startsWith('**Author')) {
      i++
      continue
    }

    // Code blocks
    if (line.trim().startsWith('```')) {
      i++
      const codeLines = []
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```

      // Draw code block
      const codeHeight = codeLines.length * 4 + 4
      addPageIfNeeded(codeHeight + 4)
      doc.setFillColor(...LIGHT_BG)
      doc.setDrawColor(200, 210, 225)
      doc.roundedRect(margin, y - 3, contentWidth, codeHeight, 1, 1, 'FD')
      doc.setFont('courier', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...TEXT)
      for (let cl = 0; cl < codeLines.length; cl++) {
        addPageIfNeeded(4)
        const text = codeLines[cl].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        doc.text(text, margin + 3, y + cl * 4)
      }
      y += codeHeight + 3
      continue
    }

    // Table detection
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].includes('---')) {
      const tableRows = []
      const headerRow = line.split('|').slice(1, -1)
      tableRows.push(headerRow)
      i += 2 // skip header and separator
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i].split('|').slice(1, -1))
        i++
      }
      writeTable(tableRows, true)
      continue
    }

    // Headings
    if (line.startsWith('# ')) {
      y += 4
      writeText(line.slice(2), { size: 16, style: 'bold', color: NAVY, lineHeight: 8 })
      doc.setDrawColor(...NAVY)
      doc.setLineWidth(0.5)
      doc.line(margin, y - 2, pageWidth - margin, y - 2)
      y += 3
    } else if (line.startsWith('## ')) {
      y += 4
      writeText(line.slice(3), { size: 13, style: 'bold', color: NAVY, lineHeight: 7 })
      doc.setDrawColor(200, 210, 225)
      doc.setLineWidth(0.3)
      doc.line(margin, y - 1, pageWidth - margin, y - 1)
      y += 2
    } else if (line.startsWith('### ')) {
      y += 2
      writeText(line.slice(4), { size: 11, style: 'bold', color: SLATE, lineHeight: 6 })
    } else if (line.startsWith('---')) {
      y += 2
      doc.setDrawColor(200, 210, 225)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const text = line.trim().slice(2)
      writeText('• ' + text, { size: 9, indent: 4, lineHeight: 5 })
    } else if (line.trim() === '') {
      y += 3
    } else if (line.trim().startsWith('|')) {
      // standalone table row (fallback)
      i++
      continue
    } else {
      // Normal paragraph
      const cleanText = line
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      writeText(cleanText, { size: 9, lineHeight: 5 })
    }

    i++
  }

  // ─── Footer page numbers ───
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - 30, pageHeight - 8)
    doc.text('StitchOps TDD', margin, pageHeight - 8)
  }

  doc.save('TDD.pdf')
  console.log('TDD.pdf generated successfully')
}

main().catch(console.error)

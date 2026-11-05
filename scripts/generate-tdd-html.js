const fs = require('fs')

const tddContent = fs.readFileSync('TDD.md', 'utf8')
const lines = tddContent.split('\n')

let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>StitchOps — Technical Design Document</title>
<style>
  @page { margin: 2cm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; font-size: 14px; }
  h1 { color: #17243A; border-bottom: 3px solid #17243A; padding-bottom: 8px; font-size: 24px; }
  h2 { color: #17243A; margin-top: 32px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; font-size: 18px; }
  h3 { color: #2d3e5c; margin-top: 20px; font-size: 15px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
  th { background: #17243A; color: white; padding: 8px 12px; text-align: left; }
  td { border: 1px solid #e2e8f0; padding: 6px 12px; }
  tr:nth-child(even) { background: #f7f8fa; }
  code, pre { background: #f1f3f6; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
  pre { padding: 12px; overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 6px; white-space: pre-wrap; }
  li { margin-bottom: 4px; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  p { margin: 6px 0; }
  .header-box { background: #f7f8fa; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
  strong { font-weight: 600; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
</style>
</head>
<body>
<div class="header-box">
  <strong>StitchOps — Technical Design Document</strong><br>
  <strong>GitHub Repository:</strong> https://github.com/Mehul8864/knitwear-production-tracker<br>
  <strong>Live Application:</strong> Deploy to Vercel — see deployment.md<br>
  <strong>Date:</strong> 5 November 2026 &nbsp; <strong>Author:</strong> Mehul8864
</div>
`

let inCode = false
let inTable = false
let inList = false
let tableHeaderDone = false

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Code blocks
  if (line.trim().startsWith('```')) {
    if (inCode) {
      html += '</code></pre>\n'
      inCode = false
    } else {
      if (inTable) { html += '</table>\n'; inTable = false; tableHeaderDone = false }
      if (inList) { html += '</ul>\n'; inList = false }
      html += '<pre><code>'
      inCode = true
    }
    continue
  }
  if (inCode) {
    html += line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n'
    continue
  }

  // Table rows
  if (line.trim().startsWith('|')) {
    if (!inTable) { html += '<table>\n'; inTable = true; tableHeaderDone = false }
    if (line.includes('---')) { tableHeaderDone = true; continue }
    const cells = line.split('|').slice(1, -1).map(c => c.trim())
    if (!tableHeaderDone) {
      html += '<tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr>\n'
    } else {
      html += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>\n'
    }
    continue
  }
  if (inTable) { html += '</table>\n'; inTable = false; tableHeaderDone = false }

  // Headings
  if (line.startsWith('# ')) {
    if (inList) { html += '</ul>\n'; inList = false }
    html += `<h1>${line.slice(2)}</h1>\n`; continue
  }
  if (line.startsWith('## ')) {
    if (inList) { html += '</ul>\n'; inList = false }
    html += `<h2>${line.slice(3)}</h2>\n`; continue
  }
  if (line.startsWith('### ')) {
    html += `<h3>${line.slice(4)}</h3>\n`; continue
  }

  // List items
  if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
    if (!inList) { html += '<ul>\n'; inList = true }
    const content = line.trim().slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html += `<li>${content}</li>\n`
    continue
  }
  if (inList && !line.trim()) { html += '</ul>\n'; inList = false }

  // Horizontal rule
  if (line.trim() === '---') { html += '<hr>\n'; continue }

  // Empty line
  if (line.trim() === '') { html += '<br>\n'; continue }

  // Normal paragraph with basic formatting
  const formatted = line
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  html += `<p>${formatted}</p>\n`
}

if (inCode) html += '</code></pre>\n'
if (inTable) html += '</table>\n'
if (inList) html += '</ul>\n'

html += '</body></html>'

fs.writeFileSync('TDD.html', html)
console.log('TDD.html generated successfully')

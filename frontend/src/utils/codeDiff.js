/**
 * Minimal line-level diff (LCS based) between the pasted code and the model's
 * corrected version. A code fix is only trustworthy if you can see what
 * actually changed, and the model returns prose in `changes` that is often
 * vague. This shows the real before/after lines.
 */

function splitLines(text) {
  return (text ?? '').replace(/\r\n/g, '\n').split('\n')
}

// Longest common subsequence over lines. Patches are small relative to the
// file, so the O(n*m) table is fine; a guard keeps a pathological pair from
// freezing the tab.
function lcsTable(a, b) {
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }
  return table
}

export function diffLines(original, corrected) {
  const a = splitLines(original)
  const b = splitLines(corrected)

  if (a.length * b.length > 4_000_000) {
    return { rows: b.map((text, i) => ({ type: 'add', text, newNo: i + 1 })), added: b.length, removed: 0 }
  }

  const table = lcsTable(a, b)
  const rows = []
  let added = 0
  let removed = 0
  let i = 0
  let j = 0

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ type: 'same', text: a[i], oldNo: i + 1, newNo: j + 1 })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rows.push({ type: 'del', text: a[i], oldNo: i + 1 })
      removed++
      i++
    } else {
      rows.push({ type: 'add', text: b[j], newNo: j + 1 })
      added++
      j++
    }
  }
  while (i < a.length) {
    rows.push({ type: 'del', text: a[i], oldNo: i + 1 })
    removed++
    i++
  }
  while (j < b.length) {
    rows.push({ type: 'add', text: b[j], newNo: j + 1 })
    added++
    j++
  }

  return { rows, added, removed }
}

/**
 * Collapses long runs of unchanged lines. Showing a 300 line file verbatim
 * buries the two lines that matter, so anything beyond `context` unchanged
 * rows either side of a change is folded into a single jump marker.
 */
export function collapseContext(rows, context = 3) {
  const keep = new Array(rows.length).fill(false)
  rows.forEach((row, idx) => {
    if (row.type === 'same') return
    for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) {
      keep[k] = true
    }
  })

  const out = []
  let skipped = 0
  rows.forEach((row, idx) => {
    if (keep[idx]) {
      if (skipped > 0) {
        out.push({ type: 'gap', count: skipped })
        skipped = 0
      }
      out.push(row)
    } else {
      skipped++
    }
  })
  if (skipped > 0) out.push({ type: 'gap', count: skipped })
  return out
}

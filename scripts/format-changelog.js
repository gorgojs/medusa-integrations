import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { formatNewestBlock, sectionForSha } from './changelog-utils.js'

function changedChangelogs() {
  let out = ''
  try {
    out = execSync('git status --porcelain', { encoding: 'utf8' })
  } catch {
    return []
  }
  return out
    .split('\n')
    .map(line => line.slice(3).trim())
    .filter(file => /^packages\/(?:utils|providers|modules|plugins)\/[^/]+\/CHANGELOG\.md$/.test(file))
}

let formatted = 0
for (const file of changedChangelogs()) {
  const abs = path.resolve(file)
  const original = readFileSync(abs, 'utf8')
  const rebuilt = formatNewestBlock(original, sectionForSha)
  if (rebuilt === original) continue
  writeFileSync(abs, rebuilt, 'utf8')
  formatted++
  console.log(`formatted: ${file}`)
}

console.log(`Formatted ${formatted} changelog(s).`)

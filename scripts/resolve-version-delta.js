#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const target = process.env.TARGET_VERSION;
if (!target) {
  console.error('TARGET_VERSION env var is required');
  process.exit(1);
}

const cwd = process.cwd();
const badgesDir = path.join(cwd, '.badges');

// The package table, shared with update.sh and test-and-bump.sh through packages.sh
const PACKAGES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'packages.json'), 'utf8'),
);

const versions = new Set();
const outdated = [];

for (const [scope, entry] of Object.entries(PACKAGES)) {
  const examples = entry.examples ?? [];
  if (examples.length === 0) continue;

  const missing = [entry.dir, ...examples.map((e) => e.dir)].filter(
    (dir) => !fs.existsSync(path.join(cwd, dir)),
  );
  if (missing.length) {
    console.log(
      `::warning title=Medusa update::${scope}: ${missing.join(', ')} declared in packages.json but missing — skipped`,
    );
    continue;
  }

  let tested = null;
  const badgeFile = path.join(badgesDir, `medusa-${scope}.json`);
  if (fs.existsSync(badgeFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(badgeFile, 'utf8'));
      tested =
        typeof data.message === 'string'
          ? data.message.replace(/^v/, '') || null
          : null;
    } catch {}
  }

  if (tested) versions.add(tested);
  if (tested !== target) outdated.push(`medusa-${scope}`);
}

const sorted = [...versions].sort((a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
});

const currentVersions = sorted.join(',');
const outdatedPackages = outdated.join(',');

const outPath = process.env.GITHUB_OUTPUT;
if (outPath) {
  fs.appendFileSync(outPath, `new_medusa_version=${target}\n`);
  fs.appendFileSync(outPath, `current_versions=${currentVersions}\n`);
  fs.appendFileSync(outPath, `outdated_packages=${outdatedPackages}\n`);
}

console.log(`Current versions: ${currentVersions || '(none)'}`);
console.log(`Target version: ${target}`);
console.log(`Outdated packages: ${outdatedPackages || '(none)'}`);

'use strict';
const fs = require('node:fs');
for (const filename of process.argv.slice(2)) {
  const report = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (report.error) {
    console.error('npm audit unavailable:', report.error.code || report.error.message);
    process.exitCode = 1;
    continue;
  }
  const counts = report.metadata?.vulnerabilities || {};
  const entries = Object.entries(report.vulnerabilities || {}).sort(
    (a, b) => ({ critical: 0, high: 1, moderate: 2, low: 3, info: 4 }[a[1].severity] ?? 5) -
              ({ critical: 0, high: 1, moderate: 2, low: 3, info: 4 }[b[1].severity] ?? 5),
  );
  console.log('\nAUDIT', filename, 'counts=', JSON.stringify(counts));
  if (filename.endsWith('npm-audit-production.json') &&
      ((counts.critical ?? 0) > 0 || (counts.high ?? 0) > 0)) {
    console.error('SECURITY GATE FAILED: high/critical production dependency advisories');
    process.exitCode = 1;
  }
  for (const [name, entry] of entries) {
    const advisories = (entry.via || []).filter((x) => typeof x !== 'string')
      .map((x) => ({ source: x.source, title: x.title, url: x.url, range: x.range }));
    console.log(JSON.stringify({
      package: name, severity: entry.severity, direct: entry.isDirect,
      installedRange: entry.range, fixAvailable: entry.fixAvailable,
      via: advisories, effects: entry.effects,
    }));
  }
}
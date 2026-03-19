import { existsSync, readFileSync } from "node:fs";
import { loadManifestContext } from "./lib/manifest-parser.mjs";
import { resolvePackPath } from "./lib/pack-path-utils.mjs";
import { appendJsonLine, writeJsonFile } from "./lib/report-writer.mjs";

const countDifferingChars = (left, right) => {
  const maxLength = Math.max(left.length, right.length);
  let diff = 0;
  for (let index = 0; index < maxLength; index += 1) {
    if (left[index] !== right[index]) {
      diff += 1;
    }
  }
  return diff;
};

const calculateDiffPercent = (baselineContent, currentContent) => {
  const maxLength = Math.max(baselineContent.length, currentContent.length, 1);
  const diffChars = countDifferingChars(baselineContent, currentContent);
  return (diffChars / maxLength) * 100;
};

const determineStatus = (diffPercent, warningPercent, blockPercent) => {
  if (diffPercent >= blockPercent) return "block";
  if (diffPercent >= warningPercent) return "warning";
  return "pass";
};

const run = () => {
  const startedAt = new Date().toISOString();
  const { packRoot, manifest } = loadManifestContext(import.meta.url);

  const reportPath = resolvePackPath(packRoot, manifest.paths.qaReportPath);
  const records = [];

  let blocked = 0;
  let warning = 0;

  for (const entry of manifest.entries) {
    const baselinePath = resolvePackPath(packRoot, `${manifest.paths.baselinePngRoot}/${entry.id}.png`);
    const currentPath = entry.absolutePngPath;

    if (!existsSync(currentPath)) {
      throw new Error(`Current PNG output missing for ${entry.id}`);
    }

    const currentContent = readFileSync(currentPath, "utf8");
    let diffPercent = 0;
    let hasBaseline = false;

    if (existsSync(baselinePath)) {
      hasBaseline = true;
      const baselineContent = readFileSync(baselinePath, "utf8");
      diffPercent = calculateDiffPercent(baselineContent, currentContent);
    }

    const gateStatus = hasBaseline
      ? determineStatus(diffPercent, manifest.visualGate.warningPercent, manifest.visualGate.blockPercent)
      : "pass";

    if (gateStatus === "block") blocked += 1;
    if (gateStatus === "warning") warning += 1;

    const record = {
      timestamp: new Date().toISOString(),
      packId: manifest.pack.id,
      packVersion: manifest.pack.version,
      file: entry.outputs.png,
      baseline: hasBaseline ? `${manifest.paths.baselinePngRoot}/${entry.id}.png` : null,
      diffPercent: Number(diffPercent.toFixed(4)),
      warningThreshold: manifest.visualGate.warningPercent,
      blockThreshold: manifest.visualGate.blockPercent,
      status: gateStatus,
      checksumHint: `${entry.id}:${currentContent.length}`,
    };

    appendJsonLine(reportPath, record);
    records.push(record);
  }

  if (blocked > 0) {
    throw new Error(`QA gate blocked: ${blocked} file(s) exceeded ${manifest.visualGate.blockPercent}%`);
  }

  const summaryPath = resolvePackPath(packRoot, "qa/gates/qa-summary.json");
  writeJsonFile(summaryPath, {
    stage: "qa",
    status: "pass",
    startedAt,
    finishedAt: new Date().toISOString(),
    packId: manifest.pack.id,
    packVersion: manifest.pack.version,
    total: records.length,
    warning,
    blocked,
  });

  process.stdout.write(`QA complete. total=${records.length}, warning=${warning}, blocked=${blocked}\n`);
};

run();

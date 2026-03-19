import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { loadManifestContext } from "./lib/manifest-parser.mjs";
import { resolvePackPath } from "./lib/pack-path-utils.mjs";
import { appendJsonLine, writeJsonFile } from "./lib/report-writer.mjs";

const copyDirectoryIfExists = (sourcePath, targetPath) => {
  if (!existsSync(sourcePath)) return false;
  mkdirSync(targetPath, { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true });
  return true;
};

const copyFileIfExists = (sourcePath, targetPath) => {
  if (!existsSync(sourcePath)) return false;
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
  return true;
};

const run = () => {
  const startedAt = new Date().toISOString();
  const { packRoot, manifest } = loadManifestContext(import.meta.url);

  const buildSvgPath = resolvePackPath(packRoot, manifest.paths.buildSvgRoot);
  const buildPngPath = resolvePackPath(packRoot, manifest.paths.buildPngRoot);
  const buildPdfPath = resolvePackPath(packRoot, manifest.paths.buildPdfRoot);
  const qaReportPath = resolvePackPath(packRoot, manifest.paths.qaReportPath);

  const releaseDirName = `${manifest.pack.id}-${manifest.pack.version}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const releaseRoot = resolvePackPath(packRoot, "build/release");
  const releasePath = join(releaseRoot, releaseDirName);

  mkdirSync(releasePath, { recursive: true });
  copyDirectoryIfExists(buildSvgPath, join(releasePath, "svg"));
  copyDirectoryIfExists(buildPngPath, join(releasePath, "png"));
  copyDirectoryIfExists(buildPdfPath, join(releasePath, "pdf"));

  if (existsSync(qaReportPath)) {
    copyFileIfExists(qaReportPath, join(releasePath, "report.jsonl"));
  }

  const releaseMetadata = {
    stage: "release",
    status: "pass",
    startedAt,
    finishedAt: new Date().toISOString(),
    packId: manifest.pack.id,
    packVersion: manifest.pack.version,
    releaseCadence: manifest.pack.releaseCadence,
    artifactRetentionDays: manifest.pack.artifactRetentionDays,
    releasePolicy: manifest.pack.releasePolicy,
    rollbackSlaMinutes: manifest.pack.rollbackSlaMinutes,
    releaseDir: `build/release/${releaseDirName}`,
  };

  const releaseSummaryPath = resolvePackPath(packRoot, "qa/gates/release-summary.json");
  writeJsonFile(releaseSummaryPath, releaseMetadata);

  const releaseLogPath = resolvePackPath(packRoot, manifest.paths.releaseLogPath);
  appendJsonLine(releaseLogPath, releaseMetadata);

  process.stdout.write(`Release artifact ready at build/release/${releaseDirName}\n`);
};

run();

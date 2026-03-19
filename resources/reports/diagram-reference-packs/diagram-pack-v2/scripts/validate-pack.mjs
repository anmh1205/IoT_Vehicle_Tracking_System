import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { loadManifestContext } from "./lib/manifest-parser.mjs";
import { loadManifestSchema, validateManifestShape } from "./lib/manifest-schema-checker.mjs";
import { ensureFileExists, resolvePackPath, toPosixPath } from "./lib/pack-path-utils.mjs";
import { sha256FromText } from "./lib/checksum-utils.mjs";
import { writeJsonFile } from "./lib/report-writer.mjs";

const containsUnsafeScriptPattern = (source) => {
  const lower = source.toLowerCase();
  return lower.includes("<script") || lower.includes("javascript:");
};

const validateEntryLayout = (manifestContext) => {
  const { manifest, packRoot } = manifestContext;
  const ids = new Set();
  const outputPaths = new Set();

  for (const entry of manifest.entries) {
    if (ids.has(entry.id)) {
      throw new Error(`Duplicate entry id: ${entry.id}`);
    }
    ids.add(entry.id);

    for (const outputField of ["svg", "png", "pdf"]) {
      const relPath = entry.outputs[outputField];
      const posixPath = toPosixPath(relPath);
      if (outputPaths.has(posixPath)) {
        throw new Error(`Duplicate output path detected: ${relPath}`);
      }
      outputPaths.add(posixPath);

      const allowedRoot = outputField === "svg"
        ? toPosixPath(manifest.paths.buildSvgRoot)
        : outputField === "png"
          ? toPosixPath(manifest.paths.buildPngRoot)
          : toPosixPath(manifest.paths.buildPdfRoot);

      if (!posixPath.startsWith(`${allowedRoot}/`) && posixPath !== allowedRoot) {
        throw new Error(`Entry ${entry.id} output ${outputField} must stay under ${allowedRoot}`);
      }
    }

    const sourcePosix = toPosixPath(entry.source);
    const sourceRoot = toPosixPath(manifest.paths.sourceRoot);
    if (!sourcePosix.startsWith(`${sourceRoot}/`) && sourcePosix !== sourceRoot) {
      throw new Error(`Entry ${entry.id} source must stay under ${sourceRoot}`);
    }

    ensureFileExists(entry.absoluteSourcePath, `Entry source ${entry.id}`);

    const sourceCode = readFileSync(entry.absoluteSourcePath, "utf8");
    if (containsUnsafeScriptPattern(sourceCode)) {
      throw new Error(`Entry ${entry.id} contains unsafe script patterns`);
    }

    if (!sourceCode.trim()) {
      throw new Error(`Entry ${entry.id} source is empty`);
    }
  }

  const requiredDirs = [
    manifest.paths.buildSvgRoot,
    manifest.paths.buildPngRoot,
    manifest.paths.buildPdfRoot,
    manifest.paths.baselinePngRoot,
    dirname(manifest.paths.qaReportPath),
    dirname(manifest.paths.releaseLogPath),
  ];

  for (const relativeDir of requiredDirs) {
    const absoluteDir = resolvePackPath(packRoot, relativeDir);
    if (!existsSync(absoluteDir)) {
      throw new Error(`Required directory is missing: ${relativeDir}`);
    }
  }
};

const run = () => {
  const startedAt = new Date().toISOString();
  const manifestContext = loadManifestContext(import.meta.url);
  const { packRoot, manifest } = manifestContext;
  const schemaPath = resolvePackPath(packRoot, "qa/gates/manifest.schema.json");
  loadManifestSchema(schemaPath);
  validateManifestShape(manifest);
  validateEntryLayout(manifestContext);

  const reportPath = resolvePackPath(packRoot, "qa/gates/validate-report.json");
  const sourceChecksumInput = manifest.entries
    .map((entry) => readFileSync(entry.absoluteSourcePath, "utf8"))
    .join("\n===ENTRY_BREAK===\n");

  const result = {
    stage: "validate",
    status: "pass",
    startedAt,
    finishedAt: new Date().toISOString(),
    packId: manifest.pack.id,
    packVersion: manifest.pack.version,
    entryCount: manifest.entries.length,
    sourceAggregateSha256: sha256FromText(sourceChecksumInput),
  };

  writeJsonFile(reportPath, result);
  process.stdout.write(`Validated ${manifest.entries.length} entries.\n`);
};

run();

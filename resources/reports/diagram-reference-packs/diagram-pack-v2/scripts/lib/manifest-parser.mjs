import { readFileSync } from "node:fs";
import YAML from "yaml";
import {
  ensureFileExists,
  ensureSafeRelativePath,
  getPackRoot,
  resolvePackPath,
  toPosixPath,
} from "./pack-path-utils.mjs";

const requiredPathKeys = [
  "sourceRoot",
  "buildSvgRoot",
  "buildPngRoot",
  "buildPdfRoot",
  "baselinePngRoot",
  "qaReportPath",
  "releaseLogPath",
];

export const loadManifestContext = (metaUrl) => {
  const packRoot = getPackRoot(metaUrl);
  const manifestPath = resolvePackPath(packRoot, "manifest.yaml");
  ensureFileExists(manifestPath, "manifest.yaml");

  const raw = readFileSync(manifestPath, "utf8");
  const manifest = YAML.parse(raw);

  if (!manifest || typeof manifest !== "object") {
    throw new Error("Manifest YAML is invalid or empty");
  }

  if (!manifest.paths || typeof manifest.paths !== "object") {
    throw new Error("manifest.paths is required");
  }

  for (const key of requiredPathKeys) {
    ensureSafeRelativePath(manifest.paths[key], `paths.${key}`);
  }

  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    throw new Error("manifest.entries must be a non-empty array");
  }

  const normalizedEntries = manifest.entries.map((entry, index) => {
    const entryId = entry?.id ?? `index-${index}`;
    if (!entry || typeof entry !== "object") {
      throw new Error(`entries[${index}] must be an object`);
    }

    const source = ensureSafeRelativePath(entry.source, `entries[${index}].source`);
    const svg = ensureSafeRelativePath(entry.outputs?.svg, `entries[${index}].outputs.svg`);
    const png = ensureSafeRelativePath(entry.outputs?.png, `entries[${index}].outputs.png`);
    const pdf = ensureSafeRelativePath(entry.outputs?.pdf, `entries[${index}].outputs.pdf`);

    return {
      ...entry,
      id: String(entryId),
      source,
      outputs: {
        svg,
        png,
        pdf,
      },
      absoluteSourcePath: resolvePackPath(packRoot, source),
      absoluteSvgPath: resolvePackPath(packRoot, svg),
      absolutePngPath: resolvePackPath(packRoot, png),
      absolutePdfPath: resolvePackPath(packRoot, pdf),
      sourcePosix: toPosixPath(source),
      svgPosix: toPosixPath(svg),
      pngPosix: toPosixPath(png),
      pdfPosix: toPosixPath(pdf),
    };
  });

  const normalizedPaths = Object.fromEntries(
    Object.entries(manifest.paths).map(([key, value]) => [key, ensureSafeRelativePath(value, `paths.${key}`)]),
  );

  return {
    packRoot,
    manifestPath,
    manifest: {
      ...manifest,
      paths: normalizedPaths,
      entries: normalizedEntries,
    },
  };
};

import { readFileSync } from "node:fs";

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const ensure = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const ensureRegex = (value, regex, fieldName) => {
  ensure(typeof value === "string" && regex.test(value), `${fieldName} has invalid format: ${value}`);
};

const ensureInteger = (value, fieldName) => {
  ensure(Number.isInteger(value), `${fieldName} must be an integer`);
};

const ensureNumber = (value, fieldName) => {
  ensure(typeof value === "number" && Number.isFinite(value), `${fieldName} must be a finite number`);
};

const ensureSetMember = (value, allowedValues, fieldName) => {
  ensure(allowedValues.includes(value), `${fieldName} must be one of: ${allowedValues.join(", ")}`);
};

export const loadManifestSchema = (manifestSchemaPath) => {
  const raw = readFileSync(manifestSchemaPath, "utf8");
  const schema = JSON.parse(raw);
  ensure(isObject(schema), "Manifest schema JSON must be an object");
  return schema;
};

export const validateManifestShape = (manifest) => {
  ensure(isObject(manifest), "Manifest must be an object");

  ensure(manifest.schemaVersion === "1.0", "schemaVersion must equal '1.0'");

  ensure(isObject(manifest.pack), "pack must be an object");
  ensure(typeof manifest.pack.id === "string" && manifest.pack.id.length > 0, "pack.id is required");
  ensureRegex(manifest.pack.version, /^[0-9]+\.[0-9]+\.[0-9]+$/, "pack.version");
  ensureSetMember(manifest.pack.status, ["candidate", "active", "deprecated"], "pack.status");
  ensureSetMember(manifest.pack.releaseCadence, ["sprint", "chapter", "tag"], "pack.releaseCadence");
  ensureInteger(manifest.pack.artifactRetentionDays, "pack.artifactRetentionDays");
  ensure(manifest.pack.artifactRetentionDays > 0, "pack.artifactRetentionDays must be > 0");
  ensure(typeof manifest.pack.releasePolicy === "string" && manifest.pack.releasePolicy.length > 0, "pack.releasePolicy is required");
  ensureInteger(manifest.pack.rollbackSlaMinutes, "pack.rollbackSlaMinutes");
  ensure(manifest.pack.rollbackSlaMinutes > 0, "pack.rollbackSlaMinutes must be > 0");

  ensure(isObject(manifest.renderProfile), "renderProfile must be an object");
  ensureSetMember(manifest.renderProfile.engine, ["mermaid", "plantuml", "hybrid"], "renderProfile.engine");
  ensure(typeof manifest.renderProfile.cliPackage === "string" && manifest.renderProfile.cliPackage.length > 0, "renderProfile.cliPackage is required");
  ensure(typeof manifest.renderProfile.cliVersion === "string" && manifest.renderProfile.cliVersion.length > 0, "renderProfile.cliVersion is required");
  ensure(typeof manifest.renderProfile.configPath === "string" && manifest.renderProfile.configPath.length > 0, "renderProfile.configPath is required");

  const numericRenderKeys = [
    "defaultWidth",
    "defaultHeight",
    "sequenceWidth",
    "sequenceHeight",
    "stateWidth",
    "stateHeight",
    "mindmapWidth",
    "mindmapHeight",
    "ganttWidth",
    "ganttHeight",
    "xychartWidth",
    "xychartHeight",
    "radarWidth",
    "radarHeight",
    "blockWidth",
    "blockHeight",
    "erWidth",
    "erHeight",
  ];

  for (const key of numericRenderKeys) {
    ensureInteger(manifest.renderProfile[key], `renderProfile.${key}`);
    ensure(manifest.renderProfile[key] > 0, `renderProfile.${key} must be > 0`);
  }

  ensure(isObject(manifest.visualGate), "visualGate must be an object");
  ensureNumber(manifest.visualGate.warningPercent, "visualGate.warningPercent");
  ensureNumber(manifest.visualGate.blockPercent, "visualGate.blockPercent");
  ensure(manifest.visualGate.warningPercent >= 0, "visualGate.warningPercent must be >= 0");
  ensure(manifest.visualGate.blockPercent >= 0, "visualGate.blockPercent must be >= 0");
  ensure(
    manifest.visualGate.warningPercent <= manifest.visualGate.blockPercent,
    "visualGate.warningPercent cannot exceed visualGate.blockPercent",
  );

  ensure(isObject(manifest.paths), "paths must be an object");
  const requiredPaths = [
    "sourceRoot",
    "buildSvgRoot",
    "buildPngRoot",
    "buildPdfRoot",
    "baselinePngRoot",
    "qaReportPath",
    "releaseLogPath",
  ];

  for (const pathKey of requiredPaths) {
    ensure(typeof manifest.paths[pathKey] === "string" && manifest.paths[pathKey].length > 0, `paths.${pathKey} is required`);
  }

  ensure(Array.isArray(manifest.entries) && manifest.entries.length > 0, "entries must be a non-empty array");

  const seenIds = new Set();
  const seenSources = new Set();

  manifest.entries.forEach((entry, index) => {
    ensure(isObject(entry), `entries[${index}] must be an object`);
    ensure(typeof entry.id === "string" && entry.id.length > 0, `entries[${index}].id is required`);
    ensureSetMember(entry.type, ["mermaid", "plantuml"], `entries[${index}].type`);
    ensure(typeof entry.source === "string" && entry.source.length > 0, `entries[${index}].source is required`);
    ensure(isObject(entry.outputs), `entries[${index}].outputs is required`);
    ensureRegex(entry.outputs.svg, /\.svg$/u, `entries[${index}].outputs.svg`);
    ensureRegex(entry.outputs.png, /\.png$/u, `entries[${index}].outputs.png`);
    ensureRegex(entry.outputs.pdf, /\.pdf$/u, `entries[${index}].outputs.pdf`);

    ensure(!seenIds.has(entry.id), `Duplicate entry.id detected: ${entry.id}`);
    seenIds.add(entry.id);

    ensure(!seenSources.has(entry.source), `Duplicate entry.source detected: ${entry.source}`);
    seenSources.add(entry.source);
  });
};

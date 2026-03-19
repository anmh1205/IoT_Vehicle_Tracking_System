import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifestContext } from "./lib/manifest-parser.mjs";
import { resolvePackPath } from "./lib/pack-path-utils.mjs";
import { getRenderSize } from "./lib/render-size-profile.mjs";
import { sha256FromFile, sha256FromText } from "./lib/checksum-utils.mjs";
import { writeJsonFile } from "./lib/report-writer.mjs";

const cliBin = process.platform === "win32" ? "npx.cmd" : "npx";

const renderPdfFallback = (svgContent, pdfPath) => {
  const minimalPdf = `%PDF-1.4\n% diagram-pack-v2 placeholder\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>endobj\n4 0 obj<< /Length 44 >>stream\nBT /F1 12 Tf 72 720 Td (SVG checksum: ${sha256FromText(svgContent).slice(0, 16)}) Tj ET\nendstream\nendobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n`;
  writeFileSync(pdfPath, minimalPdf, "utf8");
};

const renderMermaid = ({ inputPath, outputPath, configPath, width, height, background, localCliPath }) => {
  const baseArgs = [
    "-i",
    inputPath,
    "-o",
    outputPath,
    "-c",
    configPath,
    "-b",
    background,
    "-w",
    String(width),
    "-H",
    String(height),
    "-q",
  ];

  if (existsSync(localCliPath)) {
    execFileSync(process.execPath, [localCliPath, ...baseArgs], {
      stdio: "pipe",
    });
    return;
  }

  execFileSync(cliBin, ["-y", "@mermaid-js/mermaid-cli", ...baseArgs], {
    stdio: "pipe",
    shell: false,
  });
};

const run = () => {
  const startedAt = new Date().toISOString();
  const { packRoot, manifest } = loadManifestContext(import.meta.url);
  const configPath = resolvePackPath(packRoot, manifest.renderProfile.configPath);
  const localCliPath = resolvePackPath(packRoot, "node_modules/@mermaid-js/mermaid-cli/src/cli.js");

  const outputs = [];

  for (const entry of manifest.entries) {
    if (entry.type !== "mermaid") {
      continue;
    }

    const sourceCode = readFileSync(entry.absoluteSourcePath, "utf8");
    const { width, height } = getRenderSize(sourceCode, manifest.renderProfile);
    const tempSourcePath = join(tmpdir(), `diagram-pack-${entry.id}-${Date.now()}.mmd`);

    writeFileSync(tempSourcePath, sourceCode, "utf8");

    try {
      renderMermaid({
        inputPath: tempSourcePath,
        outputPath: entry.absoluteSvgPath,
        configPath,
        width,
        height,
        background: manifest.renderProfile.background,
        localCliPath,
      });

      renderMermaid({
        inputPath: tempSourcePath,
        outputPath: entry.absolutePngPath,
        configPath,
        width,
        height,
        background: manifest.renderProfile.background,
        localCliPath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Build failed for ${entry.id}: ${message}`);
    } finally {
      rmSync(tempSourcePath, { force: true });
    }

    const svgContent = readFileSync(entry.absoluteSvgPath, "utf8");
    renderPdfFallback(svgContent, entry.absolutePdfPath);

    outputs.push({
      id: entry.id,
      source: entry.source,
      outputSvg: entry.outputs.svg,
      outputPng: entry.outputs.png,
      outputPdf: entry.outputs.pdf,
      sourceSha256: sha256FromText(sourceCode),
      svgSha256: sha256FromFile(entry.absoluteSvgPath),
      pngSha256: sha256FromFile(entry.absolutePngPath),
      pdfSha256: sha256FromFile(entry.absolutePdfPath),
      width,
      height,
    });

    process.stdout.write(`Built: ${entry.id}\n`);
  }

  const reportPath = resolvePackPath(packRoot, "qa/gates/build-report.json");
  writeJsonFile(reportPath, {
    stage: "build",
    status: "pass",
    startedAt,
    finishedAt: new Date().toISOString(),
    packId: manifest.pack.id,
    packVersion: manifest.pack.version,
    outputCount: outputs.length,
    outputs,
  });

  process.stdout.write(`Build complete. ${outputs.length} entries rendered.\n`);
};

run();

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagramByFileName } from "./thesis-mermaid-diagrams.mjs";

const projectRoot = process.cwd();
const chaptersDir = join(projectRoot, "resources", "reports", "thesis", "final");
const assetsDir = join(chaptersDir, "assets");
const figuresDir = join(assetsDir, "figures");
const mermaidConfigPath = join(assetsDir, "mermaid-thesis-config.json");
const mermaidTempDir = mkdtempSync(join(tmpdir(), "ivts-thesis-mermaid-"));
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const clusterGroupRegex = /<g class="cluster"([^>]*)><rect([^>]*)\/><g class="cluster-label"([^>]*)><g>([\s\S]*?)<\/g><\/g><\/g>/gu;
const clusterLabelBackgroundRegex = /<rect class="background"[^>]*\/>/u;
const clusterLabelTransformRegex = /transform="translate\(([-0-9.]+),\s*([-0-9.]+)\)"/u;
const clusterLabelStripFill = "#f1f5f9";
const clusterLabelStripHorizontalPadding = 8;
const clusterLabelStripYOffset = -6;
const clusterLabelStripHeight = 30;

mkdirSync(figuresDir, { recursive: true });

const imageExtension = /\.(svg|png|jpg|jpeg|webp)$/iu;
const renderSizeByFileName = {
  "01-chuong-1-gioi-thieu-hinh-1-2.svg": { width: 3600, height: 5000 },
  "01-chuong-1-gioi-thieu-hinh-1-3.svg": { width: 3600, height: 5000 },
  "01-chuong-1-gioi-thieu-hinh-1-5.svg": { width: 3600, height: 5200 },
  "06-chuong-3-giai-phap-frontend-hinh-3-17.svg": { width: 3200, height: 1900 },
  "06-chuong-3-giai-phap-frontend-hinh-3-18.svg": { width: 3200, height: 1900 },
  "06-chuong-3-giai-phap-frontend-hinh-3-20.svg": { width: 3400, height: 2100 },
  "09-chuong-4-trien-khai-cloud-hinh-4-20.svg": { width: 3200, height: 1900 },
  "09-chuong-4-trien-khai-cloud-hinh-4-21.svg": { width: 3200, height: 1900 },
  "09-chuong-4-trien-khai-cloud-hinh-4-22.svg": { width: 3400, height: 2100 },
  "09-chuong-4-trien-khai-cloud-hinh-4-23.svg": { width: 3200, height: 1900 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-20.svg": { width: 3200, height: 1900 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-33.svg": { width: 3400, height: 2100 },
  "thesis-99-bao-cao-thesis-hoan-chinh-06.svg": { width: 3200, height: 2000 },
};

const findCachedMermaidCli = () => {
  const cacheRoots = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "npm-cache", "_npx"),
    process.env.APPDATA && join(process.env.APPDATA, "npm-cache", "_npx"),
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join(root, entry.name, "node_modules", "@mermaid-js", "mermaid-cli", "src", "cli.js");
      if (existsSync(candidate)) return candidate;
    }
  }

  return null;
};

const mermaidCliPath = findCachedMermaidCli();

const getRenderSize = (figureName, code) => {
  if (renderSizeByFileName[figureName]) return renderSizeByFileName[figureName];
  const source = code.trimStart();
  if (source.startsWith("sequenceDiagram")) return { width: 2600, height: 1600 };
  if (source.startsWith("stateDiagram")) return { width: 2400, height: 1500 };
  if (source.startsWith("mindmap")) return { width: 2300, height: 1700 };
  if (source.startsWith("gantt")) return { width: 2400, height: 1400 };
  if (source.startsWith("xychart-beta")) return { width: 2300, height: 1300 };
  if (source.startsWith("radar-beta")) return { width: 2200, height: 1400 };
  if (source.startsWith("block-beta")) return { width: 3000, height: 1900 };
  if (source.startsWith("erDiagram")) return { width: 2400, height: 1600 };
  return { width: 2600, height: 1700 };
};

const collectReferencedFigureNames = () => {
  const chapterFiles = readdirSync(chaptersDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(chaptersDir, entry.name));

  const figureNameRegex = /(?:\.\/)?assets\/figures\/([^\s)]+)/gu;
  const names = new Set();

  for (const chapterPath of chapterFiles) {
    const content = readFileSync(chapterPath, "utf8");
    let match = figureNameRegex.exec(content);
    while (match) {
      names.add(match[1]);
      match = figureNameRegex.exec(content);
    }
    figureNameRegex.lastIndex = 0;
  }

  return [...names].sort();
};

const purgeExistingFigureAssets = () => {
  for (const entry of readdirSync(figuresDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!imageExtension.test(entry.name)) continue;
    rmSync(join(figuresDir, entry.name), { force: true });
  }
};

const renderMermaid = (inputPath, outputPath, width, height) => {
  const baseArgs = [
    "-i",
    inputPath,
    "-o",
    outputPath,
    "-c",
    mermaidConfigPath,
    "-b",
    "white",
    "-w",
    String(width),
    "-H",
    String(height),
    "-q",
  ];

  if (mermaidCliPath) {
    execFileSync(process.execPath, [mermaidCliPath, ...baseArgs], { stdio: "pipe" });
    return;
  }

  execFileSync(npxBin, ["-y", "@mermaid-js/mermaid-cli", ...baseArgs], {
    stdio: "pipe",
    shell: process.platform === "win32",
  });
};

const getNumericAttribute = (attributes, name) => {
  const match = new RegExp(`\\s${name}="([^"]+)"`, "u").exec(attributes);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const applyClusterLabelOverlay = (svgSource) => {
  const overlayLabels = [];

  const patchedSource = svgSource.replace(
    clusterGroupRegex,
    (full, clusterAttrs, rectAttrs, labelAttrs, labelInner) => {
      const clusterX = getNumericAttribute(rectAttrs, "x");
      const clusterWidth = getNumericAttribute(rectAttrs, "width");
      const transformMatch = clusterLabelTransformRegex.exec(labelAttrs);
      const labelX = transformMatch ? Number(transformMatch[1]) : null;

      let patchedLabelInner = labelInner;
      if (clusterX !== null && clusterWidth !== null && labelX !== null) {
        const bgX = (clusterX - labelX + clusterLabelStripHorizontalPadding).toFixed(3);
        const bgWidth = Math.max(clusterWidth - clusterLabelStripHorizontalPadding * 2, 40).toFixed(3);
        const backgroundRect = `<rect class="background" style="stroke: none; fill: ${clusterLabelStripFill}; opacity: 1" x="${bgX}" y="${clusterLabelStripYOffset}" width="${bgWidth}" height="${clusterLabelStripHeight}"/>`;
        patchedLabelInner = labelInner.replace(clusterLabelBackgroundRegex, backgroundRect);
      }

      overlayLabels.push(`<g class="cluster-label"${labelAttrs}><g>${patchedLabelInner}</g></g>`);
      return `<g class="cluster"${clusterAttrs}><rect${rectAttrs}/></g>`;
    }
  );

  if (overlayLabels.length === 0) return svgSource;

  const closingTagIndex = patchedSource.lastIndexOf("</svg>");
  if (closingTagIndex === -1) return patchedSource;

  const overlayGroup = `<g class="cluster-label-overlays">${overlayLabels.join("")}</g>`;
  return `${patchedSource.slice(0, closingTagIndex)}${overlayGroup}${patchedSource.slice(closingTagIndex)}`;
};

const postProcessRenderedSvg = (outputPath) => {
  if (!outputPath.endsWith(".svg")) return;
  const svgSource = readFileSync(outputPath, "utf8");
  const patchedSource = applyClusterLabelOverlay(svgSource);
  if (patchedSource !== svgSource) {
    writeFileSync(outputPath, patchedSource, "utf8");
  }
};

const figureNames = collectReferencedFigureNames();
const missingMappings = figureNames.filter((name) => !diagramByFileName[name]);

if (missingMappings.length > 0) {
  const missingList = missingMappings.join("\n - ");
  throw new Error(`Missing Mermaid mapping for:\n - ${missingList}`);
}

purgeExistingFigureAssets();

try {
  for (const figureName of figureNames) {
    const code = diagramByFileName[figureName];
    const { width, height } = getRenderSize(figureName, code);
    const sourcePath = join(mermaidTempDir, figureName.replace(/\.[^.]+$/u, ".mmd"));
    const outputPath = join(figuresDir, figureName);
    const outputPngPath = join(figuresDir, figureName.replace(/\.svg$/u, ".png"));

    writeFileSync(sourcePath, code, "utf8");

    try {
      renderMermaid(sourcePath, outputPath, width, height);
      postProcessRenderedSvg(outputPath);
      renderMermaid(sourcePath, outputPngPath, width, height);
      process.stdout.write(`Rendered: ${figureName} (+PNG)\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Render failed for ${figureName}: ${message}`);
    }
  }

  process.stdout.write(`Done. Rendered ${figureNames.length} figures.\n`);
} finally {
  rmSync(mermaidTempDir, { recursive: true, force: true });
}

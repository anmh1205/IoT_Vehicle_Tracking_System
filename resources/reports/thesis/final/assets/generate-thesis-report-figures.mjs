import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { diagramByFileName } from "./thesis-mermaid-diagrams.mjs";

const assetsDir = dirname(fileURLToPath(import.meta.url));
const chaptersDir = dirname(assetsDir);
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
const cliArgs = process.argv.slice(2);

const getOptionValue = (optionName) => {
  const directArg = cliArgs.find((arg) => arg.startsWith(`${optionName}=`));
  if (directArg) {
    return directArg.slice(optionName.length + 1).trim();
  }

  const optionIndex = cliArgs.indexOf(optionName);
  if (optionIndex >= 0) {
    const nextArg = cliArgs[optionIndex + 1];
    if (nextArg && !nextArg.startsWith("--")) {
      return nextArg.trim();
    }
  }

  return null;
};

const normalizeFiguresSubdir = (value) =>
  (value ?? "figures")
    .replace(/\\/gu, "/")
    .replace(/^\.?\//u, "")
    .replace(/^assets\//u, "")
    .replace(/\/+$/u, "") || "figures";

const resolveCliPath = (value, baseDir) => (isAbsolute(value) ? value : join(baseDir, value));
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const reportArg = getOptionValue("--report");
const reportPath = reportArg ? resolveCliPath(reportArg, chaptersDir) : join(chaptersDir, "thesis-final-report.md");
const figuresSubdir = normalizeFiguresSubdir(getOptionValue("--figures-subdir"));
const figuresDir = join(assetsDir, ...figuresSubdir.split("/"));
const figureReferencePrefix = `assets/${figuresSubdir}/`;

mkdirSync(figuresDir, { recursive: true });

const imageExtension = /\.(svg|png|jpg|jpeg|webp)$/iu;
const renderSizeByFileName = {
  "01-chuong-1-gioi-thieu-hinh-1-2.svg": { width: 3600, height: 5000 },
  "01-chuong-1-gioi-thieu-hinh-1-3.svg": { width: 3600, height: 5000 },
  "01-chuong-1-gioi-thieu-hinh-1-5.svg": { width: 3600, height: 5200 },
  "02-chuong-2-phan-tich-hinh-2-1.svg": { width: 3200, height: 1800 },
  "03-chuong-3-giai-phap-phan-cung-hinh-3-3.svg": { width: 3000, height: 1700 },
  "05-chuong-3-giai-phap-backend-hinh-3-12a.svg": { width: 3400, height: 1800 },
  "05-chuong-3-giai-phap-backend-hinh-3-14a.svg": { width: 4200, height: 1800 },
  "06-chuong-3-giai-phap-frontend-hinh-3-17.svg": { width: 3200, height: 1900 },
  "06-chuong-3-giai-phap-frontend-hinh-3-18.svg": { width: 3200, height: 1900 },
  "06-chuong-3-giai-phap-frontend-hinh-3-20.svg": { width: 3400, height: 2100 },
  "07-chuong-4-trien-khai-hardware-hinh-4-1.svg": { width: 3400, height: 2000 },
  "07-chuong-4-trien-khai-hardware-hinh-4-5.svg": { width: 3800, height: 1800 },
  "07-chuong-4-trien-khai-hardware-hinh-4-2.svg": { width: 2800, height: 1500 },
  "07-chuong-4-trien-khai-hardware-hinh-4-6.svg": { width: 3400, height: 2000 },
  "07-chuong-4-trien-khai-hardware-hinh-4-12.svg": { width: 3400, height: 1800 },
  "07-chuong-4-trien-khai-hardware-hinh-4-9.svg": { width: 3200, height: 1900 },
  "07-chuong-4-trien-khai-hardware-hinh-4-13.svg": { width: 3400, height: 2200 },
  "07-chuong-4-trien-khai-hardware-hinh-4-14.svg": { width: 3600, height: 1800 },
  "09-chuong-4-trien-khai-cloud-hinh-4-15.svg": { width: 3800, height: 2300 },
  "09-chuong-4-trien-khai-cloud-hinh-4-20.svg": { width: 3200, height: 1900 },
  "09-chuong-4-trien-khai-cloud-hinh-4-21.svg": { width: 3200, height: 1900 },
  "09-chuong-4-trien-khai-cloud-hinh-4-22.svg": { width: 3400, height: 2100 },
  "09-chuong-4-trien-khai-cloud-hinh-4-23.svg": { width: 3200, height: 1900 },
  "09-chuong-4-trien-khai-cloud-hinh-4-16.svg": { width: 2800, height: 2600 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-20.svg": { width: 3200, height: 1900 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-23.svg": { width: 5200, height: 1500 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-27.svg": { width: 5200, height: 1500 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-30.svg": { width: 5200, height: 1500 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-38.svg": { width: 5200, height: 1500 },
  "10-chuong-4-ket-qua-do-luong-hinh-4-33.svg": { width: 3600, height: 2100 },
  "06-chuong-3-giai-phap-frontend-hinh-3-19a.svg": { width: 3200, height: 2000 },
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

const parseOnlyArgs = () => {
  const directOnlyArg = cliArgs.find((arg) => arg.startsWith("--only="));
  if (directOnlyArg) {
    return directOnlyArg
      .slice("--only=".length)
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean);
  }

  const onlyIndex = cliArgs.indexOf("--only");
  if (onlyIndex >= 0) {
    return cliArgs
      .slice(onlyIndex + 1)
      .filter((arg) => !arg.startsWith("--"))
      .flatMap((arg) => arg.split(","))
      .map((name) => name.trim())
      .filter(Boolean);
  }

  return [];
};

const hasFlag = (flag) => cliArgs.includes(flag);

const collectReferencedFigureNames = () => {
  const figureNameRegex = new RegExp(`(?:\\.\\/)?${escapeRegExp(figureReferencePrefix)}([^\\s)]+)`, "gu");
  const names = new Set();
  const content = readFileSync(reportPath, "utf8");

  let match = figureNameRegex.exec(content);
  while (match) {
    names.add(match[1]);
    match = figureNameRegex.exec(content);
  }

  return [...names].sort();
};

const purgeExistingFigureAssets = (figureNames) => {
  for (const figureName of figureNames) {
    const svgPath = join(figuresDir, figureName);
    const pngPath = join(figuresDir, figureName.replace(/\.svg$/u, ".png"));
    rmSync(svgPath, { force: true });
    rmSync(pngPath, { force: true });
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

const normalizeFigureName = (name) => (name.endsWith(".svg") ? name : `${name}.svg`);
const requestedOnlyNames = parseOnlyArgs().map(normalizeFigureName);
const chapter4FigureNames = collectReferencedFigureNames().filter((name) => /^(?:07|08|09|10)-chuong-4-/u.test(name));
const figureNames = requestedOnlyNames.length > 0
  ? requestedOnlyNames
  : hasFlag("--chapter4")
    ? chapter4FigureNames
    : collectReferencedFigureNames();
const missingMappings = figureNames.filter((name) => !diagramByFileName[name]);

if (missingMappings.length > 0) {
  const missingList = missingMappings.join("\n - ");
  throw new Error(`Missing Mermaid mapping for:\n - ${missingList}`);
}

purgeExistingFigureAssets(figureNames);

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

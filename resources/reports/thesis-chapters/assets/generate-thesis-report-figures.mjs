import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diagramByFileName } from "./thesis-mermaid-diagrams.mjs";

const projectRoot = process.cwd();
const chaptersDir = join(projectRoot, "resources", "reports", "thesis-chapters");
const assetsDir = join(chaptersDir, "assets");
const figuresDir = join(assetsDir, "figures");
const mermaidConfigPath = join(assetsDir, "mermaid-thesis-config.json");
const mermaidTempDir = mkdtempSync(join(tmpdir(), "ivts-thesis-mermaid-"));
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

mkdirSync(figuresDir, { recursive: true });

const imageExtension = /\.(svg|png|jpg|jpeg|webp)$/iu;

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

const getRenderSize = (code) => {
  const source = code.trimStart();
  if (source.startsWith("sequenceDiagram")) return { width: 2600, height: 1600 };
  if (source.startsWith("stateDiagram")) return { width: 2400, height: 1500 };
  if (source.startsWith("mindmap")) return { width: 2300, height: 1700 };
  if (source.startsWith("gantt")) return { width: 2400, height: 1400 };
  if (source.startsWith("xychart-beta")) return { width: 2300, height: 1300 };
  if (source.startsWith("radar-beta")) return { width: 2200, height: 1400 };
  if (source.startsWith("block-beta")) return { width: 2300, height: 1500 };
  if (source.startsWith("erDiagram")) return { width: 2400, height: 1600 };
  return { width: 2300, height: 1500 };
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
    const { width, height } = getRenderSize(code);
    const sourcePath = join(mermaidTempDir, figureName.replace(/\.[^.]+$/u, ".mmd"));
    const outputPath = join(figuresDir, figureName);

    writeFileSync(sourcePath, code, "utf8");

    try {
      renderMermaid(sourcePath, outputPath, width, height);
      process.stdout.write(`Rendered: ${figureName}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Render failed for ${figureName}: ${message}`);
    }
  }

  process.stdout.write(`Done. Rendered ${figureNames.length} figures.\n`);
} finally {
  rmSync(mermaidTempDir, { recursive: true, force: true });
}

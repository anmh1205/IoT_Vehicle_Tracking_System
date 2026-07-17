import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = dirname(fileURLToPath(import.meta.url));
const umlDir = join(assetsDir, "uml");
const figuresDir = join(assetsDir, "figures");
const configPath = join(assetsDir, "mermaid-config.json");
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

mkdirSync(figuresDir, { recursive: true });

const renderSizeByName = {
  "firmware-source-overview": { width: 2600, height: 1800 },
  "firmware-startup-sequence": { width: 2600, height: 1700 },
  "firmware-runtime-state-machine": { width: 2500, height: 1800 },
  "firmware-connectivity-and-telemetry-flow": { width: 2800, height: 2000 },
  "firmware-command-and-ota-sequence": { width: 2600, height: 1800 },
  "firmware-offline-queue-and-replay-flow": { width: 2800, height: 1900 },
  "firmware-hardware-software-boundary": { width: 3000, height: 1800 }
};

const findCachedMermaidCli = () => {
  const cacheRoots = [
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "npm-cache", "_npx"),
    process.env.APPDATA && join(process.env.APPDATA, "npm-cache", "_npx")
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

const renderMermaid = (inputPath, outputPath, width, height) => {
  const args = [
    "-i",
    inputPath,
    "-o",
    outputPath,
    "-c",
    configPath,
    "-b",
    "white",
    "-w",
    String(width),
    "-H",
    String(height),
    "-q"
  ];

  if (mermaidCliPath) {
    execFileSync(process.execPath, [mermaidCliPath, ...args], { stdio: "pipe" });
    return;
  }

  execFileSync(npxBin, ["-y", "@mermaid-js/mermaid-cli", ...args], {
    stdio: "pipe",
    shell: process.platform === "win32"
  });
};

for (const entry of readdirSync(figuresDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!/\.(svg|png)$/iu.test(entry.name)) continue;
  rmSync(join(figuresDir, entry.name), { force: true });
}

const diagramFiles = readdirSync(umlDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".mmd"))
  .map((entry) => entry.name)
  .sort();

for (const fileName of diagramFiles) {
  const { name } = parse(fileName);
  const { width, height } = renderSizeByName[name] ?? { width: 2600, height: 1700 };
  const sourcePath = join(umlDir, fileName);
  const svgPath = join(figuresDir, `${name}.svg`);
  const pngPath = join(figuresDir, `${name}.png`);

  renderMermaid(sourcePath, svgPath, width, height);
  renderMermaid(sourcePath, pngPath, width, height);
  process.stdout.write(`Rendered ${name}\n`);
}

process.stdout.write(`Done. Rendered ${diagramFiles.length} diagrams.\n`);

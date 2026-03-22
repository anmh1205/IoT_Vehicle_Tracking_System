import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = dirname(fileURLToPath(import.meta.url));
const umlDir = join(assetsDir, "uml");
const sourceExtension = ".mmd";
const outputExtension = ".svg";

const loadDiagramEntries = () =>
  readdirSync(umlDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(sourceExtension))
    .map((entry) => {
      const sourceName = entry.name;
      const outputName = sourceName.slice(0, -sourceExtension.length) + outputExtension;
      const code = readFileSync(join(umlDir, sourceName), "utf8").trim();
      return [outputName, code];
    })
    .sort(([left], [right]) => left.localeCompare(right));

export const diagramByFileName = Object.fromEntries(loadDiagramEntries());

export const mermaidDiagrams = Object.entries(diagramByFileName).map(([name, code]) => ({
  name,
  code,
}));

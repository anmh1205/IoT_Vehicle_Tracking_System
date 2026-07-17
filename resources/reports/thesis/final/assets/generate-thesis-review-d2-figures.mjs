import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const assetsDir = dirname(fileURLToPath(import.meta.url));
const reviewSetDir = join(assetsDir, "review-set");
const manifestPath = join(reviewSetDir, "manifest.json");
const figuresDir = join(reviewSetDir, "figures");
const canonicalFiguresDir = join(assetsDir, "figures");
const imageExtension = /\.svg$/iu;

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
const dockerImage = manifest.d2DockerImage || "terrastruct/d2:v0.7.1";
const localD2Bin = process.env.THESIS_D2_BIN || "d2";

const toPosixPath = (value) => value.replace(/\\/gu, "/");

const isWithinDirectory = (baseDir, targetPath) => {
  const relativePath = relative(baseDir, targetPath);
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
};

const resolveInsideDirectory = (baseDir, candidatePath, label) => {
  const resolvedPath = resolve(baseDir, candidatePath);
  if (!isWithinDirectory(baseDir, resolvedPath)) {
    throw new Error(`${label} escapes allowed directory: ${candidatePath}`);
  }
  return resolvedPath;
};

const resolveFromDirectory = (baseDir, candidatePath) => resolve(baseDir, candidatePath);

const purgeExistingFigureAssets = () => {
  mkdirSync(figuresDir, { recursive: true });
  for (const entry of readdirSync(figuresDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!imageExtension.test(entry.name)) continue;
    rmSync(join(figuresDir, entry.name), { force: true });
  }
};

const validateManifest = () => {
  if (entries.length === 0) {
    throw new Error("Review-set manifest has no entries.");
  }

  const seenOutputs = new Set();

  return entries.map((entry) => {
    if (!entry.source || !entry.output || !entry.figure) {
      throw new Error(`Invalid manifest entry: ${JSON.stringify(entry)}`);
    }

    const sourcePath = resolveInsideDirectory(reviewSetDir, entry.source, `Source path for ${entry.figure}`);
    const outputPath = resolveInsideDirectory(reviewSetDir, entry.output, `Output path for ${entry.figure}`);
    const canonicalPath = entry.canonical
      ? resolveFromDirectory(reviewSetDir, entry.canonical)
      : null;

    if (!isWithinDirectory(figuresDir, outputPath)) {
      throw new Error(`Output path must stay inside review-set/figures: ${entry.output}`);
    }

    if (!imageExtension.test(outputPath)) {
      throw new Error(`Output path must be an SVG: ${entry.output}`);
    }

    if (basename(outputPath) !== entry.figure) {
      throw new Error(`Output basename must match figure name: ${entry.figure}`);
    }

    if (seenOutputs.has(outputPath)) {
      throw new Error(`Duplicate output path in manifest: ${entry.output}`);
    }
    seenOutputs.add(outputPath);

    if (!existsSync(sourcePath)) {
      throw new Error(`Missing D2 source: ${sourcePath}`);
    }

    if (canonicalPath) {
      if (!isWithinDirectory(canonicalFiguresDir, canonicalPath)) {
        throw new Error(`Canonical path must stay inside assets/figures: ${entry.canonical}`);
      }
      if (!existsSync(canonicalPath)) {
        throw new Error(`Missing canonical comparison asset: ${canonicalPath}`);
      }
    }

    return {
      ...entry,
      sourcePath,
      outputPath,
      canonicalPath,
    };
  });
};

const canUseLocalD2 = () => {
  try {
    execFileSync(localD2Bin, ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

const canUseDocker = () => {
  try {
    execFileSync("docker", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

const renderWithLocalD2 = (inputPath, outputPath) => {
  execFileSync(localD2Bin, [inputPath, outputPath], { stdio: "pipe" });
};

const renderWithDocker = (inputPath, outputPath) => {
  const mountedDir = toPosixPath(reviewSetDir);
  const dockerWorkDir = "/work";
  const dockerInput = toPosixPath(relative(reviewSetDir, inputPath));
  const dockerOutput = toPosixPath(relative(reviewSetDir, outputPath));

  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "-v",
      `${mountedDir}:${dockerWorkDir}`,
      "-w",
      dockerWorkDir,
      dockerImage,
      dockerInput,
      dockerOutput,
    ],
    { stdio: "pipe" }
  );
};

const createRenderer = () => {
  if (canUseLocalD2()) {
    return { name: `local:${localD2Bin}`, run: renderWithLocalD2 };
  }

  if (canUseDocker()) {
    return { name: `docker:${dockerImage}`, run: renderWithDocker };
  }

  throw new Error("D2 renderer unavailable. Install d2 or enable Docker.");
};

const validatedEntries = validateManifest();
const renderer = createRenderer();
const tempOutputDir = mkdtempSync(join(reviewSetDir, ".tmp-d2-render-"));

try {
  for (const entry of validatedEntries) {
    const tempOutputPath = join(tempOutputDir, entry.figure);

    try {
      renderer.run(entry.sourcePath, tempOutputPath);
      if (!existsSync(tempOutputPath)) {
        throw new Error(`Renderer did not create output: ${tempOutputPath}`);
      }
      process.stdout.write(`Rendered review figure: ${entry.figure} via ${renderer.name}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to render ${entry.figure}: ${message}`);
    }
  }

  purgeExistingFigureAssets();

  for (const entry of validatedEntries) {
    const tempOutputPath = join(tempOutputDir, entry.figure);
    mkdirSync(dirname(entry.outputPath), { recursive: true });
    copyFileSync(tempOutputPath, entry.outputPath);
  }

  const renderedFigureNames = readdirSync(figuresDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtension.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (renderedFigureNames.length !== validatedEntries.length) {
    throw new Error(`Expected ${validatedEntries.length} outputs but found ${renderedFigureNames.length}.`);
  }

  process.stdout.write(`Done. Rendered ${renderedFigureNames.length} review figures.\n`);
} finally {
  rmSync(tempOutputDir, { recursive: true, force: true });
}

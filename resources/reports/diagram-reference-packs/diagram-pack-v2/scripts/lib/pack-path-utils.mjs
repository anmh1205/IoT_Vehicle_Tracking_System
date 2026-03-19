import { existsSync } from "node:fs";
import { dirname, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const getPackRoot = (metaUrl) => resolve(dirname(fileURLToPath(metaUrl)), "..");

export const resolvePackPath = (packRoot, relativePath) => {
  const normalized = normalize(relativePath);
  const absolute = resolve(packRoot, normalized);
  ensureInsidePack(packRoot, absolute, `Path escapes pack root: ${relativePath}`);
  return absolute;
};

export const ensureInsidePack = (packRoot, absolutePath, errorMessage) => {
  const rel = relative(packRoot, absolutePath);
  const isOutside = rel.startsWith("..") || rel.includes(`${sep}..${sep}`) || rel === "..";
  if (isOutside) {
    throw new Error(errorMessage);
  }
};

export const ensureSafeRelativePath = (relativePath, fieldName) => {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  if (relativePath.startsWith("/") || /^[A-Za-z]:/.test(relativePath)) {
    throw new Error(`${fieldName} must be relative: ${relativePath}`);
  }
  const normalized = normalize(relativePath);
  if (normalized === ".." || normalized.startsWith(`..${sep}`)) {
    throw new Error(`${fieldName} cannot traverse parent directories: ${relativePath}`);
  }
  return normalized;
};

export const ensureFileExists = (absolutePath, fieldName) => {
  if (!existsSync(absolutePath)) {
    throw new Error(`${fieldName} does not exist: ${absolutePath}`);
  }
};

export const toPosixPath = (pathValue) => pathValue.replace(/\\/g, "/");

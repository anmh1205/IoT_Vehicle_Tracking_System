import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const sha256FromFile = (absolutePath) => {
  const hash = createHash("sha256");
  hash.update(readFileSync(absolutePath));
  return hash.digest("hex");
};

export const sha256FromText = (text) => {
  const hash = createHash("sha256");
  hash.update(text, "utf8");
  return hash.digest("hex");
};

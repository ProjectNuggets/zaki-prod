import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(websiteRoot, "launch-draft");
const output = resolve(websiteRoot, "dist");

await rm(output, { force: true, recursive: true });
await cp(source, output, { recursive: true });

console.log("Built frozen launch draft into website/dist");

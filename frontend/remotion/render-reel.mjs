import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return "";
  }
  return process.argv[index + 1] || "";
}

const inputPath = readArg("--input");
const outputPath = readArg("--output");

if (!inputPath || !outputPath) {
  console.error("Usage: npm run render:reel -- --input <json> --output <mp4>");
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const inputProps = {
  title: raw.title || "Scholars Republic Reel",
  reelType: raw.reel_type || raw.reelType || "single_scholarship",
  templateKey: raw.template_key || raw.templateKey || "single_scholarship_premium_v3",
  durationSeconds: Number(raw.duration_seconds || raw.durationSeconds || 5),
  scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
};

const entryPoint = path.join(__dirname, "src", "index.ts");
const serveUrl = await bundle({
  entryPoint,
  webpackOverride: (config) => config,
});

const composition = await selectComposition({
  serveUrl,
  id: "scholars-republic-social-reel",
  inputProps,
});

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outputPath,
  inputProps,
  chromiumOptions: {
    gl: "angle",
  },
});

console.log(
  JSON.stringify({
    ok: true,
    renderer_used: "remotion",
    output: outputPath,
    duration_seconds: inputProps.durationSeconds,
  }),
);

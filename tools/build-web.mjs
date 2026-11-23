#!/usr/bin/env node
// Builds the files the app actually ships, into web/dist:
//   three.min.js        three.js r128 trimmed to the classes the scene uses (506 KB instead of 589 KB)
//   app.bundle.min.js   core/keyboard/fur/cat/behavior concatenated in load order, minified (49 KB instead of 97 KB)
// Everything else in web/dist is copied, so `web/` stays the editable source and `web/dist` is what
// Tauri embeds and mac/build.sh puts in the .app. Run it after editing anything in web/, then commit.
//
//   npm install && npm run build:web
import { build } from "esbuild";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const web = join(root, "web");
const dist = join(web, "dist");

// Every `THREE.*` name web/ references, minus the two the regex picks up from comments ("THREE.js").
// Adding a class to the scene means adding it here, or three.min.js will throw at runtime.
const THREE_NAMES = [
  "BackSide", "BufferAttribute", "BufferGeometry", "CanvasTexture", "CatmullRomCurve3",
  "CircleGeometry", "Color", "CylinderGeometry", "ExtrudeGeometry", "Float32BufferAttribute",
  "Group", "LatheGeometry", "Mesh", "MeshBasicMaterial", "PerspectiveCamera", "PlaneGeometry",
  "Raycaster", "Scene", "ShaderMaterial", "Shape", "ShapeGeometry", "SphereGeometry",
  "SplineCurve", "Sprite", "SpriteMaterial", "TorusGeometry", "Vector2", "Vector3", "WebGLRenderer",
];

// index.html loads these in this order and they talk to each other through top-level names,
// so they have to end up in one shared scope: one IIFE, minified as a whole.
const APP_FILES = ["core.js", "keyboard.js", "fur.js", "cat.js", "behavior.js"];

// Shipped as-is: settings.html loads tuning.js itself and both are read by the native shell.
const COPIED = ["tuning.js", "settings.html", "THREE_LICENSE"];

const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";

async function writeThree() {
  const entry = "export { " + THREE_NAMES.join(", ") + ' } from "three";\n';
  const result = await build({
    stdin: { contents: entry, resolveDir: root, loader: "js" },
    bundle: true,
    minify: true,
    format: "iife",
    globalName: "THREE",
    target: "es2018",
    legalComments: "none", // the MIT text ships as web/THREE_LICENSE
    write: false,
  });
  const code = result.outputFiles[0].contents;
  await writeFile(join(dist, "three.min.js"), code);
  return code.length;
}

async function writeBundle() {
  const parts = await Promise.all(
    APP_FILES.map(async (name) => "// ---- " + name + " ----\n" + await readFile(join(web, name), "utf8")),
  );
  const source = '(function () {\n"use strict";\n' + parts.join("\n") + "\n})();\n";
  const result = await build({
    stdin: { contents: source, resolveDir: web, loader: "js" },
    minify: true,
    legalComments: "none",
    target: "es2018",
    write: false,
  });
  const code = result.outputFiles[0].contents;
  await writeFile(join(dist, "app.bundle.min.js"), code);
  return code.length;
}

// The dev page loads the five sources one by one; the shipped page loads the single bundle.
// Only the tags are touched, so the file keeps its line endings and indentation.
async function writeIndexHtml() {
  const dev = await readFile(join(web, "index.html"), "utf8");
  const tags = APP_FILES.map((name) => '<script src="' + name + '"></script>').join("\\s*");
  const pattern = new RegExp(tags);
  if (!pattern.test(dev)) {
    throw new Error("web/index.html no longer lists the sources in the expected order");
  }
  const shipped = dev.replace(pattern, '<script src="app.bundle.min.js"></script>');
  await writeFile(join(dist, "index.html"), shipped);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const threeBytes = await writeThree();
const bundleBytes = await writeBundle();
await writeIndexHtml();
for (const name of COPIED) await copyFile(join(web, name), join(dist, name));

const three = await readFile(join(dist, "three.min.js"));
const app = await readFile(join(dist, "app.bundle.min.js"));
console.log(
  "web/dist ready: three.min.js " + kb(threeBytes) + " (gzip " + kb(gzipSync(three).length) + "), " +
  "app.bundle.min.js " + kb(bundleBytes) + " (gzip " + kb(gzipSync(app).length) + ")",
);

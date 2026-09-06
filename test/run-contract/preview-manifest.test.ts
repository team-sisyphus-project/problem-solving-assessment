import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Run contract verification.
 *
 * The repo root contains a *source* `index.html` (the Vite entry, pointing at
 * `/src/app/main.tsx`). Auto-detection could read that as a plain static site
 * and serve the unbuilt source, which no static server can execute. `preview.toml`
 * removes the ambiguity by declaring the build-static shape. These tests pin the
 * three facts the preview runtime depends on:
 *
 *   1. the manifest declares build-static + the real build command + `dist/`;
 *   2. `package.json` actually exposes that build command;
 *   3. the built `index.html` references its assets by absolute root path, so an
 *      SPA history fallback never shadows a real asset request.
 *
 * (3) is asserted against the built output when it exists, and skipped on a
 * clean checkout where `dist/` has not been produced yet.
 */

const repoRoot = resolve(__dirname, "..", "..");

/**
 * Minimal reader for the flat `key = "value"` / `[section]` subset of TOML that
 * `preview.toml` uses. Deliberately not a general TOML parser — the run contract
 * is not worth a dependency, and a narrow reader fails loudly on anything richer
 * than the shape it claims to understand.
 */
function readManifest(source: string): Record<string, string> {
  const entries: Record<string, string> = {};
  let section = "";

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const sectionMatch = /^\[([A-Za-z0-9_.-]+)\]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      continue;
    }

    const pairMatch = /^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"$/.exec(line);
    if (!pairMatch) {
      throw new Error(`preview.toml line is not a supported key/value pair: ${line}`);
    }
    const [, key, value] = pairMatch;
    entries[section ? `${section}.${key}` : key] = value;
  }

  return entries;
}

function read(relativePath: string): string {
  return readFileSync(resolve(repoRoot, relativePath), "utf8");
}

describe("preview.toml run contract", () => {
  const manifest = readManifest(read("preview.toml"));

  it("declares the build-static run shape", () => {
    expect(manifest.model).toBe("build-static");
  });

  it("points serving at Vite's build output and the injected port variable", () => {
    expect(manifest["serve.static_dir"]).toBe("dist");
    expect(manifest["serve.port_env"]).toBe("PORT");
  });

  it("declares a build command that package.json actually provides", () => {
    const command = manifest["build.command"];
    expect(command).toBe("npm run build");

    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
    expect(scripts.build).toBeTruthy();
  });
});

describe("built output asset paths", () => {
  let builtHtml: string | null = null;
  try {
    builtHtml = read("dist/index.html");
  } catch {
    builtHtml = null;
  }

  it.runIf(builtHtml !== null)(
    "references assets by absolute root path so the SPA fallback cannot shadow them",
    () => {
      const references = [...(builtHtml as string).matchAll(/(?:src|href)="([^"]+)"/g)].map(
        (match) => match[1],
      );

      expect(references.length).toBeGreaterThan(0);
      for (const reference of references) {
        expect(reference.startsWith("/assets/")).toBe(true);
      }
    },
  );

  it.runIf(builtHtml !== null)("no longer references unbuilt TypeScript sources", () => {
    expect(builtHtml as string).not.toContain("/src/");
  });
});

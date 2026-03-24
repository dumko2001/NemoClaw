// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { verifyBlueprintDigest, checkCompatibility } from "../nemoclaw/src/blueprint/verify.ts";

const require = createRequire(import.meta.url);

describe("Blueprint Verification (H11)", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nemoclaw-test-h11-"));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("fails if digest is missing", () => {
    const manifest = { version: "1.0.0" };
    const result = verifyBlueprintDigest(tmpDir, manifest);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes("Security Error: Blueprint manifest is missing a 'digest'"))).toBe(true);
  });

  test("hashing ignores artifacts and blueprint.yaml", () => {
    // SHA-256 of empty input (when all files are ignored)
    const emptyDigest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    fs.writeFileSync(path.join(tmpDir, "blueprint.yaml"), "version: 1.0.0");
    fs.mkdirSync(path.join(tmpDir, ".git"));
    fs.writeFileSync(path.join(tmpDir, ".git", "config"), "bogus");

    // The digest should be based on an empty list of files because .git and blueprint.yaml are ignored
    const result = verifyBlueprintDigest(tmpDir, { digest: emptyDigest, version: "1.0.0" });

    // It should be valid because the actual digest should match the empty digest
    expect(result.valid).toBe(true);
    expect(result.actualDigest).toBe(emptyDigest);
  });

  test("ignores symbolic links (security hardening)", () => {
    const subDir = path.join(tmpDir, "real-dir");
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, "file.txt"), "hello");

    // Create a symlink to another file
    const symlinkPath = path.join(tmpDir, "link-to-file");
    fs.symlinkSync(path.join(subDir, "file.txt"), symlinkPath);

    // Create a circular symlink
    const circularPath = path.join(tmpDir, "circle");
    fs.symlinkSync(tmpDir, circularPath);

    const result = verifyBlueprintDigest(tmpDir, { digest: "any", version: "1.0.0" });

    // The digest should only include 'real-dir/file.txt'.
    // If it tried to follow 'circle', it would have crashed or included everything.
    // If it included 'link-to-file', the hash would be different.

    const digestBefore = result.actualDigest;
    fs.symlinkSync(subDir, path.join(tmpDir, "link-to-dir"));

    const result2 = verifyBlueprintDigest(tmpDir, { digest: "any", version: "1.0.0" });
    expect(result2.actualDigest).toBe(digestBefore);
  });

  test("satisfiesMinVersion handles pre-release tags", () => {
    const manifest = {
      version: "1.0.0",
      minOpenShellVersion: "1.5.0",
      minOpenClawVersion: "2.0.0",
      digest: "any",
      profiles: ["default"]
    };

    // 1.5.0-beta should be < 1.5.0
    const errors = checkCompatibility(manifest, "1.5.0-beta", "2.0.0");
    expect(errors.some(e => e.includes("OpenShell version 1.5.0-beta < required 1.5.0"))).toBe(true);

    // 1.5.1-alpha should be > 1.5.0
    const noErrors = checkCompatibility(manifest, "1.5.1-alpha", "2.0.0");
    expect(noErrors.length).toBe(0);
  });
});

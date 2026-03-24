// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI_PATH = path.join(ROOT, "bin/nemoclaw.js");

describe("credential-isolation (static analysis)", () => {
  const content = fs.readFileSync(CLI_PATH, "utf-8");

  it("ensures setup() spreads process.env when passing NVIDIA_API_KEY", () => {
    // Look for: run(`bash "${SCRIPTS}/setup.sh" ...`, { env: { ...process.env, NVIDIA_API_KEY: key } });
    const match = content.match(/async function setup\(\) \{[\s\S]*?run\(`bash "\$\{SCRIPTS\}\/setup\.sh" \$\{shellQuote\(safeName\)\}`, \{\s*env:\s*\{\s*\.\.\.process\.env,\s*NVIDIA_API_KEY:\s*key\s*\}\s*\}\);/);
    expect(match, "setup() should spread process.env and pass NVIDIA_API_KEY").not.toBeNull();
  });

  it("ensures setupSpark() spreads process.env when passing NVIDIA_API_KEY", () => {
    // Look for: run(`sudo -E bash "${SCRIPTS}/setup-spark.sh"`, { env: { ...process.env, NVIDIA_API_KEY: key } });
    const match = content.match(/async function setupSpark\(\) \{[\s\S]*?run\(`sudo -E bash "\$\{SCRIPTS\}\/setup-spark\.sh"`, \{\s*env:\s*\{\s*\.\.\.process\.env,\s*NVIDIA_API_KEY:\s*key\s*\}\s*\}\);/);
    expect(match, "setupSpark() should spread process.env and pass NVIDIA_API_KEY").not.toBeNull();
  });

  it("ensures deploy() is clean", () => {
    // We reverted deploy() to main state, so it should not have the env.NVIDIA_API_KEY logic from #172.
    // Instead, we verify it's back to using process.env (legacy) or just verify it doesn't have the #172 pattern.
    const match = content.match(/const envLines = \[`NVIDIA_API_KEY=\$\{shellQuote\(env\.NVIDIA_API_KEY \|\| ""\)\}`\];/);
    expect(match, "deploy() should NOT have the #172 pattern after revert").toBeNull();
  });
});

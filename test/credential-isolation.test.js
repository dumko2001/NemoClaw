// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const CLI_PATH = path.join(ROOT, "bin/nemoclaw.js");

describe("credential-isolation (static analysis)", () => {
  const content = fs.readFileSync(CLI_PATH, "utf-8");

  it("ensures setup() spreads process.env when passing NVIDIA_API_KEY", () => {
    // Look for: run(`bash "${SCRIPTS}/setup.sh" ${shellQuote(safeName)}`, { env: { ...process.env, NVIDIA_API_KEY: key } });
    const match = content.match(/async function setup\(\) \{[\s\S]*?run\(`bash "\$\{SCRIPTS\}\/setup\.sh" \$\{shellQuote\(safeName\)\}`, \{ env: \{ \.\.\.process\.env, NVIDIA_API_KEY: key \} \}\);/);
    expect(match, "setup() should spread process.env and pass NVIDIA_API_KEY").not.toBeNull();
  });

  it("ensures setupSpark() spreads process.env when passing NVIDIA_API_KEY", () => {
    // Look for: run(`sudo -E bash "${SCRIPTS}/setup-spark.sh"`, { env: { ...process.env, NVIDIA_API_KEY: key } });
    const match = content.match(/async function setupSpark\(\) \{[\s\S]*?run\(`sudo -E bash "\$\{SCRIPTS\}\/setup-spark\.sh"`, \{ env: \{ \.\.\.process\.env, NVIDIA_API_KEY: key \} \}\);/);
    expect(match, "setupSpark() should spread process.env and pass NVIDIA_API_KEY").not.toBeNull();
  });

  it("ensures deploy() reads NVIDIA_API_KEY from local env object", () => {
    // Look for: const envLines = [`NVIDIA_API_KEY=${shellQuote(env.NVIDIA_API_KEY || "")}`];
    const match = content.match(/const envLines = \[`NVIDIA_API_KEY=\$\{shellQuote\(env\.NVIDIA_API_KEY \|\| ""\)\}`\];/);
    expect(match, "deploy() should read NVIDIA_API_KEY from env.NVIDIA_API_KEY").not.toBeNull();
  });

  it("ensures deploy() reads GITHUB_TOKEN from local env object", () => {
    // Look for: const ghToken = env.GITHUB_TOKEN;
    const match = content.match(/const ghToken = env\.GITHUB_TOKEN;/);
    expect(match, "deploy() should read GITHUB_TOKEN from env.GITHUB_TOKEN").not.toBeNull();
  });
});

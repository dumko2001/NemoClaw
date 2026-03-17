// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const { execSync, spawnSync } = require("child_process");
const path = require("path");
const { detectDockerHost } = require("./platform");

const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPTS = path.join(ROOT, "scripts");

const dockerHost = detectDockerHost();
if (dockerHost) {
  process.env.DOCKER_HOST = dockerHost.dockerHost;
}

function run(cmd, opts = {}) {
  if (!Array.isArray(cmd)) {
    throw new Error(`Command must be an array of arguments (argv), got: ${typeof cmd}`);
  }

  const exe = cmd[0];
  const args = cmd.slice(1);

  const { env: extraEnv, ...rest } = opts;
  const result = spawnSync(exe, args, {
    stdio: rest.stdio || "inherit",
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    ...rest,
  });

  if (result.status !== 0 && !opts.ignoreError) {
    const cmdStr = cmd.join(" ");
    console.error(`  Command failed (exit ${result.status}): ${cmdStr.slice(0, 80)}`);
    process.exit(result.status || 1);
  }
  return result;
}

function runCapture(cmd, opts = {}) {
  if (!Array.isArray(cmd)) {
    throw new Error(`Command must be an array of arguments (argv), got: ${typeof cmd}`);
  }

  const exe = cmd[0];
  const args = cmd.slice(1);

  try {
    const { env: extraEnv, stdio, encoding, ...rest } = opts;
    const result = spawnSync(exe, args, {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: stdio || ["pipe", "pipe", "pipe"],
      encoding: encoding || "utf-8",
      ...rest,
    });

    if (result.status !== 0 && !opts.ignoreError) {
      throw new Error(`Command failed with status ${result.status}`);
    }

    const stdout = result.stdout || "";
    // Ensure we have a string if encoding was null or overridden
    return (typeof stdout === "string" ? stdout : stdout.toString("utf-8")).trim();
  } catch (err) {
    if (opts.ignoreError) return "";
    throw err;
  }
}

function runInteractive(cmd, opts = {}) {
  const stdio = opts.stdio ?? "inherit";
  const result = spawnSync("bash", ["-c", cmd], {
    ...opts,
    stdio,
    cwd: ROOT,
    env: { ...process.env, ...opts.env },
  });

  if (result.status !== 0 && !opts.ignoreError) {
    console.error(`  Command failed (exit ${result.status}): ${cmd.slice(0, 80)}`);
    process.exit(result.status || 1);
  }
  return result;
}

/**
 * Shell-quote a value for safe interpolation into bash -c strings.
 * Wraps in single quotes and escapes embedded single quotes.
 */
function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

/**
 * Validate a name (sandbox, instance, container) against RFC 1123 label rules.
 * Rejects shell metacharacters, path traversal, and empty/overlength names.
 */
function validateName(name, label = "name") {
  if (!name || typeof name !== "string") {
    throw new Error(`${label} is required`);
  }
  if (name.length > 63) {
    throw new Error(`${label} too long (max 63 chars): '${name.slice(0, 20)}...'`);
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    throw new Error(
      `Invalid ${label}: '${name}'. Must be lowercase alphanumeric with optional internal hyphens.`
    );
  }
  return name;
}

module.exports = { ROOT, SCRIPTS, run, runCapture, runInteractive, shellQuote, validateName };

const require = (await import('node:module')).createRequire(import.meta.url); const __chunk_filename = (await import('node:url')).fileURLToPath(import.meta.url); const __chunk_dirname = (await import('node:path')).dirname(__chunk_filename);
import {
  Config,
  glob,
  processSingleFileContent
} from "./chunk-MOTPSGOQ.js";

// packages/core/dist/src/test-utils/config.js
var DEFAULT_CONFIG_PARAMETERS = {
  usageStatisticsEnabled: true,
  debugMode: false,
  sessionId: "test-session-id",
  proxy: void 0,
  model: "gemini-9001-super-duper",
  targetDir: "/",
  cwd: "/"
};
function makeFakeConfig(config = {
  ...DEFAULT_CONFIG_PARAMETERS
}) {
  return new Config({
    ...DEFAULT_CONFIG_PARAMETERS,
    ...config
  });
}

// packages/core/dist/src/utils/pathReader.js
import { promises as fs } from "node:fs";
import path from "node:path";
async function readPathFromWorkspace(pathStr, config) {
  const workspace = config.getWorkspaceContext();
  const fileService = config.getFileService();
  let absolutePath = null;
  if (path.isAbsolute(pathStr)) {
    if (!workspace.isPathWithinWorkspace(pathStr)) {
      throw new Error(`Absolute path is outside of the allowed workspace: ${pathStr}`);
    }
    absolutePath = pathStr;
  } else {
    const searchDirs = workspace.getDirectories();
    for (const dir of searchDirs) {
      const potentialPath = path.resolve(dir, pathStr);
      try {
        await fs.access(potentialPath);
        absolutePath = potentialPath;
        break;
      } catch {
      }
    }
  }
  if (!absolutePath) {
    throw new Error(`Path not found in workspace: ${pathStr}`);
  }
  const stats = await fs.stat(absolutePath);
  if (stats.isDirectory()) {
    const allParts = [];
    allParts.push({
      text: `--- Start of content for directory: ${pathStr} ---
`
    });
    const files = await glob("**/*", {
      cwd: absolutePath,
      nodir: true,
      // We only want files
      dot: true,
      // Include dotfiles
      absolute: true
    });
    const relativeFiles = files.map((p) => path.relative(config.getTargetDir(), p));
    const filteredFiles = fileService.filterFiles(relativeFiles, {
      respectGitIgnore: config.getFileFilteringRespectGitIgnore(),
      respectGeminiIgnore: config.getFileFilteringRespectGeminiIgnore()
    });
    const finalFiles = filteredFiles.map((p) => path.resolve(config.getTargetDir(), p));
    for (const filePath of finalFiles) {
      const relativePathForDisplay = path.relative(absolutePath, filePath);
      allParts.push({ text: `--- ${relativePathForDisplay} ---
` });
      const result = await processSingleFileContent(filePath, config.getTargetDir(), config.getFileSystemService());
      allParts.push(result.llmContent);
      allParts.push({ text: "\n" });
    }
    allParts.push({ text: `--- End of content for directory: ${pathStr} ---` });
    return allParts;
  } else {
    const relativePath = path.relative(config.getTargetDir(), absolutePath);
    const filtered = fileService.filterFiles([relativePath], {
      respectGitIgnore: config.getFileFilteringRespectGitIgnore(),
      respectGeminiIgnore: config.getFileFilteringRespectGeminiIgnore()
    });
    if (filtered.length === 0) {
      return [];
    }
    const result = await processSingleFileContent(absolutePath, config.getTargetDir(), config.getFileSystemService());
    return [result.llmContent];
  }
}

export {
  makeFakeConfig,
  readPathFromWorkspace
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

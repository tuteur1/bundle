const require = (await import('node:module')).createRequire(import.meta.url); const __chunk_filename = (await import('node:url')).fileURLToPath(import.meta.url); const __chunk_dirname = (await import('node:path')).dirname(__chunk_filename);
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  CoreEvent,
  GEMINI_DIR,
  Kind,
  MCP_TOOL_PREFIX,
  Storage,
  ToolConfirmationOutcome,
  ToolErrorType,
  ZodFirstPartyTypeKind,
  coreEvents,
  debugLogger,
  external_exports,
  getErrorMessage,
  homedir,
  isMcpToolName,
  isSubpath,
  normalizePath,
  parseMcpToolName,
  tildeifyPath
} from "./chunk-OGCT5ASD.js";

// packages/core/dist/src/utils/memoryDiscovery.js
import * as fs4 from "node:fs/promises";
import * as fsSync2 from "node:fs";
import * as path4 from "node:path";

// packages/core/dist/src/utils/bfsFileSearch.js
import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";
var logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args) => debugLogger.debug("[DEBUG] [BfsFileSearch]", ...args)
};
async function bfsFileSearch(rootDir, options) {
  const { ignoreDirs = [], maxDirs = Infinity, debug = false } = options;
  const foundFiles = [];
  const queue = [rootDir];
  const visited = /* @__PURE__ */ new Set();
  let scannedDirCount = 0;
  let queueHead = 0;
  const ignoreDirsSet = new Set(ignoreDirs);
  const PARALLEL_BATCH_SIZE = 15;
  while (queueHead < queue.length && scannedDirCount < maxDirs) {
    const batchSize = Math.min(PARALLEL_BATCH_SIZE, maxDirs - scannedDirCount);
    const currentBatch = [];
    while (currentBatch.length < batchSize && queueHead < queue.length) {
      const currentDir = queue[queueHead];
      queueHead++;
      if (!visited.has(currentDir)) {
        visited.add(currentDir);
        currentBatch.push(currentDir);
      }
    }
    scannedDirCount += currentBatch.length;
    if (currentBatch.length === 0)
      continue;
    if (debug) {
      logger.debug(`Scanning [${scannedDirCount}/${maxDirs}]: batch of ${currentBatch.length}`);
    }
    const readPromises = currentBatch.map(async (currentDir) => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        return { currentDir, entries };
      } catch (error) {
        const message = error?.message ?? "Unknown error";
        debugLogger.warn(`[WARN] Skipping unreadable directory: ${currentDir} (${message})`);
        if (debug) {
          logger.debug(`Full error for ${currentDir}:`, error);
        }
        return { currentDir, entries: [] };
      }
    });
    const results = await Promise.all(readPromises);
    for (const { currentDir, entries } of results) {
      processDirEntries(currentDir, entries, options, ignoreDirsSet, queue, foundFiles);
    }
  }
  return foundFiles;
}
function bfsFileSearchSync(rootDir, options) {
  const { ignoreDirs = [], maxDirs = Infinity, debug = false } = options;
  const foundFiles = [];
  const queue = [rootDir];
  const visited = /* @__PURE__ */ new Set();
  let scannedDirCount = 0;
  let queueHead = 0;
  const ignoreDirsSet = new Set(ignoreDirs);
  while (queueHead < queue.length && scannedDirCount < maxDirs) {
    const currentDir = queue[queueHead];
    queueHead++;
    if (!visited.has(currentDir)) {
      visited.add(currentDir);
      scannedDirCount++;
      if (debug) {
        logger.debug(`Scanning Sync [${scannedDirCount}/${maxDirs}]: ${currentDir}`);
      }
      try {
        const entries = fsSync.readdirSync(currentDir, { withFileTypes: true });
        processDirEntries(currentDir, entries, options, ignoreDirsSet, queue, foundFiles);
      } catch (error) {
        const message = error?.message ?? "Unknown error";
        debugLogger.warn(`[WARN] Skipping unreadable directory: ${currentDir} (${message})`);
      }
    }
  }
  return foundFiles;
}
function processDirEntries(currentDir, entries, options, ignoreDirsSet, queue, foundFiles) {
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const isDirectory = entry.isDirectory();
    const isMatchingFile = entry.isFile() && entry.name === options.fileName;
    if (!isDirectory && !isMatchingFile) {
      continue;
    }
    if (isDirectory && ignoreDirsSet.has(entry.name)) {
      continue;
    }
    if (options.fileService?.shouldIgnoreFile(fullPath, {
      respectGitIgnore: options.fileFilteringOptions?.respectGitIgnore,
      respectGeminiIgnore: options.fileFilteringOptions?.respectGeminiIgnore
    })) {
      continue;
    }
    if (isDirectory) {
      queue.push(fullPath);
    } else {
      foundFiles.push(fullPath);
    }
  }
}

// packages/core/dist/src/tools/memoryTool.js
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";

// node_modules/diff/libesm/diff/base.js
var Diff = class {
  diff(oldStr, newStr, options = {}) {
    let callback;
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if ("callback" in options) {
      callback = options.callback;
    }
    const oldString = this.castInput(oldStr, options);
    const newString = this.castInput(newStr, options);
    const oldTokens = this.removeEmpty(this.tokenize(oldString, options));
    const newTokens = this.removeEmpty(this.tokenize(newString, options));
    return this.diffWithOptionsObj(oldTokens, newTokens, options, callback);
  }
  diffWithOptionsObj(oldTokens, newTokens, options, callback) {
    var _a;
    const done = (value) => {
      value = this.postProcess(value, options);
      if (callback) {
        setTimeout(function() {
          callback(value);
        }, 0);
        return void 0;
      } else {
        return value;
      }
    };
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let editLength = 1;
    let maxEditLength = newLen + oldLen;
    if (options.maxEditLength != null) {
      maxEditLength = Math.min(maxEditLength, options.maxEditLength);
    }
    const maxExecutionTime = (_a = options.timeout) !== null && _a !== void 0 ? _a : Infinity;
    const abortAfterTimestamp = Date.now() + maxExecutionTime;
    const bestPath = [{ oldPos: -1, lastComponent: void 0 }];
    let newPos = this.extractCommon(bestPath[0], newTokens, oldTokens, 0, options);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done(this.buildValues(bestPath[0].lastComponent, newTokens, oldTokens));
    }
    let minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    const execEditLength = () => {
      for (let diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        let basePath;
        const removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        let canAdd = false;
        if (addPath) {
          const addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        const canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos < addPath.oldPos) {
          basePath = this.addToPath(addPath, true, false, 0, options);
        } else {
          basePath = this.addToPath(removePath, false, true, 1, options);
        }
        newPos = this.extractCommon(basePath, newTokens, oldTokens, diagonalPath, options);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(this.buildValues(basePath.lastComponent, newTokens, oldTokens)) || true;
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    };
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback(void 0);
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        const ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  }
  addToPath(path5, added, removed, oldPosInc, options) {
    const last = path5.lastComponent;
    if (last && !options.oneChangePerToken && last.added === added && last.removed === removed) {
      return {
        oldPos: path5.oldPos + oldPosInc,
        lastComponent: { count: last.count + 1, added, removed, previousComponent: last.previousComponent }
      };
    } else {
      return {
        oldPos: path5.oldPos + oldPosInc,
        lastComponent: { count: 1, added, removed, previousComponent: last }
      };
    }
  }
  extractCommon(basePath, newTokens, oldTokens, diagonalPath, options) {
    const newLen = newTokens.length, oldLen = oldTokens.length;
    let oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(oldTokens[oldPos + 1], newTokens[newPos + 1], options)) {
      newPos++;
      oldPos++;
      commonCount++;
      if (options.oneChangePerToken) {
        basePath.lastComponent = { count: 1, previousComponent: basePath.lastComponent, added: false, removed: false };
      }
    }
    if (commonCount && !options.oneChangePerToken) {
      basePath.lastComponent = { count: commonCount, previousComponent: basePath.lastComponent, added: false, removed: false };
    }
    basePath.oldPos = oldPos;
    return newPos;
  }
  equals(left, right, options) {
    if (options.comparator) {
      return options.comparator(left, right);
    } else {
      return left === right || !!options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  }
  removeEmpty(array) {
    const ret = [];
    for (let i = 0; i < array.length; i++) {
      if (array[i]) {
        ret.push(array[i]);
      }
    }
    return ret;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  castInput(value, options) {
    return value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tokenize(value, options) {
    return Array.from(value);
  }
  join(chars) {
    return chars.join("");
  }
  postProcess(changeObjects, options) {
    return changeObjects;
  }
  get useLongestToken() {
    return false;
  }
  buildValues(lastComponent, newTokens, oldTokens) {
    const components = [];
    let nextComponent;
    while (lastComponent) {
      components.push(lastComponent);
      nextComponent = lastComponent.previousComponent;
      delete lastComponent.previousComponent;
      lastComponent = nextComponent;
    }
    components.reverse();
    const componentLen = components.length;
    let componentPos = 0, newPos = 0, oldPos = 0;
    for (; componentPos < componentLen; componentPos++) {
      const component = components[componentPos];
      if (!component.removed) {
        if (!component.added && this.useLongestToken) {
          let value = newTokens.slice(newPos, newPos + component.count);
          value = value.map(function(value2, i) {
            const oldValue = oldTokens[oldPos + i];
            return oldValue.length > value2.length ? oldValue : value2;
          });
          component.value = this.join(value);
        } else {
          component.value = this.join(newTokens.slice(newPos, newPos + component.count));
        }
        newPos += component.count;
        if (!component.added) {
          oldPos += component.count;
        }
      } else {
        component.value = this.join(oldTokens.slice(oldPos, oldPos + component.count));
        oldPos += component.count;
      }
    }
    return components;
  }
};

// node_modules/diff/libesm/util/string.js
function hasOnlyWinLineEndings(string) {
  return string.includes("\r\n") && !string.startsWith("\n") && !string.match(/[^\r]\n/);
}
function hasOnlyUnixLineEndings(string) {
  return !string.includes("\r\n") && string.includes("\n");
}

// node_modules/diff/libesm/diff/line.js
var LineDiff = class extends Diff {
  constructor() {
    super(...arguments);
    this.tokenize = tokenize;
  }
  equals(left, right, options) {
    if (options.ignoreWhitespace) {
      if (!options.newlineIsToken || !left.includes("\n")) {
        left = left.trim();
      }
      if (!options.newlineIsToken || !right.includes("\n")) {
        right = right.trim();
      }
    } else if (options.ignoreNewlineAtEof && !options.newlineIsToken) {
      if (left.endsWith("\n")) {
        left = left.slice(0, -1);
      }
      if (right.endsWith("\n")) {
        right = right.slice(0, -1);
      }
    }
    return super.equals(left, right, options);
  }
};
var lineDiff = new LineDiff();
function diffLines(oldStr, newStr, options) {
  return lineDiff.diff(oldStr, newStr, options);
}
function tokenize(value, options) {
  if (options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  const retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (let i = 0; i < linesAndNewlines.length; i++) {
    const line = linesAndNewlines[i];
    if (i % 2 && !options.newlineIsToken) {
      retLines[retLines.length - 1] += line;
    } else {
      retLines.push(line);
    }
  }
  return retLines;
}

// node_modules/diff/libesm/patch/line-endings.js
function unixToWin(patch) {
  if (Array.isArray(patch)) {
    return patch.map((p) => unixToWin(p));
  }
  return Object.assign(Object.assign({}, patch), { hunks: patch.hunks.map((hunk) => Object.assign(Object.assign({}, hunk), { lines: hunk.lines.map((line, i) => {
    var _a;
    return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\")) ? line : line + "\r";
  }) })) });
}
function winToUnix(patch) {
  if (Array.isArray(patch)) {
    return patch.map((p) => winToUnix(p));
  }
  return Object.assign(Object.assign({}, patch), { hunks: patch.hunks.map((hunk) => Object.assign(Object.assign({}, hunk), { lines: hunk.lines.map((line) => line.endsWith("\r") ? line.substring(0, line.length - 1) : line) })) });
}
function isUnix(patch) {
  if (!Array.isArray(patch)) {
    patch = [patch];
  }
  return !patch.some((index) => index.hunks.some((hunk) => hunk.lines.some((line) => !line.startsWith("\\") && line.endsWith("\r"))));
}
function isWin(patch) {
  if (!Array.isArray(patch)) {
    patch = [patch];
  }
  return patch.some((index) => index.hunks.some((hunk) => hunk.lines.some((line) => line.endsWith("\r")))) && patch.every((index) => index.hunks.every((hunk) => hunk.lines.every((line, i) => {
    var _a;
    return line.startsWith("\\") || line.endsWith("\r") || ((_a = hunk.lines[i + 1]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"));
  })));
}

// node_modules/diff/libesm/patch/parse.js
function parsePatch(uniDiff) {
  const diffstr = uniDiff.split(/\n/), list = [];
  let i = 0;
  function parseIndex() {
    const index = {};
    list.push(index);
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (/^(---|\+\+\+|@@)\s/.test(line)) {
        break;
      }
      const headerMatch = /^(?:Index:|diff(?: -r \w+)+)\s+/.exec(line);
      if (headerMatch) {
        index.index = line.substring(headerMatch[0].length).trim();
      }
      i++;
    }
    parseFileHeader(index);
    parseFileHeader(index);
    index.hunks = [];
    while (i < diffstr.length) {
      const line = diffstr[i];
      if (/^(Index:\s|diff\s|---\s|\+\+\+\s|===================================================================)/.test(line)) {
        break;
      } else if (/^@@/.test(line)) {
        index.hunks.push(parseHunk());
      } else if (line) {
        throw new Error("Unknown line " + (i + 1) + " " + JSON.stringify(line));
      } else {
        i++;
      }
    }
  }
  function parseFileHeader(index) {
    const fileHeaderMatch = /^(---|\+\+\+)\s+/.exec(diffstr[i]);
    if (fileHeaderMatch) {
      const prefix = fileHeaderMatch[1], data = diffstr[i].substring(3).trim().split("	", 2), header = (data[1] || "").trim();
      let fileName = data[0].replace(/\\\\/g, "\\");
      if (fileName.startsWith('"') && fileName.endsWith('"')) {
        fileName = fileName.substr(1, fileName.length - 2);
      }
      if (prefix === "---") {
        index.oldFileName = fileName;
        index.oldHeader = header;
      } else {
        index.newFileName = fileName;
        index.newHeader = header;
      }
      i++;
    }
  }
  function parseHunk() {
    var _a;
    const chunkHeaderIndex = i, chunkHeaderLine = diffstr[i++], chunkHeader = chunkHeaderLine.split(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
    const hunk = {
      oldStart: +chunkHeader[1],
      oldLines: typeof chunkHeader[2] === "undefined" ? 1 : +chunkHeader[2],
      newStart: +chunkHeader[3],
      newLines: typeof chunkHeader[4] === "undefined" ? 1 : +chunkHeader[4],
      lines: []
    };
    if (hunk.oldLines === 0) {
      hunk.oldStart += 1;
    }
    if (hunk.newLines === 0) {
      hunk.newStart += 1;
    }
    let addCount = 0, removeCount = 0;
    for (; i < diffstr.length && (removeCount < hunk.oldLines || addCount < hunk.newLines || ((_a = diffstr[i]) === null || _a === void 0 ? void 0 : _a.startsWith("\\"))); i++) {
      const operation = diffstr[i].length == 0 && i != diffstr.length - 1 ? " " : diffstr[i][0];
      if (operation === "+" || operation === "-" || operation === " " || operation === "\\") {
        hunk.lines.push(diffstr[i]);
        if (operation === "+") {
          addCount++;
        } else if (operation === "-") {
          removeCount++;
        } else if (operation === " ") {
          addCount++;
          removeCount++;
        }
      } else {
        throw new Error(`Hunk at line ${chunkHeaderIndex + 1} contained invalid line ${diffstr[i]}`);
      }
    }
    if (!addCount && hunk.newLines === 1) {
      hunk.newLines = 0;
    }
    if (!removeCount && hunk.oldLines === 1) {
      hunk.oldLines = 0;
    }
    if (addCount !== hunk.newLines) {
      throw new Error("Added line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    if (removeCount !== hunk.oldLines) {
      throw new Error("Removed line count did not match for hunk at line " + (chunkHeaderIndex + 1));
    }
    return hunk;
  }
  while (i < diffstr.length) {
    parseIndex();
  }
  return list;
}

// node_modules/diff/libesm/util/distance-iterator.js
function distance_iterator_default(start, minLine, maxLine) {
  let wantForward = true, backwardExhausted = false, forwardExhausted = false, localOffset = 1;
  return function iterator() {
    if (wantForward && !forwardExhausted) {
      if (backwardExhausted) {
        localOffset++;
      } else {
        wantForward = false;
      }
      if (start + localOffset <= maxLine) {
        return start + localOffset;
      }
      forwardExhausted = true;
    }
    if (!backwardExhausted) {
      if (!forwardExhausted) {
        wantForward = true;
      }
      if (minLine <= start - localOffset) {
        return start - localOffset++;
      }
      backwardExhausted = true;
      return iterator();
    }
    return void 0;
  };
}

// node_modules/diff/libesm/patch/apply.js
function applyPatch(source, patch, options = {}) {
  let patches;
  if (typeof patch === "string") {
    patches = parsePatch(patch);
  } else if (Array.isArray(patch)) {
    patches = patch;
  } else {
    patches = [patch];
  }
  if (patches.length > 1) {
    throw new Error("applyPatch only works with a single input.");
  }
  return applyStructuredPatch(source, patches[0], options);
}
function applyStructuredPatch(source, patch, options = {}) {
  if (options.autoConvertLineEndings || options.autoConvertLineEndings == null) {
    if (hasOnlyWinLineEndings(source) && isUnix(patch)) {
      patch = unixToWin(patch);
    } else if (hasOnlyUnixLineEndings(source) && isWin(patch)) {
      patch = winToUnix(patch);
    }
  }
  const lines = source.split("\n"), hunks = patch.hunks, compareLine = options.compareLine || ((lineNumber, line, operation, patchContent) => line === patchContent), fuzzFactor = options.fuzzFactor || 0;
  let minLine = 0;
  if (fuzzFactor < 0 || !Number.isInteger(fuzzFactor)) {
    throw new Error("fuzzFactor must be a non-negative integer");
  }
  if (!hunks.length) {
    return source;
  }
  let prevLine = "", removeEOFNL = false, addEOFNL = false;
  for (let i = 0; i < hunks[hunks.length - 1].lines.length; i++) {
    const line = hunks[hunks.length - 1].lines[i];
    if (line[0] == "\\") {
      if (prevLine[0] == "+") {
        removeEOFNL = true;
      } else if (prevLine[0] == "-") {
        addEOFNL = true;
      }
    }
    prevLine = line;
  }
  if (removeEOFNL) {
    if (addEOFNL) {
      if (!fuzzFactor && lines[lines.length - 1] == "") {
        return false;
      }
    } else if (lines[lines.length - 1] == "") {
      lines.pop();
    } else if (!fuzzFactor) {
      return false;
    }
  } else if (addEOFNL) {
    if (lines[lines.length - 1] != "") {
      lines.push("");
    } else if (!fuzzFactor) {
      return false;
    }
  }
  function applyHunk(hunkLines, toPos, maxErrors, hunkLinesI = 0, lastContextLineMatched = true, patchedLines = [], patchedLinesLength = 0) {
    let nConsecutiveOldContextLines = 0;
    let nextContextLineMustMatch = false;
    for (; hunkLinesI < hunkLines.length; hunkLinesI++) {
      const hunkLine = hunkLines[hunkLinesI], operation = hunkLine.length > 0 ? hunkLine[0] : " ", content = hunkLine.length > 0 ? hunkLine.substr(1) : hunkLine;
      if (operation === "-") {
        if (compareLine(toPos + 1, lines[toPos], operation, content)) {
          toPos++;
          nConsecutiveOldContextLines = 0;
        } else {
          if (!maxErrors || lines[toPos] == null) {
            return null;
          }
          patchedLines[patchedLinesLength] = lines[toPos];
          return applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1);
        }
      }
      if (operation === "+") {
        if (!lastContextLineMatched) {
          return null;
        }
        patchedLines[patchedLinesLength] = content;
        patchedLinesLength++;
        nConsecutiveOldContextLines = 0;
        nextContextLineMustMatch = true;
      }
      if (operation === " ") {
        nConsecutiveOldContextLines++;
        patchedLines[patchedLinesLength] = lines[toPos];
        if (compareLine(toPos + 1, lines[toPos], operation, content)) {
          patchedLinesLength++;
          lastContextLineMatched = true;
          nextContextLineMustMatch = false;
          toPos++;
        } else {
          if (nextContextLineMustMatch || !maxErrors) {
            return null;
          }
          return lines[toPos] && (applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength + 1) || applyHunk(hunkLines, toPos + 1, maxErrors - 1, hunkLinesI, false, patchedLines, patchedLinesLength + 1)) || applyHunk(hunkLines, toPos, maxErrors - 1, hunkLinesI + 1, false, patchedLines, patchedLinesLength);
        }
      }
    }
    patchedLinesLength -= nConsecutiveOldContextLines;
    toPos -= nConsecutiveOldContextLines;
    patchedLines.length = patchedLinesLength;
    return {
      patchedLines,
      oldLineLastI: toPos - 1
    };
  }
  const resultLines = [];
  let prevHunkOffset = 0;
  for (let i = 0; i < hunks.length; i++) {
    const hunk = hunks[i];
    let hunkResult;
    const maxLine = lines.length - hunk.oldLines + fuzzFactor;
    let toPos;
    for (let maxErrors = 0; maxErrors <= fuzzFactor; maxErrors++) {
      toPos = hunk.oldStart + prevHunkOffset - 1;
      const iterator = distance_iterator_default(toPos, minLine, maxLine);
      for (; toPos !== void 0; toPos = iterator()) {
        hunkResult = applyHunk(hunk.lines, toPos, maxErrors);
        if (hunkResult) {
          break;
        }
      }
      if (hunkResult) {
        break;
      }
    }
    if (!hunkResult) {
      return false;
    }
    for (let i2 = minLine; i2 < toPos; i2++) {
      resultLines.push(lines[i2]);
    }
    for (let i2 = 0; i2 < hunkResult.patchedLines.length; i2++) {
      const line = hunkResult.patchedLines[i2];
      resultLines.push(line);
    }
    minLine = hunkResult.oldLineLastI + 1;
    prevHunkOffset = toPos + 1 - hunk.oldStart;
  }
  for (let i = minLine; i < lines.length; i++) {
    resultLines.push(lines[i]);
  }
  return resultLines.join("\n");
}

// node_modules/diff/libesm/patch/create.js
var INCLUDE_HEADERS = {
  includeIndex: true,
  includeUnderline: true,
  includeFileHeaders: true
};
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  let optionsObj;
  if (!options) {
    optionsObj = {};
  } else if (typeof options === "function") {
    optionsObj = { callback: options };
  } else {
    optionsObj = options;
  }
  if (typeof optionsObj.context === "undefined") {
    optionsObj.context = 4;
  }
  const context = optionsObj.context;
  if (optionsObj.newlineIsToken) {
    throw new Error("newlineIsToken may not be used with patch-generation functions, only with diffing functions");
  }
  if (!optionsObj.callback) {
    return diffLinesResultToPatch(diffLines(oldStr, newStr, optionsObj));
  } else {
    const { callback } = optionsObj;
    diffLines(oldStr, newStr, Object.assign(Object.assign({}, optionsObj), { callback: (diff) => {
      const patch = diffLinesResultToPatch(diff);
      callback(patch);
    } }));
  }
  function diffLinesResultToPatch(diff) {
    if (!diff) {
      return;
    }
    diff.push({ value: "", lines: [] });
    function contextLines(lines) {
      return lines.map(function(entry) {
        return " " + entry;
      });
    }
    const hunks = [];
    let oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
    for (let i = 0; i < diff.length; i++) {
      const current = diff[i], lines = current.lines || splitLines(current.value);
      current.lines = lines;
      if (current.added || current.removed) {
        if (!oldRangeStart) {
          const prev = diff[i - 1];
          oldRangeStart = oldLine;
          newRangeStart = newLine;
          if (prev) {
            curRange = context > 0 ? contextLines(prev.lines.slice(-context)) : [];
            oldRangeStart -= curRange.length;
            newRangeStart -= curRange.length;
          }
        }
        for (const line of lines) {
          curRange.push((current.added ? "+" : "-") + line);
        }
        if (current.added) {
          newLine += lines.length;
        } else {
          oldLine += lines.length;
        }
      } else {
        if (oldRangeStart) {
          if (lines.length <= context * 2 && i < diff.length - 2) {
            for (const line of contextLines(lines)) {
              curRange.push(line);
            }
          } else {
            const contextSize = Math.min(lines.length, context);
            for (const line of contextLines(lines.slice(0, contextSize))) {
              curRange.push(line);
            }
            const hunk = {
              oldStart: oldRangeStart,
              oldLines: oldLine - oldRangeStart + contextSize,
              newStart: newRangeStart,
              newLines: newLine - newRangeStart + contextSize,
              lines: curRange
            };
            hunks.push(hunk);
            oldRangeStart = 0;
            newRangeStart = 0;
            curRange = [];
          }
        }
        oldLine += lines.length;
        newLine += lines.length;
      }
    }
    for (const hunk of hunks) {
      for (let i = 0; i < hunk.lines.length; i++) {
        if (hunk.lines[i].endsWith("\n")) {
          hunk.lines[i] = hunk.lines[i].slice(0, -1);
        } else {
          hunk.lines.splice(i + 1, 0, "\\ No newline at end of file");
          i++;
        }
      }
    }
    return {
      oldFileName,
      newFileName,
      oldHeader,
      newHeader,
      hunks
    };
  }
}
function formatPatch(patch, headerOptions) {
  if (!headerOptions) {
    headerOptions = INCLUDE_HEADERS;
  }
  if (Array.isArray(patch)) {
    if (patch.length > 1 && !headerOptions.includeFileHeaders) {
      throw new Error("Cannot omit file headers on a multi-file patch. (The result would be unparseable; how would a tool trying to apply the patch know which changes are to which file?)");
    }
    return patch.map((p) => formatPatch(p, headerOptions)).join("\n");
  }
  const ret = [];
  if (headerOptions.includeIndex && patch.oldFileName == patch.newFileName) {
    ret.push("Index: " + patch.oldFileName);
  }
  if (headerOptions.includeUnderline) {
    ret.push("===================================================================");
  }
  if (headerOptions.includeFileHeaders) {
    ret.push("--- " + patch.oldFileName + (typeof patch.oldHeader === "undefined" ? "" : "	" + patch.oldHeader));
    ret.push("+++ " + patch.newFileName + (typeof patch.newHeader === "undefined" ? "" : "	" + patch.newHeader));
  }
  for (let i = 0; i < patch.hunks.length; i++) {
    const hunk = patch.hunks[i];
    if (hunk.oldLines === 0) {
      hunk.oldStart -= 1;
    }
    if (hunk.newLines === 0) {
      hunk.newStart -= 1;
    }
    ret.push("@@ -" + hunk.oldStart + "," + hunk.oldLines + " +" + hunk.newStart + "," + hunk.newLines + " @@");
    for (const line of hunk.lines) {
      ret.push(line);
    }
  }
  return ret.join("\n") + "\n";
}
function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options) {
  if (typeof options === "function") {
    options = { callback: options };
  }
  if (!(options === null || options === void 0 ? void 0 : options.callback)) {
    const patchObj = structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options);
    if (!patchObj) {
      return;
    }
    return formatPatch(patchObj, options === null || options === void 0 ? void 0 : options.headerOptions);
  } else {
    const { callback } = options;
    structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, Object.assign(Object.assign({}, options), { callback: (patchObj) => {
      if (!patchObj) {
        callback(void 0);
      } else {
        callback(formatPatch(patchObj, options.headerOptions));
      }
    } }));
  }
}
function createPatch(fileName, oldStr, newStr, oldHeader, newHeader, options) {
  return createTwoFilesPatch(fileName, fileName, oldStr, newStr, oldHeader, newHeader, options);
}
function splitLines(text) {
  const hasTrailingNl = text.endsWith("\n");
  const result = text.split("\n").map((line) => line + "\n");
  if (hasTrailingNl) {
    result.pop();
  } else {
    result.push(result.pop().slice(0, -1));
  }
  return result;
}

// packages/core/dist/src/tools/diffOptions.js
var DEFAULT_STRUCTURED_PATCH_OPTS = {
  context: 3,
  ignoreWhitespace: false
};
var DEFAULT_DIFF_OPTIONS = {
  context: 3,
  ignoreWhitespace: false
};
function getDiffStat(fileName, oldStr, aiStr, userStr) {
  const getStats = (patch) => {
    let addedLines = 0;
    let removedLines = 0;
    let addedChars = 0;
    let removedChars = 0;
    patch.hunks.forEach((hunk) => {
      hunk.lines.forEach((line) => {
        if (line.startsWith("+")) {
          addedLines++;
          addedChars += line.length - 1;
        } else if (line.startsWith("-")) {
          removedLines++;
          removedChars += line.length - 1;
        }
      });
    });
    return { addedLines, removedLines, addedChars, removedChars };
  };
  const modelPatch = structuredPatch(fileName, fileName, oldStr, aiStr, "Current", "Proposed", DEFAULT_STRUCTURED_PATCH_OPTS);
  const modelStats = getStats(modelPatch);
  const userPatch = structuredPatch(fileName, fileName, aiStr, userStr, "Proposed", "User", DEFAULT_STRUCTURED_PATCH_OPTS);
  const userStats = getStats(userPatch);
  return {
    model_added_lines: modelStats.addedLines,
    model_removed_lines: modelStats.removedLines,
    model_added_chars: modelStats.addedChars,
    model_removed_chars: modelStats.removedChars,
    user_added_lines: userStats.addedLines,
    user_removed_lines: userStats.removedLines,
    user_added_chars: userStats.addedChars,
    user_removed_chars: userStats.removedChars
  };
}
function getDiffStatFromPatch(patch) {
  let addedLines = 0;
  let removedLines = 0;
  let addedChars = 0;
  let removedChars = 0;
  const lines = patch.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      addedLines++;
      addedChars += line.length - 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removedLines++;
      removedChars += line.length - 1;
    }
  }
  return {
    model_added_lines: addedLines,
    model_removed_lines: removedLines,
    model_added_chars: addedChars,
    model_removed_chars: removedChars,
    user_added_lines: 0,
    user_removed_lines: 0,
    user_added_chars: 0,
    user_removed_chars: 0
  };
}

// packages/core/dist/src/config/models.js
var PREVIEW_GEMINI_MODEL = "gemini-3-pro-preview";
var PREVIEW_GEMINI_3_1_MODEL = "gemini-3.1-pro-preview";
var PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL = "gemini-3.1-pro-preview-customtools";
var PREVIEW_GEMINI_FLASH_MODEL = "gemini-3-flash-preview";
var PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL = "gemini-3.1-flash-lite-preview";
var DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";
var DEFAULT_GEMINI_FLASH_MODEL = "gemini-2.5-flash";
var DEFAULT_GEMINI_FLASH_LITE_MODEL = "gemini-2.5-flash-lite";
var VALID_GEMINI_MODELS = /* @__PURE__ */ new Set([
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL
]);
var PREVIEW_GEMINI_MODEL_AUTO = "auto-gemini-3";
var DEFAULT_GEMINI_MODEL_AUTO = "auto-gemini-2.5";
var GEMINI_MODEL_ALIAS_AUTO = "auto";
var GEMINI_MODEL_ALIAS_PRO = "pro";
var GEMINI_MODEL_ALIAS_FLASH = "flash";
var GEMINI_MODEL_ALIAS_FLASH_LITE = "flash-lite";
var DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
var DEFAULT_THINKING_MODE = 8192;
function resolveModel(requestedModel, useGemini3_1 = false, useGemini3_1FlashLite = false, useCustomToolModel = false, hasAccessToPreview = true, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const resolved2 = config.modelConfigService.resolveModelId(requestedModel, {
      useGemini3_1,
      useGemini3_1FlashLite,
      useCustomTools: useCustomToolModel,
      hasAccessToPreview
    });
    if (!hasAccessToPreview && isPreviewModel(resolved2, config)) {
      if (resolved2.includes("flash-lite")) {
        return DEFAULT_GEMINI_FLASH_LITE_MODEL;
      }
      if (resolved2.includes("flash")) {
        return DEFAULT_GEMINI_FLASH_MODEL;
      }
      return DEFAULT_GEMINI_MODEL;
    }
    return resolved2;
  }
  let resolved;
  switch (requestedModel) {
    case PREVIEW_GEMINI_MODEL:
    case PREVIEW_GEMINI_MODEL_AUTO:
    case GEMINI_MODEL_ALIAS_AUTO:
    case GEMINI_MODEL_ALIAS_PRO: {
      if (useGemini3_1) {
        resolved = useCustomToolModel ? PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL : PREVIEW_GEMINI_3_1_MODEL;
      } else {
        resolved = PREVIEW_GEMINI_MODEL;
      }
      break;
    }
    case DEFAULT_GEMINI_MODEL_AUTO: {
      resolved = DEFAULT_GEMINI_MODEL;
      break;
    }
    case GEMINI_MODEL_ALIAS_FLASH: {
      resolved = PREVIEW_GEMINI_FLASH_MODEL;
      break;
    }
    case GEMINI_MODEL_ALIAS_FLASH_LITE: {
      resolved = useGemini3_1FlashLite ? PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL : DEFAULT_GEMINI_FLASH_LITE_MODEL;
      break;
    }
    default: {
      resolved = requestedModel;
      break;
    }
  }
  if (!hasAccessToPreview && isPreviewModel(resolved)) {
    switch (resolved) {
      case PREVIEW_GEMINI_FLASH_MODEL:
        return DEFAULT_GEMINI_FLASH_MODEL;
      case PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL:
        return DEFAULT_GEMINI_FLASH_LITE_MODEL;
      case PREVIEW_GEMINI_MODEL:
      case PREVIEW_GEMINI_3_1_MODEL:
      case PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL:
        return DEFAULT_GEMINI_MODEL;
      default:
        if (resolved.includes("flash-lite")) {
          return DEFAULT_GEMINI_FLASH_LITE_MODEL;
        }
        if (resolved.includes("flash")) {
          return DEFAULT_GEMINI_FLASH_MODEL;
        }
        return DEFAULT_GEMINI_MODEL;
    }
  }
  return resolved;
}
function resolveClassifierModel(requestedModel, modelAlias, useGemini3_1 = false, useGemini3_1FlashLite = false, useCustomToolModel = false, hasAccessToPreview = true, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.resolveClassifierModelId(modelAlias, requestedModel, {
      useGemini3_1,
      useGemini3_1FlashLite,
      useCustomTools: useCustomToolModel,
      hasAccessToPreview
    });
  }
  if (modelAlias === GEMINI_MODEL_ALIAS_FLASH) {
    if (requestedModel === DEFAULT_GEMINI_MODEL_AUTO || requestedModel === DEFAULT_GEMINI_MODEL) {
      return DEFAULT_GEMINI_FLASH_MODEL;
    }
    if (requestedModel === PREVIEW_GEMINI_MODEL_AUTO || requestedModel === PREVIEW_GEMINI_MODEL) {
      return PREVIEW_GEMINI_FLASH_MODEL;
    }
    return resolveModel(GEMINI_MODEL_ALIAS_FLASH);
  }
  return resolveModel(requestedModel, useGemini3_1, useGemini3_1FlashLite, useCustomToolModel);
}
function getDisplayString(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const definition = config.modelConfigService.getModelDefinition(model);
    if (definition?.displayName) {
      return definition.displayName;
    }
  }
  switch (model) {
    case PREVIEW_GEMINI_MODEL_AUTO:
      return "Auto (Gemini 3)";
    case DEFAULT_GEMINI_MODEL_AUTO:
      return "Auto (Gemini 2.5)";
    case GEMINI_MODEL_ALIAS_PRO:
      return PREVIEW_GEMINI_MODEL;
    case GEMINI_MODEL_ALIAS_FLASH:
      return PREVIEW_GEMINI_FLASH_MODEL;
    case PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL:
      return PREVIEW_GEMINI_3_1_MODEL;
    case PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL:
      return PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL;
    default:
      return model;
  }
}
function isPreviewModel(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.isPreview === true;
  }
  return model === PREVIEW_GEMINI_MODEL || model === PREVIEW_GEMINI_3_1_MODEL || model === PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL || model === PREVIEW_GEMINI_FLASH_MODEL || model === PREVIEW_GEMINI_MODEL_AUTO || model === GEMINI_MODEL_ALIAS_AUTO || model === PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL;
}
function isProModel(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.tier === "pro";
  }
  return model.toLowerCase().includes("pro");
}
function isGemini3Model(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const resolved2 = resolveModel(model);
    return config.modelConfigService.getModelDefinition(resolved2)?.family === "gemini-3";
  }
  const resolved = resolveModel(model);
  return /^gemini-3(\.|-|$)/.test(resolved);
}
function isGemini2Model(model) {
  return /^gemini-2(\.|$)/.test(model);
}
function isCustomModel(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    const resolved2 = resolveModel(model, false, false, false, true, config);
    return config.modelConfigService.getModelDefinition(resolved2)?.tier === "custom" || !resolved2.startsWith("gemini-");
  }
  const resolved = resolveModel(model);
  return !resolved.startsWith("gemini-");
}
function supportsModernFeatures(model) {
  if (isGemini3Model(model))
    return true;
  return isCustomModel(model);
}
function isAutoModel(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.tier === "auto";
  }
  return model === GEMINI_MODEL_ALIAS_AUTO || model === PREVIEW_GEMINI_MODEL_AUTO || model === DEFAULT_GEMINI_MODEL_AUTO;
}
function supportsMultimodalFunctionResponse(model, config) {
  if (config?.getExperimentalDynamicModelConfiguration?.() === true) {
    return config.modelConfigService.getModelDefinition(model)?.features?.multimodalToolUse === true;
  }
  return model.startsWith("gemini-3-");
}
function isActiveModel(model, useGemini3_1 = false, useGemini3_1FlashLite = false, useCustomToolModel = false) {
  if (!VALID_GEMINI_MODELS.has(model)) {
    return false;
  }
  if (model === PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL) {
    return useGemini3_1FlashLite;
  }
  if (useGemini3_1) {
    if (model === PREVIEW_GEMINI_MODEL) {
      return false;
    }
    if (useCustomToolModel) {
      return model !== PREVIEW_GEMINI_3_1_MODEL;
    } else {
      return model !== PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL;
    }
  } else {
    return model !== PREVIEW_GEMINI_3_1_MODEL && model !== PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL;
  }
}

// packages/core/dist/src/tools/definitions/modelFamilyService.js
function getToolFamily(modelId) {
  if (!modelId) {
    return "default-legacy";
  }
  if (isGemini3Model(modelId)) {
    return "gemini-3";
  }
  return "default-legacy";
}

// packages/core/dist/src/tools/definitions/base-declarations.js
var PARAM_FILE_PATH = "file_path";
var PARAM_DIR_PATH = "dir_path";
var PARAM_PATTERN = "pattern";
var PARAM_CASE_SENSITIVE = "case_sensitive";
var PARAM_RESPECT_GIT_IGNORE = "respect_git_ignore";
var PARAM_RESPECT_GEMINI_IGNORE = "respect_gemini_ignore";
var PARAM_FILE_FILTERING_OPTIONS = "file_filtering_options";
var PARAM_DESCRIPTION = "description";
var GLOB_TOOL_NAME = "glob";
var GREP_TOOL_NAME = "grep_search";
var GREP_PARAM_INCLUDE_PATTERN = "include_pattern";
var GREP_PARAM_EXCLUDE_PATTERN = "exclude_pattern";
var GREP_PARAM_NAMES_ONLY = "names_only";
var GREP_PARAM_MAX_MATCHES_PER_FILE = "max_matches_per_file";
var GREP_PARAM_TOTAL_MAX_MATCHES = "total_max_matches";
var GREP_PARAM_FIXED_STRINGS = "fixed_strings";
var GREP_PARAM_CONTEXT = "context";
var GREP_PARAM_AFTER = "after";
var GREP_PARAM_BEFORE = "before";
var GREP_PARAM_NO_IGNORE = "no_ignore";
var LS_TOOL_NAME = "list_directory";
var LS_PARAM_IGNORE = "ignore";
var READ_FILE_TOOL_NAME = "read_file";
var READ_FILE_PARAM_START_LINE = "start_line";
var READ_FILE_PARAM_END_LINE = "end_line";
var SHELL_TOOL_NAME = "run_shell_command";
var SHELL_PARAM_COMMAND = "command";
var SHELL_PARAM_IS_BACKGROUND = "is_background";
var WRITE_FILE_TOOL_NAME = "write_file";
var WRITE_FILE_PARAM_CONTENT = "content";
var EDIT_TOOL_NAME = "replace";
var EDIT_PARAM_INSTRUCTION = "instruction";
var EDIT_PARAM_OLD_STRING = "old_string";
var EDIT_PARAM_NEW_STRING = "new_string";
var EDIT_PARAM_ALLOW_MULTIPLE = "allow_multiple";
var WEB_SEARCH_TOOL_NAME = "google_web_search";
var WEB_SEARCH_PARAM_QUERY = "query";
var WRITE_TODOS_TOOL_NAME = "write_todos";
var TODOS_PARAM_TODOS = "todos";
var TODOS_ITEM_PARAM_DESCRIPTION = "description";
var TODOS_ITEM_PARAM_STATUS = "status";
var WEB_FETCH_TOOL_NAME = "web_fetch";
var WEB_FETCH_PARAM_PROMPT = "prompt";
var READ_MANY_FILES_TOOL_NAME = "read_many_files";
var READ_MANY_PARAM_INCLUDE = "include";
var READ_MANY_PARAM_EXCLUDE = "exclude";
var READ_MANY_PARAM_RECURSIVE = "recursive";
var READ_MANY_PARAM_USE_DEFAULT_EXCLUDES = "useDefaultExcludes";
var MEMORY_TOOL_NAME = "save_memory";
var MEMORY_PARAM_FACT = "fact";
var GET_INTERNAL_DOCS_TOOL_NAME = "get_internal_docs";
var DOCS_PARAM_PATH = "path";
var ACTIVATE_SKILL_TOOL_NAME = "activate_skill";
var SKILL_PARAM_NAME = "name";
var ASK_USER_TOOL_NAME = "ask_user";
var ASK_USER_PARAM_QUESTIONS = "questions";
var ASK_USER_QUESTION_PARAM_QUESTION = "question";
var ASK_USER_QUESTION_PARAM_HEADER = "header";
var ASK_USER_QUESTION_PARAM_TYPE = "type";
var ASK_USER_QUESTION_PARAM_OPTIONS = "options";
var ASK_USER_QUESTION_PARAM_MULTI_SELECT = "multiSelect";
var ASK_USER_QUESTION_PARAM_PLACEHOLDER = "placeholder";
var ASK_USER_OPTION_PARAM_LABEL = "label";
var ASK_USER_OPTION_PARAM_DESCRIPTION = "description";
var EXIT_PLAN_MODE_TOOL_NAME = "exit_plan_mode";
var EXIT_PLAN_PARAM_PLAN_FILENAME = "plan_filename";
var ENTER_PLAN_MODE_TOOL_NAME = "enter_plan_mode";
var PLAN_MODE_PARAM_REASON = "reason";
var PARAM_ADDITIONAL_PERMISSIONS = "additional_permissions";
var UPDATE_TOPIC_TOOL_NAME = "update_topic";
var TOPIC_PARAM_TITLE = "title";
var TOPIC_PARAM_SUMMARY = "summary";
var TOPIC_PARAM_STRATEGIC_INTENT = "strategic_intent";

// packages/core/dist/src/tools/definitions/dynamic-declaration-helpers.js
import * as os from "node:os";

// node_modules/zod-to-json-schema/dist/esm/Options.js
var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
var defaultOptions = {
  name: void 0,
  $refStrategy: "root",
  basePath: ["#"],
  effectStrategy: "input",
  pipeStrategy: "all",
  dateStrategy: "format:date-time",
  mapStrategy: "entries",
  removeAdditionalStrategy: "passthrough",
  allowedAdditionalProperties: true,
  rejectedAdditionalProperties: false,
  definitionPath: "definitions",
  target: "jsonSchema7",
  strictUnions: false,
  definitions: {},
  errorMessages: false,
  markdownDescription: false,
  patternStrategy: "escape",
  applyRegexFlags: false,
  emailStrategy: "format:email",
  base64Strategy: "contentEncoding:base64",
  nameStrategy: "ref",
  openAiAnyTypeName: "OpenAiAnyType"
};
var getDefaultOptions = (options) => typeof options === "string" ? {
  ...defaultOptions,
  name: options
} : {
  ...defaultOptions,
  ...options
};

// node_modules/zod-to-json-schema/dist/esm/Refs.js
var getRefs = (options) => {
  const _options = getDefaultOptions(options);
  const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
  return {
    ..._options,
    flags: { hasReferencedOpenAiAnyType: false },
    currentPath,
    propertyPath: void 0,
    seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
      def._def,
      {
        def: def._def,
        path: [..._options.basePath, _options.definitionPath, name],
        // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
        jsonSchema: void 0
      }
    ]))
  };
};

// node_modules/zod-to-json-schema/dist/esm/errorMessages.js
function addErrorMessage(res, key, errorMessage, refs) {
  if (!refs?.errorMessages)
    return;
  if (errorMessage) {
    res.errorMessage = {
      ...res.errorMessage,
      [key]: errorMessage
    };
  }
}
function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
  res[key] = value;
  addErrorMessage(res, key, errorMessage, refs);
}

// node_modules/zod-to-json-schema/dist/esm/getRelativePath.js
var getRelativePath = (pathA, pathB) => {
  let i = 0;
  for (; i < pathA.length && i < pathB.length; i++) {
    if (pathA[i] !== pathB[i])
      break;
  }
  return [(pathA.length - i).toString(), ...pathB.slice(i)].join("/");
};

// node_modules/zod-to-json-schema/dist/esm/parsers/any.js
function parseAnyDef(refs) {
  if (refs.target !== "openAi") {
    return {};
  }
  const anyDefinitionPath = [
    ...refs.basePath,
    refs.definitionPath,
    refs.openAiAnyTypeName
  ];
  refs.flags.hasReferencedOpenAiAnyType = true;
  return {
    $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/array.js
function parseArrayDef(def, refs) {
  const res = {
    type: "array"
  };
  if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
    res.items = parseDef(def.type._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
  }
  if (def.minLength) {
    setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
  }
  if (def.maxLength) {
    setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
  }
  if (def.exactLength) {
    setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
    setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
function parseBigintDef(def, refs) {
  const res = {
    type: "integer",
    format: "int64"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
function parseBooleanDef() {
  return {
    type: "boolean"
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
function parseBrandedDef(_def, refs) {
  return parseDef(_def.type._def, refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
var parseCatchDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/zod-to-json-schema/dist/esm/parsers/date.js
function parseDateDef(def, refs, overrideDateStrategy) {
  const strategy = overrideDateStrategy ?? refs.dateStrategy;
  if (Array.isArray(strategy)) {
    return {
      anyOf: strategy.map((item, i) => parseDateDef(def, refs, item))
    };
  }
  switch (strategy) {
    case "string":
    case "format:date-time":
      return {
        type: "string",
        format: "date-time"
      };
    case "format:date":
      return {
        type: "string",
        format: "date"
      };
    case "integer":
      return integerDateParser(def, refs);
  }
}
var integerDateParser = (def, refs) => {
  const res = {
    type: "integer",
    format: "unix-time"
  };
  if (refs.target === "openApi3") {
    return res;
  }
  for (const check of def.checks) {
    switch (check.kind) {
      case "min":
        setResponseValueAndErrors(
          res,
          "minimum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
      case "max":
        setResponseValueAndErrors(
          res,
          "maximum",
          check.value,
          // This is in milliseconds
          check.message,
          refs
        );
        break;
    }
  }
  return res;
};

// node_modules/zod-to-json-schema/dist/esm/parsers/default.js
function parseDefaultDef(_def, refs) {
  return {
    ...parseDef(_def.innerType._def, refs),
    default: _def.defaultValue()
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
function parseEffectsDef(_def, refs) {
  return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
function parseEnumDef(def) {
  return {
    type: "string",
    enum: Array.from(def.values)
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
var isJsonSchema7AllOfType = (type) => {
  if ("type" in type && type.type === "string")
    return false;
  return "allOf" in type;
};
function parseIntersectionDef(def, refs) {
  const allOf = [
    parseDef(def.left._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    }),
    parseDef(def.right._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "1"]
    })
  ].filter((x) => !!x);
  let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
  const mergedAllOf = [];
  allOf.forEach((schema) => {
    if (isJsonSchema7AllOfType(schema)) {
      mergedAllOf.push(...schema.allOf);
      if (schema.unevaluatedProperties === void 0) {
        unevaluatedProperties = void 0;
      }
    } else {
      let nestedSchema = schema;
      if ("additionalProperties" in schema && schema.additionalProperties === false) {
        const { additionalProperties, ...rest } = schema;
        nestedSchema = rest;
      } else {
        unevaluatedProperties = void 0;
      }
      mergedAllOf.push(nestedSchema);
    }
  });
  return mergedAllOf.length ? {
    allOf: mergedAllOf,
    ...unevaluatedProperties
  } : void 0;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
function parseLiteralDef(def, refs) {
  const parsedType = typeof def.value;
  if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
    return {
      type: Array.isArray(def.value) ? "array" : "object"
    };
  }
  if (refs.target === "openApi3") {
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      enum: [def.value]
    };
  }
  return {
    type: parsedType === "bigint" ? "integer" : parsedType,
    const: def.value
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/string.js
var emojiRegex = void 0;
var zodPatterns = {
  /**
   * `c` was changed to `[cC]` to replicate /i flag
   */
  cuid: /^[cC][^\s-]{8,}$/,
  cuid2: /^[0-9a-z]+$/,
  ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
  /**
   * `a-z` was added to replicate /i flag
   */
  email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
  /**
   * Constructed a valid Unicode RegExp
   *
   * Lazily instantiate since this type of regex isn't supported
   * in all envs (e.g. React Native).
   *
   * See:
   * https://github.com/colinhacks/zod/issues/2433
   * Fix in Zod:
   * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
   */
  emoji: () => {
    if (emojiRegex === void 0) {
      emojiRegex = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
    }
    return emojiRegex;
  },
  /**
   * Unused
   */
  uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
  /**
   * Unused
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
  ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
  /**
   * Unused
   */
  ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
  ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
  base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
  base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
  nanoid: /^[a-zA-Z0-9_-]{21}$/,
  jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
};
function parseStringDef(def, refs) {
  const res = {
    type: "string"
  };
  if (def.checks) {
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          break;
        case "max":
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "email":
          switch (refs.emailStrategy) {
            case "format:email":
              addFormat(res, "email", check.message, refs);
              break;
            case "format:idn-email":
              addFormat(res, "idn-email", check.message, refs);
              break;
            case "pattern:zod":
              addPattern(res, zodPatterns.email, check.message, refs);
              break;
          }
          break;
        case "url":
          addFormat(res, "uri", check.message, refs);
          break;
        case "uuid":
          addFormat(res, "uuid", check.message, refs);
          break;
        case "regex":
          addPattern(res, check.regex, check.message, refs);
          break;
        case "cuid":
          addPattern(res, zodPatterns.cuid, check.message, refs);
          break;
        case "cuid2":
          addPattern(res, zodPatterns.cuid2, check.message, refs);
          break;
        case "startsWith":
          addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
          break;
        case "endsWith":
          addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
          break;
        case "datetime":
          addFormat(res, "date-time", check.message, refs);
          break;
        case "date":
          addFormat(res, "date", check.message, refs);
          break;
        case "time":
          addFormat(res, "time", check.message, refs);
          break;
        case "duration":
          addFormat(res, "duration", check.message, refs);
          break;
        case "length":
          setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
          setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
          break;
        case "includes": {
          addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
          break;
        }
        case "ip": {
          if (check.version !== "v6") {
            addFormat(res, "ipv4", check.message, refs);
          }
          if (check.version !== "v4") {
            addFormat(res, "ipv6", check.message, refs);
          }
          break;
        }
        case "base64url":
          addPattern(res, zodPatterns.base64url, check.message, refs);
          break;
        case "jwt":
          addPattern(res, zodPatterns.jwt, check.message, refs);
          break;
        case "cidr": {
          if (check.version !== "v6") {
            addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
          }
          if (check.version !== "v4") {
            addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
          }
          break;
        }
        case "emoji":
          addPattern(res, zodPatterns.emoji(), check.message, refs);
          break;
        case "ulid": {
          addPattern(res, zodPatterns.ulid, check.message, refs);
          break;
        }
        case "base64": {
          switch (refs.base64Strategy) {
            case "format:binary": {
              addFormat(res, "binary", check.message, refs);
              break;
            }
            case "contentEncoding:base64": {
              setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
              break;
            }
            case "pattern:zod": {
              addPattern(res, zodPatterns.base64, check.message, refs);
              break;
            }
          }
          break;
        }
        case "nanoid": {
          addPattern(res, zodPatterns.nanoid, check.message, refs);
        }
        case "toLowerCase":
        case "toUpperCase":
        case "trim":
          break;
        default:
          /* @__PURE__ */ ((_) => {
          })(check);
      }
    }
  }
  return res;
}
function escapeLiteralCheckValue(literal, refs) {
  return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
}
var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
function escapeNonAlphaNumeric(source) {
  let result = "";
  for (let i = 0; i < source.length; i++) {
    if (!ALPHA_NUMERIC.has(source[i])) {
      result += "\\";
    }
    result += source[i];
  }
  return result;
}
function addFormat(schema, value, message, refs) {
  if (schema.format || schema.anyOf?.some((x) => x.format)) {
    if (!schema.anyOf) {
      schema.anyOf = [];
    }
    if (schema.format) {
      schema.anyOf.push({
        format: schema.format,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { format: schema.errorMessage.format }
        }
      });
      delete schema.format;
      if (schema.errorMessage) {
        delete schema.errorMessage.format;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.anyOf.push({
      format: value,
      ...message && refs.errorMessages && { errorMessage: { format: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "format", value, message, refs);
  }
}
function addPattern(schema, regex, message, refs) {
  if (schema.pattern || schema.allOf?.some((x) => x.pattern)) {
    if (!schema.allOf) {
      schema.allOf = [];
    }
    if (schema.pattern) {
      schema.allOf.push({
        pattern: schema.pattern,
        ...schema.errorMessage && refs.errorMessages && {
          errorMessage: { pattern: schema.errorMessage.pattern }
        }
      });
      delete schema.pattern;
      if (schema.errorMessage) {
        delete schema.errorMessage.pattern;
        if (Object.keys(schema.errorMessage).length === 0) {
          delete schema.errorMessage;
        }
      }
    }
    schema.allOf.push({
      pattern: stringifyRegExpWithFlags(regex, refs),
      ...message && refs.errorMessages && { errorMessage: { pattern: message } }
    });
  } else {
    setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
  }
}
function stringifyRegExpWithFlags(regex, refs) {
  if (!refs.applyRegexFlags || !regex.flags) {
    return regex.source;
  }
  const flags = {
    i: regex.flags.includes("i"),
    m: regex.flags.includes("m"),
    s: regex.flags.includes("s")
    // `.` matches newlines
  };
  const source = flags.i ? regex.source.toLowerCase() : regex.source;
  let pattern = "";
  let isEscaped = false;
  let inCharGroup = false;
  let inCharRange = false;
  for (let i = 0; i < source.length; i++) {
    if (isEscaped) {
      pattern += source[i];
      isEscaped = false;
      continue;
    }
    if (flags.i) {
      if (inCharGroup) {
        if (source[i].match(/[a-z]/)) {
          if (inCharRange) {
            pattern += source[i];
            pattern += `${source[i - 2]}-${source[i]}`.toUpperCase();
            inCharRange = false;
          } else if (source[i + 1] === "-" && source[i + 2]?.match(/[a-z]/)) {
            pattern += source[i];
            inCharRange = true;
          } else {
            pattern += `${source[i]}${source[i].toUpperCase()}`;
          }
          continue;
        }
      } else if (source[i].match(/[a-z]/)) {
        pattern += `[${source[i]}${source[i].toUpperCase()}]`;
        continue;
      }
    }
    if (flags.m) {
      if (source[i] === "^") {
        pattern += `(^|(?<=[\r
]))`;
        continue;
      } else if (source[i] === "$") {
        pattern += `($|(?=[\r
]))`;
        continue;
      }
    }
    if (flags.s && source[i] === ".") {
      pattern += inCharGroup ? `${source[i]}\r
` : `[${source[i]}\r
]`;
      continue;
    }
    pattern += source[i];
    if (source[i] === "\\") {
      isEscaped = true;
    } else if (inCharGroup && source[i] === "]") {
      inCharGroup = false;
    } else if (!inCharGroup && source[i] === "[") {
      inCharGroup = true;
    }
  }
  try {
    new RegExp(pattern);
  } catch {
    console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
    return regex.source;
  }
  return pattern;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/record.js
function parseRecordDef(def, refs) {
  if (refs.target === "openAi") {
    console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  }
  if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      type: "object",
      required: def.keyType._def.values,
      properties: def.keyType._def.values.reduce((acc, key) => ({
        ...acc,
        [key]: parseDef(def.valueType._def, {
          ...refs,
          currentPath: [...refs.currentPath, "properties", key]
        }) ?? parseAnyDef(refs)
      }), {}),
      additionalProperties: refs.rejectedAdditionalProperties
    };
  }
  const schema = {
    type: "object",
    additionalProperties: parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    }) ?? refs.allowedAdditionalProperties
  };
  if (refs.target === "openApi3") {
    return schema;
  }
  if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
    const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
    return {
      ...schema,
      propertyNames: {
        enum: def.keyType._def.values
      }
    };
  } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
    const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
    return {
      ...schema,
      propertyNames: keyType
    };
  }
  return schema;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/map.js
function parseMapDef(def, refs) {
  if (refs.mapStrategy === "record") {
    return parseRecordDef(def, refs);
  }
  const keys = parseDef(def.keyType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "0"]
  }) || parseAnyDef(refs);
  const values = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items", "items", "1"]
  }) || parseAnyDef(refs);
  return {
    type: "array",
    maxItems: 125,
    items: {
      type: "array",
      items: [keys, values],
      minItems: 2,
      maxItems: 2
    }
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
function parseNativeEnumDef(def) {
  const object = def.values;
  const actualKeys = Object.keys(def.values).filter((key) => {
    return typeof object[object[key]] !== "number";
  });
  const actualValues = actualKeys.map((key) => object[key]);
  const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
  return {
    type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
    enum: actualValues
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/never.js
function parseNeverDef(refs) {
  return refs.target === "openAi" ? void 0 : {
    not: parseAnyDef({
      ...refs,
      currentPath: [...refs.currentPath, "not"]
    })
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/null.js
function parseNullDef(refs) {
  return refs.target === "openApi3" ? {
    enum: ["null"],
    nullable: true
  } : {
    type: "null"
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/union.js
var primitiveMappings = {
  ZodString: "string",
  ZodNumber: "number",
  ZodBigInt: "integer",
  ZodBoolean: "boolean",
  ZodNull: "null"
};
function parseUnionDef(def, refs) {
  if (refs.target === "openApi3")
    return asAnyOf(def, refs);
  const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
  if (options.every((x) => x._def.typeName in primitiveMappings && (!x._def.checks || !x._def.checks.length))) {
    const types = options.reduce((types2, x) => {
      const type = primitiveMappings[x._def.typeName];
      return type && !types2.includes(type) ? [...types2, type] : types2;
    }, []);
    return {
      type: types.length > 1 ? types : types[0]
    };
  } else if (options.every((x) => x._def.typeName === "ZodLiteral" && !x.description)) {
    const types = options.reduce((acc, x) => {
      const type = typeof x._def.value;
      switch (type) {
        case "string":
        case "number":
        case "boolean":
          return [...acc, type];
        case "bigint":
          return [...acc, "integer"];
        case "object":
          if (x._def.value === null)
            return [...acc, "null"];
        case "symbol":
        case "undefined":
        case "function":
        default:
          return acc;
      }
    }, []);
    if (types.length === options.length) {
      const uniqueTypes = types.filter((x, i, a) => a.indexOf(x) === i);
      return {
        type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
        enum: options.reduce((acc, x) => {
          return acc.includes(x._def.value) ? acc : [...acc, x._def.value];
        }, [])
      };
    }
  } else if (options.every((x) => x._def.typeName === "ZodEnum")) {
    return {
      type: "string",
      enum: options.reduce((acc, x) => [
        ...acc,
        ...x._def.values.filter((x2) => !acc.includes(x2))
      ], [])
    };
  }
  return asAnyOf(def, refs);
}
var asAnyOf = (def, refs) => {
  const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x, i) => parseDef(x._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", `${i}`]
  })).filter((x) => !!x && (!refs.strictUnions || typeof x === "object" && Object.keys(x).length > 0));
  return anyOf.length ? { anyOf } : void 0;
};

// node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
function parseNullableDef(def, refs) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
    if (refs.target === "openApi3") {
      return {
        type: primitiveMappings[def.innerType._def.typeName],
        nullable: true
      };
    }
    return {
      type: [
        primitiveMappings[def.innerType._def.typeName],
        "null"
      ]
    };
  }
  if (refs.target === "openApi3") {
    const base2 = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath]
    });
    if (base2 && "$ref" in base2)
      return { allOf: [base2], nullable: true };
    return base2 && { ...base2, nullable: true };
  }
  const base = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "0"]
  });
  return base && { anyOf: [base, { type: "null" }] };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/number.js
function parseNumberDef(def, refs) {
  const res = {
    type: "number"
  };
  if (!def.checks)
    return res;
  for (const check of def.checks) {
    switch (check.kind) {
      case "int":
        res.type = "integer";
        addErrorMessage(res, "type", check.message, refs);
        break;
      case "min":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMinimum = true;
          }
          setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
        }
        break;
      case "max":
        if (refs.target === "jsonSchema7") {
          if (check.inclusive) {
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          } else {
            setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
          }
        } else {
          if (!check.inclusive) {
            res.exclusiveMaximum = true;
          }
          setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
        }
        break;
      case "multipleOf":
        setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
        break;
    }
  }
  return res;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/object.js
function parseObjectDef(def, refs) {
  const forceOptionalIntoNullable = refs.target === "openAi";
  const result = {
    type: "object",
    properties: {}
  };
  const required = [];
  const shape = def.shape();
  for (const propName in shape) {
    let propDef = shape[propName];
    if (propDef === void 0 || propDef._def === void 0) {
      continue;
    }
    let propOptional = safeIsOptional(propDef);
    if (propOptional && forceOptionalIntoNullable) {
      if (propDef._def.typeName === "ZodOptional") {
        propDef = propDef._def.innerType;
      }
      if (!propDef.isNullable()) {
        propDef = propDef.nullable();
      }
      propOptional = false;
    }
    const parsedDef = parseDef(propDef._def, {
      ...refs,
      currentPath: [...refs.currentPath, "properties", propName],
      propertyPath: [...refs.currentPath, "properties", propName]
    });
    if (parsedDef === void 0) {
      continue;
    }
    result.properties[propName] = parsedDef;
    if (!propOptional) {
      required.push(propName);
    }
  }
  if (required.length) {
    result.required = required;
  }
  const additionalProperties = decideAdditionalProperties(def, refs);
  if (additionalProperties !== void 0) {
    result.additionalProperties = additionalProperties;
  }
  return result;
}
function decideAdditionalProperties(def, refs) {
  if (def.catchall._def.typeName !== "ZodNever") {
    return parseDef(def.catchall._def, {
      ...refs,
      currentPath: [...refs.currentPath, "additionalProperties"]
    });
  }
  switch (def.unknownKeys) {
    case "passthrough":
      return refs.allowedAdditionalProperties;
    case "strict":
      return refs.rejectedAdditionalProperties;
    case "strip":
      return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
  }
}
function safeIsOptional(schema) {
  try {
    return schema.isOptional();
  } catch {
    return true;
  }
}

// node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
var parseOptionalDef = (def, refs) => {
  if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
    return parseDef(def.innerType._def, refs);
  }
  const innerSchema = parseDef(def.innerType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "anyOf", "1"]
  });
  return innerSchema ? {
    anyOf: [
      {
        not: parseAnyDef(refs)
      },
      innerSchema
    ]
  } : parseAnyDef(refs);
};

// node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
var parsePipelineDef = (def, refs) => {
  if (refs.pipeStrategy === "input") {
    return parseDef(def.in._def, refs);
  } else if (refs.pipeStrategy === "output") {
    return parseDef(def.out._def, refs);
  }
  const a = parseDef(def.in._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", "0"]
  });
  const b = parseDef(def.out._def, {
    ...refs,
    currentPath: [...refs.currentPath, "allOf", a ? "1" : "0"]
  });
  return {
    allOf: [a, b].filter((x) => x !== void 0)
  };
};

// node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
function parsePromiseDef(def, refs) {
  return parseDef(def.type._def, refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/set.js
function parseSetDef(def, refs) {
  const items = parseDef(def.valueType._def, {
    ...refs,
    currentPath: [...refs.currentPath, "items"]
  });
  const schema = {
    type: "array",
    uniqueItems: true,
    items
  };
  if (def.minSize) {
    setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
  }
  if (def.maxSize) {
    setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
  }
  return schema;
}

// node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
function parseTupleDef(def, refs) {
  if (def.rest) {
    return {
      type: "array",
      minItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], []),
      additionalItems: parseDef(def.rest._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalItems"]
      })
    };
  } else {
    return {
      type: "array",
      minItems: def.items.length,
      maxItems: def.items.length,
      items: def.items.map((x, i) => parseDef(x._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items", `${i}`]
      })).reduce((acc, x) => x === void 0 ? acc : [...acc, x], [])
    };
  }
}

// node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
function parseUndefinedDef(refs) {
  return {
    not: parseAnyDef(refs)
  };
}

// node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
function parseUnknownDef(refs) {
  return parseAnyDef(refs);
}

// node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
var parseReadonlyDef = (def, refs) => {
  return parseDef(def.innerType._def, refs);
};

// node_modules/zod-to-json-schema/dist/esm/selectParser.js
var selectParser = (def, typeName, refs) => {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return parseStringDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNumber:
      return parseNumberDef(def, refs);
    case ZodFirstPartyTypeKind.ZodObject:
      return parseObjectDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBigInt:
      return parseBigintDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBoolean:
      return parseBooleanDef();
    case ZodFirstPartyTypeKind.ZodDate:
      return parseDateDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUndefined:
      return parseUndefinedDef(refs);
    case ZodFirstPartyTypeKind.ZodNull:
      return parseNullDef(refs);
    case ZodFirstPartyTypeKind.ZodArray:
      return parseArrayDef(def, refs);
    case ZodFirstPartyTypeKind.ZodUnion:
    case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
      return parseUnionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodIntersection:
      return parseIntersectionDef(def, refs);
    case ZodFirstPartyTypeKind.ZodTuple:
      return parseTupleDef(def, refs);
    case ZodFirstPartyTypeKind.ZodRecord:
      return parseRecordDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLiteral:
      return parseLiteralDef(def, refs);
    case ZodFirstPartyTypeKind.ZodEnum:
      return parseEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return parseNativeEnumDef(def);
    case ZodFirstPartyTypeKind.ZodNullable:
      return parseNullableDef(def, refs);
    case ZodFirstPartyTypeKind.ZodOptional:
      return parseOptionalDef(def, refs);
    case ZodFirstPartyTypeKind.ZodMap:
      return parseMapDef(def, refs);
    case ZodFirstPartyTypeKind.ZodSet:
      return parseSetDef(def, refs);
    case ZodFirstPartyTypeKind.ZodLazy:
      return () => def.getter()._def;
    case ZodFirstPartyTypeKind.ZodPromise:
      return parsePromiseDef(def, refs);
    case ZodFirstPartyTypeKind.ZodNaN:
    case ZodFirstPartyTypeKind.ZodNever:
      return parseNeverDef(refs);
    case ZodFirstPartyTypeKind.ZodEffects:
      return parseEffectsDef(def, refs);
    case ZodFirstPartyTypeKind.ZodAny:
      return parseAnyDef(refs);
    case ZodFirstPartyTypeKind.ZodUnknown:
      return parseUnknownDef(refs);
    case ZodFirstPartyTypeKind.ZodDefault:
      return parseDefaultDef(def, refs);
    case ZodFirstPartyTypeKind.ZodBranded:
      return parseBrandedDef(def, refs);
    case ZodFirstPartyTypeKind.ZodReadonly:
      return parseReadonlyDef(def, refs);
    case ZodFirstPartyTypeKind.ZodCatch:
      return parseCatchDef(def, refs);
    case ZodFirstPartyTypeKind.ZodPipeline:
      return parsePipelineDef(def, refs);
    case ZodFirstPartyTypeKind.ZodFunction:
    case ZodFirstPartyTypeKind.ZodVoid:
    case ZodFirstPartyTypeKind.ZodSymbol:
      return void 0;
    default:
      return /* @__PURE__ */ ((_) => void 0)(typeName);
  }
};

// node_modules/zod-to-json-schema/dist/esm/parseDef.js
function parseDef(def, refs, forceResolution = false) {
  const seenItem = refs.seen.get(def);
  if (refs.override) {
    const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
    if (overrideResult !== ignoreOverride) {
      return overrideResult;
    }
  }
  if (seenItem && !forceResolution) {
    const seenSchema = get$ref(seenItem, refs);
    if (seenSchema !== void 0) {
      return seenSchema;
    }
  }
  const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
  refs.seen.set(def, newItem);
  const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
  const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
  if (jsonSchema) {
    addMeta(def, refs, jsonSchema);
  }
  if (refs.postProcess) {
    const postProcessResult = refs.postProcess(jsonSchema, def, refs);
    newItem.jsonSchema = jsonSchema;
    return postProcessResult;
  }
  newItem.jsonSchema = jsonSchema;
  return jsonSchema;
}
var get$ref = (item, refs) => {
  switch (refs.$refStrategy) {
    case "root":
      return { $ref: item.path.join("/") };
    case "relative":
      return { $ref: getRelativePath(refs.currentPath, item.path) };
    case "none":
    case "seen": {
      if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
        console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
        return parseAnyDef(refs);
      }
      return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
    }
  }
};
var addMeta = (def, refs, jsonSchema) => {
  if (def.description) {
    jsonSchema.description = def.description;
    if (refs.markdownDescription) {
      jsonSchema.markdownDescription = def.description;
    }
  }
  return jsonSchema;
};

// node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
var zodToJsonSchema = (schema, options) => {
  const refs = getRefs(options);
  let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
    ...acc,
    [name2]: parseDef(schema2._def, {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name2]
    }, true) ?? parseAnyDef(refs)
  }), {}) : void 0;
  const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
  const main = parseDef(schema._def, name === void 0 ? refs : {
    ...refs,
    currentPath: [...refs.basePath, refs.definitionPath, name]
  }, false) ?? parseAnyDef(refs);
  const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
  if (title !== void 0) {
    main.title = title;
  }
  if (refs.flags.hasReferencedOpenAiAnyType) {
    if (!definitions) {
      definitions = {};
    }
    if (!definitions[refs.openAiAnyTypeName]) {
      definitions[refs.openAiAnyTypeName] = {
        // Skipping "object" as no properties can be defined and additionalProperties must be "false"
        type: ["string", "number", "integer", "boolean", "array", "null"],
        items: {
          $ref: refs.$refStrategy === "relative" ? "1" : [
            ...refs.basePath,
            refs.definitionPath,
            refs.openAiAnyTypeName
          ].join("/")
        }
      };
    }
  }
  const combined = name === void 0 ? definitions ? {
    ...main,
    [refs.definitionPath]: definitions
  } : main : {
    $ref: [
      ...refs.$refStrategy === "relative" ? [] : refs.basePath,
      refs.definitionPath,
      name
    ].join("/"),
    [refs.definitionPath]: {
      ...definitions,
      [name]: main
    }
  };
  if (refs.target === "jsonSchema7") {
    combined.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
    combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
  }
  if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
    console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
  }
  return combined;
};

// packages/core/dist/src/tools/definitions/dynamic-declaration-helpers.js
function getShellToolDescription(enableInteractiveShell, enableEfficiency) {
  const efficiencyGuidelines = enableEfficiency ? `

      Efficiency Guidelines:
      - Quiet Flags: Always prefer silent or quiet flags (e.g., \`npm install --silent\`, \`git --no-pager\`) to reduce output volume while still capturing necessary information.
      - Pagination: Always disable terminal pagination to ensure commands terminate (e.g., use \`git --no-pager\`, \`systemctl --no-pager\`, or set \`PAGER=cat\`).` : "";
  const returnedInfo = `

      The following information is returned:

      Output: Combined stdout/stderr. Can be \`(empty)\` or partial on error and for any unwaited background processes.
      Exit Code: Only included if non-zero (command failed).
      Error: Only included if a process-level error occurred (e.g., spawn failure).
      Signal: Only included if process was terminated by a signal.
      Background PIDs: Only included if background processes were started.
      Process Group PGID: Only included if available.`;
  if (os.platform() === "win32") {
    const backgroundInstructions = enableInteractiveShell ? `To run a command in the background, set the \`${SHELL_PARAM_IS_BACKGROUND}\` parameter to true. Do NOT use PowerShell background constructs.` : "Command can start background processes using PowerShell constructs such as `Start-Process -NoNewWindow` or `Start-Job`.";
    return `This tool executes a given shell command as \`powershell.exe -NoProfile -Command <command>\`. ${backgroundInstructions}${efficiencyGuidelines}${returnedInfo}`;
  } else {
    const backgroundInstructions = enableInteractiveShell ? `To run a command in the background, set the \`${SHELL_PARAM_IS_BACKGROUND}\` parameter to true. Do NOT use \`&\` to background commands.` : "Command can start background processes using `&`.";
    return `This tool executes a given shell command as \`bash -c <command>\`. ${backgroundInstructions} Command is executed as a subprocess that leads its own process group. Command process group can be terminated as \`kill -- -PGID\` or signaled as \`kill -s SIGNAL -- -PGID\`.${efficiencyGuidelines}${returnedInfo}`;
  }
}
function getCommandDescription() {
  if (os.platform() === "win32") {
    return "Exact command to execute as `powershell.exe -NoProfile -Command <command>`";
  }
  return "Exact bash command to execute as `bash -c <command>`";
}
function getShellDeclaration(enableInteractiveShell, enableEfficiency, enableToolSandboxing = false) {
  return {
    name: SHELL_TOOL_NAME,
    description: getShellToolDescription(enableInteractiveShell, enableEfficiency),
    parametersJsonSchema: {
      type: "object",
      properties: {
        [SHELL_PARAM_COMMAND]: {
          type: "string",
          description: getCommandDescription()
        },
        [PARAM_DESCRIPTION]: {
          type: "string",
          description: "Brief description of the command for the user. Be specific and concise. Ideally a single sentence. Can be up to 3 sentences for clarity. No line breaks."
        },
        [PARAM_DIR_PATH]: {
          type: "string",
          description: "(OPTIONAL) The path of the directory to run the command in. If not provided, the project root directory is used. Must be a directory within the workspace and must already exist."
        },
        [SHELL_PARAM_IS_BACKGROUND]: {
          type: "boolean",
          description: "Set to true if this command should be run in the background (e.g. for long-running servers or watchers). The command will be started, allowed to run for a brief moment to check for immediate errors, and then moved to the background."
        },
        ...enableToolSandboxing ? {
          [PARAM_ADDITIONAL_PERMISSIONS]: {
            type: "object",
            description: 'Sandbox permissions for the command. Use this to request additional sandboxed filesystem or network permissions if a previous command failed with "Operation not permitted".',
            properties: {
              network: {
                type: "boolean",
                description: "Set to true to enable network access for this command."
              },
              fileSystem: {
                type: "object",
                properties: {
                  read: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of additional absolute paths to allow reading."
                  },
                  write: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of additional absolute paths to allow writing."
                  }
                }
              }
            }
          }
        } : {}
      },
      required: [SHELL_PARAM_COMMAND]
    }
  };
}
function getExitPlanModeDeclaration() {
  return {
    name: EXIT_PLAN_MODE_TOOL_NAME,
    description: "Finalizes the planning phase and transitions to implementation by presenting the plan for user approval. This tool MUST be used to exit Plan Mode before any source code edits can be performed. Call this whenever a plan is ready or the user requests implementation.",
    parametersJsonSchema: {
      type: "object",
      required: [EXIT_PLAN_PARAM_PLAN_FILENAME],
      properties: {
        [EXIT_PLAN_PARAM_PLAN_FILENAME]: {
          type: "string",
          description: `The filename of the finalized plan (e.g., "feature-x.md"). Do not provide an absolute path.`
        }
      }
    }
  };
}
function getActivateSkillDeclaration(skillNames) {
  const availableSkillsHint = skillNames.length > 0 ? ` (Available: ${skillNames.map((n) => `'${n}'`).join(", ")})` : "";
  let schema;
  if (skillNames.length === 0) {
    schema = external_exports.object({
      [SKILL_PARAM_NAME]: external_exports.string().describe("No skills are currently available.")
    });
  } else {
    schema = external_exports.object({
      [SKILL_PARAM_NAME]: external_exports.enum(skillNames).describe("The name of the skill to activate.")
    });
  }
  return {
    name: ACTIVATE_SKILL_TOOL_NAME,
    description: `Activates a specialized agent skill by name${availableSkillsHint}. Returns the skill's instructions wrapped in \`<activated_skill>\` tags. These provide specialized guidance for the current task. Use this when you identify a task that matches a skill's description. ONLY use names exactly as they appear in the \`<available_skills>\` section.`,
    parametersJsonSchema: zodToJsonSchema(schema)
  };
}
function getUpdateTopicDeclaration() {
  return {
    name: UPDATE_TOPIC_TOOL_NAME,
    description: "Manages your narrative flow. Include `title` and `summary` only when starting a new Chapter (logical phase) or shifting strategic intent.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [TOPIC_PARAM_TITLE]: {
          type: "string",
          description: "The title of the new topic or chapter."
        },
        [TOPIC_PARAM_SUMMARY]: {
          type: "string",
          description: "(OPTIONAL) A detailed summary (5-10 sentences) covering both the work completed in the previous topic and the strategic intent of the new topic. This is required when transitioning between topics to maintain continuity."
        },
        [TOPIC_PARAM_STRATEGIC_INTENT]: {
          type: "string",
          description: "A mandatory one-sentence statement of your immediate intent."
        }
      },
      required: [TOPIC_PARAM_STRATEGIC_INTENT]
    }
  };
}

// packages/core/dist/src/tools/definitions/model-family-sets/default-legacy.js
var DEFAULT_LEGACY_SET = {
  read_file: {
    name: READ_FILE_TOOL_NAME,
    description: `Reads and returns the content of a specified file. If the file is large, the content will be truncated. The tool's response will clearly indicate if truncation has occurred and will provide details on how to read more of the file using the 'start_line' and 'end_line' parameters. Handles text, images (PNG, JPG, GIF, WEBP, SVG, BMP), audio files (MP3, WAV, AIFF, AAC, OGG, FLAC), and PDF files. For text files, it can read specific line ranges.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "The path to the file to read.",
          type: "string"
        },
        [READ_FILE_PARAM_START_LINE]: {
          description: "Optional: The 1-based line number to start reading from.",
          type: "number"
        },
        [READ_FILE_PARAM_END_LINE]: {
          description: "Optional: The 1-based line number to end reading at (inclusive).",
          type: "number"
        }
      },
      required: [PARAM_FILE_PATH]
    }
  },
  write_file: {
    name: WRITE_FILE_TOOL_NAME,
    description: `Writes content to a specified file in the local filesystem.

      The user has the ability to modify \`content\`. If modified, this will be stated in the response.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "The path to the file to write to.",
          type: "string"
        },
        [WRITE_FILE_PARAM_CONTENT]: {
          description: "The content to write to the file. Do not use omission placeholders like '(rest of methods ...)', '...', or 'unchanged code'; provide complete literal content.",
          type: "string"
        }
      },
      required: [PARAM_FILE_PATH, WRITE_FILE_PARAM_CONTENT]
    }
  },
  grep_search: {
    name: GREP_TOOL_NAME,
    description: "Searches for a regular expression pattern within file contents. Max 100 matches.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: `The regular expression (regex) pattern to search for within file contents (e.g., 'function\\s+myFunction', 'import\\s+\\{.*\\}\\s+from\\s+.*').`,
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Optional: The absolute path to the directory to search within. If omitted, searches the current working directory.",
          type: "string"
        },
        [GREP_PARAM_INCLUDE_PATTERN]: {
          description: `Optional: A glob pattern to filter which files are searched (e.g., '*.js', '*.{ts,tsx}', 'src/**'). If omitted, searches all files (respecting potential global ignores).`,
          type: "string"
        },
        [GREP_PARAM_EXCLUDE_PATTERN]: {
          description: "Optional: A regular expression pattern to exclude from the search results. If a line matches both the pattern and the exclude_pattern, it will be omitted.",
          type: "string"
        },
        [GREP_PARAM_NAMES_ONLY]: {
          description: "Optional: If true, only the file paths of the matches will be returned, without the line content or line numbers. This is useful for gathering a list of files.",
          type: "boolean"
        },
        [GREP_PARAM_MAX_MATCHES_PER_FILE]: {
          description: "Optional: Maximum number of matches to return per file. Use this to prevent being overwhelmed by repetitive matches in large files.",
          type: "integer",
          minimum: 1
        },
        [GREP_PARAM_TOTAL_MAX_MATCHES]: {
          description: "Optional: Maximum number of total matches to return. Use this to limit the overall size of the response. Defaults to 100 if omitted.",
          type: "integer",
          minimum: 1
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  grep_search_ripgrep: {
    name: GREP_TOOL_NAME,
    description: "Searches for a regular expression pattern within file contents.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: `The pattern to search for. By default, treated as a Rust-flavored regular expression. Use '\\b' for precise symbol matching (e.g., '\\bMatchMe\\b').`,
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Directory or file to search. Directories are searched recursively. Relative paths are resolved against current working directory. Defaults to current working directory ('.') if omitted.",
          type: "string"
        },
        [GREP_PARAM_INCLUDE_PATTERN]: {
          description: "Glob pattern to filter files (e.g., '*.ts', 'src/**'). Recommended for large repositories to reduce noise. Defaults to all files if omitted.",
          type: "string"
        },
        [GREP_PARAM_EXCLUDE_PATTERN]: {
          description: "Optional: A regular expression pattern to exclude from the search results. If a line matches both the pattern and the exclude_pattern, it will be omitted.",
          type: "string"
        },
        [GREP_PARAM_NAMES_ONLY]: {
          description: "Optional: If true, only the file paths of the matches will be returned, without the line content or line numbers. This is useful for gathering a list of files.",
          type: "boolean"
        },
        [PARAM_CASE_SENSITIVE]: {
          description: "If true, search is case-sensitive. Defaults to false (ignore case) if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_FIXED_STRINGS]: {
          description: "If true, treats the `pattern` as a literal string instead of a regular expression. Defaults to false (basic regex) if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_CONTEXT]: {
          description: "Show this many lines of context around each match (equivalent to grep -C). Defaults to 0 if omitted.",
          type: "integer"
        },
        [GREP_PARAM_AFTER]: {
          description: "Show this many lines after each match (equivalent to grep -A). Defaults to 0 if omitted.",
          type: "integer",
          minimum: 0
        },
        [GREP_PARAM_BEFORE]: {
          description: "Show this many lines before each match (equivalent to grep -B). Defaults to 0 if omitted.",
          type: "integer",
          minimum: 0
        },
        [GREP_PARAM_NO_IGNORE]: {
          description: "If true, searches all files including those usually ignored (like in .gitignore, build/, dist/, etc). Defaults to false if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_MAX_MATCHES_PER_FILE]: {
          description: "Optional: Maximum number of matches to return per file. Use this to prevent being overwhelmed by repetitive matches in large files.",
          type: "integer",
          minimum: 1
        },
        [GREP_PARAM_TOTAL_MAX_MATCHES]: {
          description: "Optional: Maximum number of total matches to return. Use this to limit the overall size of the response. Defaults to 100 if omitted.",
          type: "integer",
          minimum: 1
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  glob: {
    name: GLOB_TOOL_NAME,
    description: "Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: "The glob pattern to match against (e.g., '**/*.py', 'docs/*.md').",
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Optional: The absolute path to the directory to search within. If omitted, searches the root directory.",
          type: "string"
        },
        [PARAM_CASE_SENSITIVE]: {
          description: "Optional: Whether the search should be case-sensitive. Defaults to false.",
          type: "boolean"
        },
        [PARAM_RESPECT_GIT_IGNORE]: {
          description: "Optional: Whether to respect .gitignore patterns when finding files. Only available in git repositories. Defaults to true.",
          type: "boolean"
        },
        [PARAM_RESPECT_GEMINI_IGNORE]: {
          description: "Optional: Whether to respect .geminiignore patterns when finding files. Defaults to true.",
          type: "boolean"
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  list_directory: {
    name: LS_TOOL_NAME,
    description: "Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_DIR_PATH]: {
          description: "The path to the directory to list",
          type: "string"
        },
        [LS_PARAM_IGNORE]: {
          description: "List of glob patterns to ignore",
          items: {
            type: "string"
          },
          type: "array"
        },
        [PARAM_FILE_FILTERING_OPTIONS]: {
          description: "Optional: Whether to respect ignore patterns from .gitignore or .geminiignore",
          type: "object",
          properties: {
            [PARAM_RESPECT_GIT_IGNORE]: {
              description: "Optional: Whether to respect .gitignore patterns when listing files. Only available in git repositories. Defaults to true.",
              type: "boolean"
            },
            [PARAM_RESPECT_GEMINI_IGNORE]: {
              description: "Optional: Whether to respect .geminiignore patterns when listing files. Defaults to true.",
              type: "boolean"
            }
          }
        }
      },
      required: [PARAM_DIR_PATH]
    }
  },
  run_shell_command: (enableInteractiveShell, enableEfficiency, enableToolSandboxing) => getShellDeclaration(enableInteractiveShell, enableEfficiency, enableToolSandboxing),
  replace: {
    name: EDIT_TOOL_NAME,
    description: `Replaces text within a file. By default, the tool expects to find and replace exactly ONE occurrence of \`old_string\`. If you want to replace multiple occurrences of the exact same string, set \`allow_multiple\` to true. This tool requires providing significant context around the change to ensure precise targeting. Always use the ${READ_FILE_TOOL_NAME} tool to examine the file's current content before attempting a text replacement.
      
      The user has the ability to modify the \`new_string\` content. If modified, this will be stated in the response.
      
      Expectation for required parameters:
      1. \`old_string\` MUST be the exact literal text to replace (including all whitespace, indentation, newlines, and surrounding code etc.).
      2. \`new_string\` MUST be the exact literal text to replace \`old_string\` with (also including all whitespace, indentation, newlines, and surrounding code etc.). Ensure the resulting code is correct and idiomatic and that \`old_string\` and \`new_string\` are different.
      3. \`instruction\` is the detailed instruction of what needs to be changed. It is important to Make it specific and detailed so developers or large language models can understand what needs to be changed and perform the changes on their own if necessary. 
      4. NEVER escape \`old_string\` or \`new_string\`, that would break the exact literal text requirement.
      **Important:** If ANY of the above are not satisfied, the tool will fail. CRITICAL for \`old_string\`: Must uniquely identify the instance(s) to change. Include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. If this string matches multiple locations and \`allow_multiple\` is not true, the tool will fail.
      5. Prefer to break down complex and long changes into multiple smaller atomic calls to this tool. Always check the content of the file after changes or not finding a string to match.
      **Multiple replacements:** Set \`allow_multiple\` to true if you want to replace ALL occurrences that match \`old_string\` exactly.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "The path to the file to modify.",
          type: "string"
        },
        [EDIT_PARAM_INSTRUCTION]: {
          description: `A clear, semantic instruction for the code change, acting as a high-quality prompt for an expert LLM assistant. It must be self-contained and explain the goal of the change.

A good instruction should concisely answer:
1.  WHY is the change needed? (e.g., "To fix a bug where users can be null...")
2.  WHERE should the change happen? (e.g., "...in the 'renderUserProfile' function...")
3.  WHAT is the high-level change? (e.g., "...add a null check for the 'user' object...")
4.  WHAT is the desired outcome? (e.g., "...so that it displays a loading spinner instead of crashing.")

**GOOD Example:** "In the 'calculateTotal' function, correct the sales tax calculation by updating the 'taxRate' constant from 0.05 to 0.075 to reflect the new regional tax laws."

**BAD Examples:**
- "Change the text." (Too vague)
- "Fix the bug." (Doesn't explain the bug or the fix)
- "Replace the line with this new line." (Brittle, just repeats the other parameters)
`,
          type: "string"
        },
        [EDIT_PARAM_OLD_STRING]: {
          description: "The exact literal text to replace, preferably unescaped. For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.",
          type: "string"
        },
        [EDIT_PARAM_NEW_STRING]: {
          description: "The exact literal text to replace `old_string` with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic. Do not use omission placeholders like '(rest of methods ...)', '...', or 'unchanged code'; provide exact literal code.",
          type: "string"
        },
        [EDIT_PARAM_ALLOW_MULTIPLE]: {
          type: "boolean",
          description: "If true, the tool will replace all occurrences of `old_string`. If false (default), it will only succeed if exactly one occurrence is found."
        }
      },
      required: [
        PARAM_FILE_PATH,
        EDIT_PARAM_INSTRUCTION,
        EDIT_PARAM_OLD_STRING,
        EDIT_PARAM_NEW_STRING
      ]
    }
  },
  google_web_search: {
    name: WEB_SEARCH_TOOL_NAME,
    description: "Performs a web search using Google Search (via the Gemini API) and returns the results. This tool is useful for finding information on the internet based on a query.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [WEB_SEARCH_PARAM_QUERY]: {
          type: "string",
          description: "The search query to find information on the web."
        }
      },
      required: [WEB_SEARCH_PARAM_QUERY]
    }
  },
  web_fetch: {
    name: WEB_FETCH_TOOL_NAME,
    description: "Processes content from URL(s), including local and private network addresses (e.g., localhost), embedded in a prompt. Include up to 20 URLs and instructions (e.g., summarize, extract specific data) directly in the 'prompt' parameter.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [WEB_FETCH_PARAM_PROMPT]: {
          description: 'A comprehensive prompt that includes the URL(s) (up to 20) to fetch and specific instructions on how to process their content (e.g., "Summarize https://example.com/article and extract key points from https://another.com/data"). All URLs to be fetched must be valid and complete, starting with "http://" or "https://", and be fully-formed with a valid hostname (e.g., a domain name like "example.com" or an IP address). For example, "https://example.com" is valid, but "example.com" is not.',
          type: "string"
        }
      },
      required: [WEB_FETCH_PARAM_PROMPT]
    }
  },
  read_many_files: {
    name: READ_MANY_FILES_TOOL_NAME,
    description: `Reads content from multiple files specified by glob patterns within a configured target directory. For text files, it concatenates their content into a single string. It is primarily designed for text-based files. However, it can also process image (e.g., .png, .jpg), audio (e.g., .mp3, .wav), and PDF (.pdf) files if their file names or extensions are explicitly included in the 'include' argument. For these explicitly requested non-text files, their data is read and included in a format suitable for model consumption (e.g., base64 encoded).

This tool is useful when you need to understand or analyze a collection of files, such as:
- Getting an overview of a codebase or parts of it (e.g., all TypeScript files in the 'src' directory).
- Finding where specific functionality is implemented if the user asks broad questions about code.
- Reviewing documentation files (e.g., all Markdown files in the 'docs' directory).
- Gathering context from multiple configuration files.
- When the user asks to "read all files in X directory" or "show me the content of all Y files".

Use this tool when the user's query implies needing the content of several files simultaneously for context, analysis, or summarization. For text files, it uses default UTF-8 encoding and a '--- {filePath} ---' separator between file contents. The tool inserts a '--- End of content ---' after the last file. Ensure glob patterns are relative to the target directory. Glob patterns like 'src/**/*.js' are supported. Avoid using for single files if a more specific single-file reading tool is available, unless the user specifically requests to process a list containing just one file via this tool. Other binary files (not explicitly requested as image/audio/PDF) are generally skipped. Default excludes apply to common non-text files (except for explicitly requested images/audio/PDFs) and large dependency directories unless 'useDefaultExcludes' is false.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [READ_MANY_PARAM_INCLUDE]: {
          type: "array",
          items: {
            type: "string",
            minLength: 1
          },
          minItems: 1,
          description: 'An array of glob patterns or paths. Examples: ["src/**/*.ts"], ["README.md", "docs/"]'
        },
        [READ_MANY_PARAM_EXCLUDE]: {
          type: "array",
          items: {
            type: "string",
            minLength: 1
          },
          description: 'Optional. Glob patterns for files/directories to exclude. Added to default excludes if useDefaultExcludes is true. Example: "**/*.log", "temp/"',
          default: []
        },
        [READ_MANY_PARAM_RECURSIVE]: {
          type: "boolean",
          description: "Optional. Whether to search recursively (primarily controlled by `**` in glob patterns). Defaults to true.",
          default: true
        },
        [READ_MANY_PARAM_USE_DEFAULT_EXCLUDES]: {
          type: "boolean",
          description: "Optional. Whether to apply a list of default exclusion patterns (e.g., node_modules, .git, binary files). Defaults to true.",
          default: true
        },
        [PARAM_FILE_FILTERING_OPTIONS]: {
          description: "Whether to respect ignore patterns from .gitignore or .geminiignore",
          type: "object",
          properties: {
            [PARAM_RESPECT_GIT_IGNORE]: {
              description: "Optional: Whether to respect .gitignore patterns when listing files. Only available in git repositories. Defaults to true.",
              type: "boolean"
            },
            [PARAM_RESPECT_GEMINI_IGNORE]: {
              description: "Optional: Whether to respect .geminiignore patterns when listing files. Defaults to true.",
              type: "boolean"
            }
          }
        }
      },
      required: [READ_MANY_PARAM_INCLUDE]
    }
  },
  save_memory: {
    name: MEMORY_TOOL_NAME,
    description: `
Saves concise global user context (preferences, facts) for use across ALL workspaces.

### CRITICAL: GLOBAL CONTEXT ONLY
NEVER save workspace-specific context, local paths, or commands (e.g. "The entry point is src/index.js", "The test command is npm test"). These are local to the current workspace and must NOT be saved globally. EXCLUSIVELY for context relevant across ALL workspaces.

- Use for "Remember X" or clear personal facts.
- Do NOT use for session context.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [MEMORY_PARAM_FACT]: {
          type: "string",
          description: "The specific fact or piece of information to remember. Should be a clear, self-contained statement."
        }
      },
      required: [MEMORY_PARAM_FACT],
      additionalProperties: false
    }
  },
  write_todos: {
    name: WRITE_TODOS_TOOL_NAME,
    description: `This tool can help you list out the current subtasks that are required to be completed for a given user request. The list of subtasks helps you keep track of the current task, organize complex queries and help ensure that you don't miss any steps. With this list, the user can also see the current progress you are making in executing a given task.

Depending on the task complexity, you should first divide a given task into subtasks and then use this tool to list out the subtasks that are required to be completed for a given user request.
Each of the subtasks should be clear and distinct. 

Use this tool for complex queries that require multiple steps. If you find that the request is actually complex after you have started executing the user task, create a todo list and use it. If execution of the user task requires multiple steps, planning and generally is higher complexity than a simple Q&A, use this tool.

DO NOT use this tool for simple tasks that can be completed in less than 2 steps. If the user query is simple and straightforward, do not use the tool. If you can respond with an answer in a single turn then this tool is not required.

## Task state definitions

- pending: Work has not begun on a given subtask.
- in_progress: Marked just prior to beginning work on a given subtask. You should only have one subtask as in_progress at a time.
- completed: Subtask was successfully completed with no errors or issues. If the subtask required more steps to complete, update the todo list with the subtasks. All steps should be identified as completed only when they are completed.
- cancelled: As you update the todo list, some tasks are not required anymore due to the dynamic nature of the task. In this case, mark the subtasks as cancelled.
- blocked: Subtask is blocked and cannot be completed at this time.


## Methodology for using this tool
1. Use this todo list as soon as you receive a user request based on the complexity of the task.
2. Keep track of every subtask that you update the list with.
3. Mark a subtask as in_progress before you begin working on it. You should only have one subtask as in_progress at a time.
4. Update the subtask list as you proceed in executing the task. The subtask list is not static and should reflect your progress and current plans, which may evolve as you acquire new information.
5. Mark a subtask as completed when you have completed it.
6. Mark a subtask as cancelled if the subtask is no longer needed.
7. You must update the todo list as soon as you start, stop or cancel a subtask. Don't batch or wait to update the todo list.


## Examples of When to Use the Todo List

<example>
User request: Create a website with a React for creating fancy logos using gemini-2.5-flash-image

ToDo list created by the agent:
1. Initialize a new React project environment (e.g., using Vite).
2. Design and build the core UI components: a text input (prompt field) for the logo description, selection controls for style parameters (if the API supports them), and an image preview area.
3. Implement state management (e.g., React Context or Zustand) to manage the user's input prompt, the API loading status (pending, success, error), and the resulting image data.
4. Create an API service module within the React app (using "fetch" or "axios") to securely format and send the prompt data via an HTTP POST request to the specified "gemini-2.5-flash-image" (Gemini model) endpoint.
5. Implement asynchronous logic to handle the API call: show a loading indicator while the request is pending, retrieve the generated image (e.g., as a URL or base64 string) upon success, and display any errors.
6. Display the returned "fancy logo" from the API response in the preview area component.
7. Add functionality (e.g., a "Download" button) to allow the user to save the generated image file.
8. Deploy the application to a web server or hosting platform.

<reasoning>
The agent used the todo list to break the task into distinct, manageable steps:
1. Building an entire interactive web application from scratch is a highly complex, multi-stage process involving setup, UI development, logic integration, and deployment.
2. The agent inferred the core functionality required for a "logo creator," such as UI controls for customization (Task 3) and an export feature (Task 7), which must be tracked as distinct goals.
3. The agent rightly inferred the requirement of an API service model for interacting with the image model endpoint.
</reasoning>
</example>


## Examples of When NOT to Use the Todo List

<example>
User request: Ensure that the test <test file> passes.

Agent:
<Goes into a loop of running the test, identifying errors, and updating the code until the test passes.>

<reasoning>
The agent did not use the todo list because this task could be completed by a tight loop of execute test->edit->execute test.
</reasoning>
</example>`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [TODOS_PARAM_TODOS]: {
          type: "array",
          description: "The complete list of todo items. This will replace the existing list.",
          items: {
            type: "object",
            description: "A single todo item.",
            properties: {
              [TODOS_ITEM_PARAM_DESCRIPTION]: {
                type: "string",
                description: "The description of the task."
              },
              [TODOS_ITEM_PARAM_STATUS]: {
                type: "string",
                description: "The current status of the task.",
                enum: [
                  "pending",
                  "in_progress",
                  "completed",
                  "cancelled",
                  "blocked"
                ]
              }
            },
            required: [TODOS_ITEM_PARAM_DESCRIPTION, TODOS_ITEM_PARAM_STATUS],
            additionalProperties: false
          }
        }
      },
      required: [TODOS_PARAM_TODOS],
      additionalProperties: false
    }
  },
  get_internal_docs: {
    name: GET_INTERNAL_DOCS_TOOL_NAME,
    description: "Returns the content of Gemini CLI internal documentation files. If no path is provided, returns a list of all available documentation paths.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [DOCS_PARAM_PATH]: {
          description: "The relative path to the documentation file (e.g., 'cli/commands.md'). If omitted, lists all available documentation.",
          type: "string"
        }
      }
    }
  },
  ask_user: {
    name: ASK_USER_TOOL_NAME,
    description: "Ask the user one or more questions to gather preferences, clarify requirements, or make decisions.",
    parametersJsonSchema: {
      type: "object",
      required: [ASK_USER_PARAM_QUESTIONS],
      properties: {
        [ASK_USER_PARAM_QUESTIONS]: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "object",
            required: [
              ASK_USER_QUESTION_PARAM_QUESTION,
              ASK_USER_QUESTION_PARAM_HEADER,
              ASK_USER_QUESTION_PARAM_TYPE
            ],
            properties: {
              [ASK_USER_QUESTION_PARAM_QUESTION]: {
                type: "string",
                description: "The complete question to ask the user. Should be clear, specific, and end with a question mark."
              },
              [ASK_USER_QUESTION_PARAM_HEADER]: {
                type: "string",
                description: 'Very short label displayed as a chip/tag. Use abbreviations: "Auth" not "Authentication", "Config" not "Configuration". Examples: "Auth method", "Library", "Approach", "Database".'
              },
              [ASK_USER_QUESTION_PARAM_TYPE]: {
                type: "string",
                enum: ["choice", "text", "yesno"],
                default: "choice",
                description: "Question type: 'choice' (default) for multiple-choice with options, 'text' for free-form input, 'yesno' for Yes/No confirmation."
              },
              [ASK_USER_QUESTION_PARAM_OPTIONS]: {
                type: "array",
                description: "The selectable choices for 'choice' type questions. Provide 2-4 options. An 'Other' option is automatically added. Not needed for 'text' or 'yesno' types.",
                items: {
                  type: "object",
                  required: [
                    ASK_USER_OPTION_PARAM_LABEL,
                    ASK_USER_OPTION_PARAM_DESCRIPTION
                  ],
                  properties: {
                    [ASK_USER_OPTION_PARAM_LABEL]: {
                      type: "string",
                      description: 'The display text for this option (1-5 words). Example: "OAuth 2.0"'
                    },
                    [ASK_USER_OPTION_PARAM_DESCRIPTION]: {
                      type: "string",
                      description: 'Brief explanation of this option. Example: "Industry standard, supports SSO"'
                    }
                  }
                }
              },
              [ASK_USER_QUESTION_PARAM_MULTI_SELECT]: {
                type: "boolean",
                description: "Only applies when type='choice'. Set to true to allow selecting multiple options."
              },
              [ASK_USER_QUESTION_PARAM_PLACEHOLDER]: {
                type: "string",
                description: "Hint text shown in the input field. For type='text', shown in the main input. For type='choice', shown in the 'Other' custom input."
              }
            }
          }
        }
      }
    }
  },
  enter_plan_mode: {
    name: ENTER_PLAN_MODE_TOOL_NAME,
    description: "Switch to Plan Mode to safely research, design, and plan complex changes using read-only tools.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PLAN_MODE_PARAM_REASON]: {
          type: "string",
          description: "Short reason explaining why you are entering plan mode."
        }
      }
    }
  },
  exit_plan_mode: () => getExitPlanModeDeclaration(),
  activate_skill: (skillNames) => getActivateSkillDeclaration(skillNames)
};

// packages/core/dist/src/utils/constants.js
var REFERENCE_CONTENT_START = "--- Content from referenced files ---";
var REFERENCE_CONTENT_END = "--- End of content ---";
var DEFAULT_MAX_LINES_TEXT_FILE = 2e3;
var MAX_LINE_LENGTH_TEXT_FILE = 2e3;
var MAX_FILE_SIZE_MB = 20;

// packages/core/dist/src/tools/definitions/model-family-sets/gemini-3.js
var GEMINI_3_SET = {
  read_file: {
    name: READ_FILE_TOOL_NAME,
    description: `Reads and returns the content of a specified file. To maintain context efficiency, you MUST use 'start_line' and 'end_line' for targeted, surgical reads of specific sections. For your safety, the tool will automatically truncate output exceeding ${DEFAULT_MAX_LINES_TEXT_FILE} lines, ${MAX_LINE_LENGTH_TEXT_FILE} characters per line, or ${MAX_FILE_SIZE_MB}MB in size; however, triggering these limits is considered token-inefficient. Always retrieve only the minimum content necessary for your next step. Handles text, images (PNG, JPG, GIF, WEBP, SVG, BMP), audio files (MP3, WAV, AIFF, AAC, OGG, FLAC), and PDF files.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "The path to the file to read.",
          type: "string"
        },
        [READ_FILE_PARAM_START_LINE]: {
          description: "Optional: The 1-based line number to start reading from.",
          type: "number"
        },
        [READ_FILE_PARAM_END_LINE]: {
          description: "Optional: The 1-based line number to end reading at (inclusive).",
          type: "number"
        }
      },
      required: [PARAM_FILE_PATH]
    }
  },
  write_file: {
    name: WRITE_FILE_TOOL_NAME,
    description: `Writes the complete content to a file, automatically creating missing parent directories. Overwrites existing files. The user has the ability to modify 'content' before it is saved. Best for new or small files; use '${EDIT_TOOL_NAME}' for targeted edits to large files.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "Path to the file.",
          type: "string"
        },
        [WRITE_FILE_PARAM_CONTENT]: {
          description: "The complete content to write. Provide the full file; do not use placeholders like '// ... rest of code'.",
          type: "string"
        }
      },
      required: [PARAM_FILE_PATH, WRITE_FILE_PARAM_CONTENT]
    }
  },
  grep_search: {
    name: GREP_TOOL_NAME,
    description: "Searches for a regular expression pattern within file contents. Max 100 matches.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: `The regular expression (regex) pattern to search for within file contents (e.g., 'function\\s+myFunction', 'import\\s+\\{.*\\}\\s+from\\s+.*').`,
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Optional: The absolute path to the directory to search within. If omitted, searches the current working directory.",
          type: "string"
        },
        [GREP_PARAM_INCLUDE_PATTERN]: {
          description: `Optional: A glob pattern to filter which files are searched (e.g., '*.js', '*.{ts,tsx}', 'src/**'). If omitted, searches all files (respecting potential global ignores).`,
          type: "string"
        },
        [GREP_PARAM_EXCLUDE_PATTERN]: {
          description: "Optional: A regular expression pattern to exclude from the search results. If a line matches both the pattern and the exclude_pattern, it will be omitted.",
          type: "string"
        },
        [GREP_PARAM_NAMES_ONLY]: {
          description: "Optional: If true, only the file paths of the matches will be returned, without the line content or line numbers. This is useful for gathering a list of files.",
          type: "boolean"
        },
        [GREP_PARAM_MAX_MATCHES_PER_FILE]: {
          description: "Optional: Maximum number of matches to return per file. Use this to prevent being overwhelmed by repetitive matches in large files.",
          type: "integer",
          minimum: 1
        },
        [GREP_PARAM_TOTAL_MAX_MATCHES]: {
          description: "Optional: Maximum number of total matches to return. Use this to limit the overall size of the response. Defaults to 100 if omitted.",
          type: "integer",
          minimum: 1
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  grep_search_ripgrep: {
    name: GREP_TOOL_NAME,
    description: 'Searches for a regular expression pattern within file contents. This tool is FAST and optimized, powered by ripgrep. PREFERRED over standard `run_shell_command("grep ...")` due to better performance and automatic output limiting (defaults to 100 matches, but can be increased via `total_max_matches`).',
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: `The pattern to search for. By default, treated as a Rust-flavored regular expression. Use '\\b' for precise symbol matching (e.g., '\\bMatchMe\\b').`,
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Directory or file to search. Directories are searched recursively. Relative paths are resolved against current working directory. Defaults to current working directory ('.') if omitted.",
          type: "string"
        },
        [GREP_PARAM_INCLUDE_PATTERN]: {
          description: "Glob pattern to filter files (e.g., '*.ts', 'src/**'). Recommended for large repositories to reduce noise. Defaults to all files if omitted.",
          type: "string"
        },
        [GREP_PARAM_EXCLUDE_PATTERN]: {
          description: "Optional: A regular expression pattern to exclude from the search results. If a line matches both the pattern and the exclude_pattern, it will be omitted.",
          type: "string"
        },
        [GREP_PARAM_NAMES_ONLY]: {
          description: "Optional: If true, only the file paths of the matches will be returned, without the line content or line numbers. This is useful for gathering a list of files.",
          type: "boolean"
        },
        [PARAM_CASE_SENSITIVE]: {
          description: "If true, search is case-sensitive. Defaults to false (ignore case) if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_FIXED_STRINGS]: {
          description: "If true, treats the `pattern` as a literal string instead of a regular expression. Defaults to false (basic regex) if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_CONTEXT]: {
          description: "Show this many lines of context around each match (equivalent to grep -C). Defaults to 0 if omitted.",
          type: "integer"
        },
        [GREP_PARAM_AFTER]: {
          description: "Show this many lines after each match (equivalent to grep -A). Defaults to 0 if omitted.",
          type: "integer",
          minimum: 0
        },
        [GREP_PARAM_BEFORE]: {
          description: "Show this many lines before each match (equivalent to grep -B). Defaults to 0 if omitted.",
          type: "integer",
          minimum: 0
        },
        [GREP_PARAM_NO_IGNORE]: {
          description: "If true, searches all files including those usually ignored (like in .gitignore, build/, dist/, etc). Defaults to false if omitted.",
          type: "boolean"
        },
        [GREP_PARAM_MAX_MATCHES_PER_FILE]: {
          description: "Optional: Maximum number of matches to return per file. Use this to prevent being overwhelmed by repetitive matches in large files.",
          type: "integer",
          minimum: 1
        },
        [GREP_PARAM_TOTAL_MAX_MATCHES]: {
          description: "Optional: Maximum number of total matches to return. Use this to limit the overall size of the response. Defaults to 100 if omitted.",
          type: "integer",
          minimum: 1
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  glob: {
    name: GLOB_TOOL_NAME,
    description: "Efficiently finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time (newest first). Ideal for quickly locating files based on their name or path structure, especially in large codebases.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_PATTERN]: {
          description: "The glob pattern to match against (e.g., '**/*.py', 'docs/*.md').",
          type: "string"
        },
        [PARAM_DIR_PATH]: {
          description: "Optional: The absolute path to the directory to search within. If omitted, searches the root directory.",
          type: "string"
        },
        [PARAM_CASE_SENSITIVE]: {
          description: "Optional: Whether the search should be case-sensitive. Defaults to false.",
          type: "boolean"
        },
        [PARAM_RESPECT_GIT_IGNORE]: {
          description: "Optional: Whether to respect .gitignore patterns when finding files. Only available in git repositories. Defaults to true.",
          type: "boolean"
        },
        [PARAM_RESPECT_GEMINI_IGNORE]: {
          description: "Optional: Whether to respect .geminiignore patterns when finding files. Defaults to true.",
          type: "boolean"
        }
      },
      required: [PARAM_PATTERN]
    }
  },
  list_directory: {
    name: LS_TOOL_NAME,
    description: "Lists the names of files and subdirectories directly within a specified directory path. Can optionally ignore entries matching provided glob patterns.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_DIR_PATH]: {
          description: "The path to the directory to list",
          type: "string"
        },
        [LS_PARAM_IGNORE]: {
          description: "List of glob patterns to ignore",
          items: {
            type: "string"
          },
          type: "array"
        },
        [PARAM_FILE_FILTERING_OPTIONS]: {
          description: "Optional: Whether to respect ignore patterns from .gitignore or .geminiignore",
          type: "object",
          properties: {
            [PARAM_RESPECT_GIT_IGNORE]: {
              description: "Optional: Whether to respect .gitignore patterns when listing files. Only available in git repositories. Defaults to true.",
              type: "boolean"
            },
            [PARAM_RESPECT_GEMINI_IGNORE]: {
              description: "Optional: Whether to respect .geminiignore patterns when listing files. Defaults to true.",
              type: "boolean"
            }
          }
        }
      },
      required: [PARAM_DIR_PATH]
    }
  },
  run_shell_command: (enableInteractiveShell, enableEfficiency, enableToolSandboxing) => getShellDeclaration(enableInteractiveShell, enableEfficiency, enableToolSandboxing),
  replace: {
    name: EDIT_TOOL_NAME,
    description: `Replaces text within a file. By default, the tool expects to find and replace exactly ONE occurrence of \`old_string\`. If you want to replace multiple occurrences of the exact same string, set \`allow_multiple\` to true. This tool requires providing significant context around the change to ensure precise targeting.
The user has the ability to modify the \`new_string\` content. If modified, this will be stated in the response.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PARAM_FILE_PATH]: {
          description: "The path to the file to modify.",
          type: "string"
        },
        [EDIT_PARAM_INSTRUCTION]: {
          description: `A clear, semantic instruction for the code change, acting as a high-quality prompt for an expert LLM assistant. It must be self-contained and explain the goal of the change.`,
          type: "string"
        },
        [EDIT_PARAM_OLD_STRING]: {
          description: "The exact literal text to replace, unescaped. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.",
          type: "string"
        },
        [EDIT_PARAM_NEW_STRING]: {
          description: "The exact literal text to replace `old_string` with, unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic. Do not use omission placeholders like '(rest of methods ...)', '...', or 'unchanged code'; provide exact literal code.",
          type: "string"
        },
        [EDIT_PARAM_ALLOW_MULTIPLE]: {
          type: "boolean",
          description: "If true, the tool will replace all occurrences of `old_string`. If false (default), it will only succeed if exactly one occurrence is found."
        }
      },
      required: [
        PARAM_FILE_PATH,
        EDIT_PARAM_INSTRUCTION,
        EDIT_PARAM_OLD_STRING,
        EDIT_PARAM_NEW_STRING
      ]
    }
  },
  google_web_search: {
    name: WEB_SEARCH_TOOL_NAME,
    description: `Performs a grounded Google Search to find information across the internet. Returns a synthesized answer with citations (e.g., [1]) and source URIs. Best for finding up-to-date documentation, troubleshooting obscure errors, or broad research. Use this when you don't have a specific URL. If a search result requires deeper analysis, follow up by using '${WEB_FETCH_TOOL_NAME}' on the provided URI.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [WEB_SEARCH_PARAM_QUERY]: {
          type: "string",
          description: "The search query. Supports natural language questions (e.g., 'Latest breaking changes in React 19') or specific technical queries."
        }
      },
      required: [WEB_SEARCH_PARAM_QUERY]
    }
  },
  web_fetch: {
    name: WEB_FETCH_TOOL_NAME,
    description: "Analyzes and extracts information from up to 20 URLs. Ideal for documentation review, technical research, or reading raw code from GitHub. You can provide specific, complex instructions for the extraction (e.g., 'Summarize the breaking changes'). Provides cited answers based on the content. GitHub 'blob' URLs are automatically converted to raw versions for better processing. Supports HTTP/HTTPS only.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [WEB_FETCH_PARAM_PROMPT]: {
          description: "A string containing the URL(s) and your specific analysis instructions. Be clear about what information you want to find or summarize. Supports up to 20 URLs.",
          type: "string"
        }
      },
      required: [WEB_FETCH_PARAM_PROMPT]
    }
  },
  read_many_files: {
    name: READ_MANY_FILES_TOOL_NAME,
    description: `Reads content from multiple files specified by glob patterns within a configured target directory. For text files, it concatenates their content into a single string. It is primarily designed for text-based files. However, it can also process image (e.g., .png, .jpg), audio (e.g., .mp3, .wav), and PDF (.pdf) files if their file names or extensions are explicitly included in the 'include' argument. For these explicitly requested non-text files, their data is read and included in a format suitable for model consumption (e.g., base64 encoded).

This tool is useful when you need to understand or analyze a collection of files, such as:
- Getting an overview of a codebase or parts of it (e.g., all TypeScript files in the 'src' directory).
- Finding where specific functionality is implemented if the user asks broad questions about code.
- Reviewing documentation files (e.g., all Markdown files in the 'docs' directory).
- Gathering context from multiple configuration files.
- When the user asks to "read all files in X directory" or "show me the content of all Y files".

Use this tool when the user's query implies needing the content of several files simultaneously for context, analysis, or summarization. For text files, it uses default UTF-8 encoding and a '--- {filePath} ---' separator between file contents. The tool inserts a '--- End of content ---' after the last file. Ensure glob patterns are relative to the target directory. Glob patterns like 'src/**/*.js' are supported. Avoid using for single files if a more specific single-file reading tool is available, unless the user specifically requests to process a list containing just one file via this tool. Other binary files (not explicitly requested as image/audio/PDF) are generally skipped. Default excludes apply to common non-text files (except for explicitly requested images/audio/PDFs) and large dependency directories unless 'useDefaultExcludes' is false.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [READ_MANY_PARAM_INCLUDE]: {
          type: "array",
          items: {
            type: "string",
            minLength: 1
          },
          minItems: 1,
          description: 'An array of glob patterns or paths. Examples: ["src/**/*.ts"], ["README.md", "docs/"]'
        },
        [READ_MANY_PARAM_EXCLUDE]: {
          type: "array",
          items: {
            type: "string",
            minLength: 1
          },
          description: 'Optional. Glob patterns for files/directories to exclude. Added to default excludes if useDefaultExcludes is true. Example: "**/*.log", "temp/"',
          default: []
        },
        [READ_MANY_PARAM_RECURSIVE]: {
          type: "boolean",
          description: "Optional. Whether to search recursively (primarily controlled by `**` in glob patterns). Defaults to true.",
          default: true
        },
        [READ_MANY_PARAM_USE_DEFAULT_EXCLUDES]: {
          type: "boolean",
          description: "Optional. Whether to apply a list of default exclusion patterns (e.g., node_modules, .git, binary files). Defaults to true.",
          default: true
        },
        [PARAM_FILE_FILTERING_OPTIONS]: {
          description: "Whether to respect ignore patterns from .gitignore or .geminiignore",
          type: "object",
          properties: {
            [PARAM_RESPECT_GIT_IGNORE]: {
              description: "Optional: Whether to respect .gitignore patterns when listing files. Only available in git repositories. Defaults to true.",
              type: "boolean"
            },
            [PARAM_RESPECT_GEMINI_IGNORE]: {
              description: "Optional: Whether to respect .geminiignore patterns when listing files. Defaults to true.",
              type: "boolean"
            }
          }
        }
      },
      required: [READ_MANY_PARAM_INCLUDE]
    }
  },
  save_memory: {
    name: MEMORY_TOOL_NAME,
    description: `Persists global preferences or facts across ALL future sessions. Use this for recurring instructions like coding styles or tool aliases. Unlike '${WRITE_FILE_TOOL_NAME}', which is for project-specific files, this appends to a global memory file loaded in every workspace. If you are unsure whether a fact should be remembered globally, ask the user first. CRITICAL: Do not use for session-specific context or temporary data.`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [MEMORY_PARAM_FACT]: {
          type: "string",
          description: "A concise, global fact or preference (e.g., 'I prefer using tabs'). Do not include local paths or project-specific names."
        }
      },
      required: [MEMORY_PARAM_FACT],
      additionalProperties: false
    }
  },
  write_todos: {
    name: WRITE_TODOS_TOOL_NAME,
    description: `This tool can help you list out the current subtasks that are required to be completed for a given user request. The list of subtasks helps you keep track of the current task, organize complex queries and help ensure that you don't miss any steps. With this list, the user can also see the current progress you are making in executing a given task.

Depending on the task complexity, you should first divide a given task into subtasks and then use this tool to list out the subtasks that are required to be completed for a given user request.
Each of the subtasks should be clear and distinct. 

Use this tool for complex queries that require multiple steps. If you find that the request is actually complex after you have started executing the user task, create a todo list and use it. If execution of the user task requires multiple steps, planning and generally is higher complexity than a simple Q&A, use this tool.

DO NOT use this tool for simple tasks that can be completed in less than 2 steps. If the user query is simple and straightforward, do not use the tool. If you can respond with an answer in a single turn then this tool is not required.

## Task state definitions

- pending: Work has not begun on a given subtask.
- in_progress: Marked just prior to beginning work on a given subtask. You should only have one subtask as in_progress at a time.
- completed: Subtask was successfully completed with no errors or issues. If the subtask required more steps to complete, update the todo list with the subtasks. All steps should be identified as completed only when they are completed.
- cancelled: As you update the todo list, some tasks are not required anymore due to the dynamic nature of the task. In this case, mark the subtasks as cancelled.
- blocked: Subtask is blocked and cannot be completed at this time.


## Methodology for using this tool
1. Use this todo list as soon as you receive a user request based on the complexity of the task.
2. Keep track of every subtask that you update the list with.
3. Mark a subtask as in_progress before you begin working on it. You should only have one subtask as in_progress at a time.
4. Update the subtask list as you proceed in executing the task. The subtask list is not static and should reflect your progress and current plans, which may evolve as you acquire new information.
5. Mark a subtask as completed when you have completed it.
6. Mark a subtask as cancelled if the subtask is no longer needed.
7. You must update the todo list as soon as you start, stop or cancel a subtask. Don't batch or wait to update the todo list.


## Examples of When to Use the Todo List

<example>
User request: Create a website with a React for creating fancy logos using gemini-2.5-flash-image

ToDo list created by the agent:
1. Initialize a new React project environment (e.g., using Vite).
2. Design and build the core UI components: a text input (prompt field) for the logo description, selection controls for style parameters (if the API supports them), and an image preview area.
3. Implement state management (e.g., React Context or Zustand) to manage the user's input prompt, the API loading status (pending, success, error), and the resulting image data.
4. Create an API service module within the React app (using "fetch" or "axios") to securely format and send the prompt data via an HTTP POST request to the specified "gemini-2.5-flash-image" (Gemini model) endpoint.
5. Implement asynchronous logic to handle the API call: show a loading indicator while the request is pending, retrieve the generated image (e.g., as a URL or base64 string) upon success, and display any errors.
6. Display the returned "fancy logo" from the API response in the preview area component.
7. Add functionality (e.g., a "Download" button) to allow the user to save the generated image file.
8. Deploy the application to a web server or hosting platform.

<reasoning>
The agent used the todo list to break the task into distinct, manageable steps:
1. Building an entire interactive web application from scratch is a highly complex, multi-stage process involving setup, UI development, logic integration, and deployment.
2. The agent inferred the core functionality required for a "logo creator," such as UI controls for customization (Task 3) and an export feature (Task 7), which must be tracked as distinct goals.
3. The agent rightly inferred the requirement of an API service model for interacting with the image model endpoint.
</reasoning>
</example>


## Examples of When NOT to Use the Todo List

<example>
User request: Ensure that the test <test file> passes.

Agent:
<Goes into a loop of running the test, identifying errors, and updating the code until the test passes.>

<reasoning>
The agent did not use the todo list because this task could be completed by a tight loop of execute test->edit->execute test.
</reasoning>
</example>`,
    parametersJsonSchema: {
      type: "object",
      properties: {
        [TODOS_PARAM_TODOS]: {
          type: "array",
          description: "The complete list of todo items. This will replace the existing list.",
          items: {
            type: "object",
            description: "A single todo item.",
            properties: {
              [TODOS_ITEM_PARAM_DESCRIPTION]: {
                type: "string",
                description: "The description of the task."
              },
              [TODOS_ITEM_PARAM_STATUS]: {
                type: "string",
                description: "The current status of the task.",
                enum: [
                  "pending",
                  "in_progress",
                  "completed",
                  "cancelled",
                  "blocked"
                ]
              }
            },
            required: [TODOS_ITEM_PARAM_DESCRIPTION, TODOS_ITEM_PARAM_STATUS],
            additionalProperties: false
          }
        }
      },
      required: [TODOS_PARAM_TODOS],
      additionalProperties: false
    }
  },
  get_internal_docs: {
    name: GET_INTERNAL_DOCS_TOOL_NAME,
    description: "Returns the content of Gemini CLI internal documentation files. If no path is provided, returns a list of all available documentation paths.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [DOCS_PARAM_PATH]: {
          description: "The relative path to the documentation file (e.g., 'cli/commands.md'). If omitted, lists all available documentation.",
          type: "string"
        }
      }
    }
  },
  ask_user: {
    name: ASK_USER_TOOL_NAME,
    description: "Ask the user one or more questions to gather preferences, clarify requirements, or make decisions. When using this tool, prefer providing multiple-choice options with detailed descriptions and enable multi-select where appropriate to provide maximum flexibility.",
    parametersJsonSchema: {
      type: "object",
      required: [ASK_USER_PARAM_QUESTIONS],
      properties: {
        [ASK_USER_PARAM_QUESTIONS]: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "object",
            required: [
              ASK_USER_QUESTION_PARAM_QUESTION,
              ASK_USER_QUESTION_PARAM_HEADER,
              ASK_USER_QUESTION_PARAM_TYPE
            ],
            properties: {
              [ASK_USER_QUESTION_PARAM_QUESTION]: {
                type: "string",
                description: "The complete question to ask the user. Should be clear, specific, and end with a question mark."
              },
              [ASK_USER_QUESTION_PARAM_HEADER]: {
                type: "string",
                description: 'Very short label displayed as a chip/tag. Use abbreviations: "Auth" not "Authentication", "Config" not "Configuration". Examples: "Auth method", "Library", "Approach", "Database".'
              },
              [ASK_USER_QUESTION_PARAM_TYPE]: {
                type: "string",
                enum: ["choice", "text", "yesno"],
                default: "choice",
                description: "Question type: 'choice' (default) for multiple-choice with options, 'text' for free-form input, 'yesno' for Yes/No confirmation."
              },
              [ASK_USER_QUESTION_PARAM_OPTIONS]: {
                type: "array",
                description: "The selectable choices for 'choice' type questions. Provide 2-4 options. An 'Other' option is automatically added. Not needed for 'text' or 'yesno' types.",
                items: {
                  type: "object",
                  required: [
                    ASK_USER_OPTION_PARAM_LABEL,
                    ASK_USER_OPTION_PARAM_DESCRIPTION
                  ],
                  properties: {
                    [ASK_USER_OPTION_PARAM_LABEL]: {
                      type: "string",
                      description: 'The display text for this option (1-5 words). Example: "OAuth 2.0"'
                    },
                    [ASK_USER_OPTION_PARAM_DESCRIPTION]: {
                      type: "string",
                      description: 'Brief explanation of this option. Example: "Industry standard, supports SSO"'
                    }
                  }
                }
              },
              [ASK_USER_QUESTION_PARAM_MULTI_SELECT]: {
                type: "boolean",
                description: "Only applies when type='choice'. Set to true to allow selecting multiple options."
              },
              [ASK_USER_QUESTION_PARAM_PLACEHOLDER]: {
                type: "string",
                description: "Hint text shown in the input field. For type='text', shown in the main input. For type='choice', shown in the 'Other' custom input."
              }
            }
          }
        }
      }
    }
  },
  enter_plan_mode: {
    name: ENTER_PLAN_MODE_TOOL_NAME,
    description: "Switch to Plan Mode to safely research, design, and plan complex changes using read-only tools.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        [PLAN_MODE_PARAM_REASON]: {
          type: "string",
          description: "Short reason explaining why you are entering plan mode."
        }
      }
    }
  },
  exit_plan_mode: () => getExitPlanModeDeclaration(),
  activate_skill: (skillNames) => getActivateSkillDeclaration(skillNames),
  update_topic: getUpdateTopicDeclaration()
};

// packages/core/dist/src/tools/definitions/coreTools.js
function getToolSet(modelId) {
  const family = getToolFamily(modelId);
  switch (family) {
    case "gemini-3":
      return GEMINI_3_SET;
    case "default-legacy":
    default:
      return DEFAULT_LEGACY_SET;
  }
}
var READ_FILE_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.read_file;
  },
  overrides: (modelId) => getToolSet(modelId).read_file
};
var WRITE_FILE_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.write_file;
  },
  overrides: (modelId) => getToolSet(modelId).write_file
};
var GREP_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.grep_search;
  },
  overrides: (modelId) => getToolSet(modelId).grep_search
};
var RIP_GREP_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.grep_search_ripgrep;
  },
  overrides: (modelId) => getToolSet(modelId).grep_search_ripgrep
};
var WEB_SEARCH_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.google_web_search;
  },
  overrides: (modelId) => getToolSet(modelId).google_web_search
};
var EDIT_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.replace;
  },
  overrides: (modelId) => getToolSet(modelId).replace
};
var GLOB_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.glob;
  },
  overrides: (modelId) => getToolSet(modelId).glob
};
var LS_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.list_directory;
  },
  overrides: (modelId) => getToolSet(modelId).list_directory
};
var WEB_FETCH_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.web_fetch;
  },
  overrides: (modelId) => getToolSet(modelId).web_fetch
};
var READ_MANY_FILES_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.read_many_files;
  },
  overrides: (modelId) => getToolSet(modelId).read_many_files
};
var MEMORY_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.save_memory;
  },
  overrides: (modelId) => getToolSet(modelId).save_memory
};
var WRITE_TODOS_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.write_todos;
  },
  overrides: (modelId) => getToolSet(modelId).write_todos
};
var GET_INTERNAL_DOCS_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.get_internal_docs;
  },
  overrides: (modelId) => getToolSet(modelId).get_internal_docs
};
var ASK_USER_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.ask_user;
  },
  overrides: (modelId) => getToolSet(modelId).ask_user
};
var ENTER_PLAN_MODE_DEFINITION = {
  get base() {
    return DEFAULT_LEGACY_SET.enter_plan_mode;
  },
  overrides: (modelId) => getToolSet(modelId).enter_plan_mode
};
function getShellDefinition(enableInteractiveShell, enableEfficiency, enableToolSandboxing = false) {
  return {
    base: getShellDeclaration(enableInteractiveShell, enableEfficiency, enableToolSandboxing),
    overrides: (modelId) => getToolSet(modelId).run_shell_command(enableInteractiveShell, enableEfficiency, enableToolSandboxing)
  };
}
function getExitPlanModeDefinition() {
  return {
    base: getExitPlanModeDeclaration(),
    overrides: (modelId) => getToolSet(modelId).exit_plan_mode()
  };
}
function getActivateSkillDefinition(skillNames) {
  return {
    base: getActivateSkillDeclaration(skillNames),
    overrides: (modelId) => getToolSet(modelId).activate_skill(skillNames)
  };
}

// packages/core/dist/src/tools/tool-names.js
var EDIT_TOOL_NAMES = /* @__PURE__ */ new Set([EDIT_TOOL_NAME, WRITE_FILE_TOOL_NAME]);
var TOOLS_REQUIRING_NARROWING = /* @__PURE__ */ new Set([
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  READ_MANY_FILES_TOOL_NAME,
  READ_FILE_TOOL_NAME,
  LS_TOOL_NAME,
  WRITE_FILE_TOOL_NAME,
  EDIT_TOOL_NAME,
  SHELL_TOOL_NAME
]);
var TRACKER_CREATE_TASK_TOOL_NAME = "tracker_create_task";
var TRACKER_UPDATE_TASK_TOOL_NAME = "tracker_update_task";
var TRACKER_GET_TASK_TOOL_NAME = "tracker_get_task";
var TRACKER_LIST_TASKS_TOOL_NAME = "tracker_list_tasks";
var TRACKER_ADD_DEPENDENCY_TOOL_NAME = "tracker_add_dependency";
var TRACKER_VISUALIZE_TOOL_NAME = "tracker_visualize";
var WRITE_FILE_DISPLAY_NAME = "WriteFile";
var EDIT_DISPLAY_NAME = "Edit";
var ASK_USER_DISPLAY_NAME = "Ask User";
var READ_FILE_DISPLAY_NAME = "ReadFile";
var GLOB_DISPLAY_NAME = "FindFiles";
var LS_DISPLAY_NAME = "ReadFolder";
var GREP_DISPLAY_NAME = "SearchText";
var WEB_SEARCH_DISPLAY_NAME = "GoogleSearch";
var WEB_FETCH_DISPLAY_NAME = "WebFetch";
var READ_MANY_FILES_DISPLAY_NAME = "ReadManyFiles";
var TOOL_LEGACY_ALIASES = {
  // Add future renames here, e.g.:
  search_file_content: GREP_TOOL_NAME
};
function getToolAliases(name) {
  const aliases = /* @__PURE__ */ new Set([name]);
  const canonicalName = TOOL_LEGACY_ALIASES[name] ?? name;
  aliases.add(canonicalName);
  for (const [legacyName, currentName] of Object.entries(TOOL_LEGACY_ALIASES)) {
    if (currentName === canonicalName) {
      aliases.add(legacyName);
    }
  }
  return Array.from(aliases);
}
var DISCOVERED_TOOL_PREFIX = "discovered_tool_";
var ALL_BUILTIN_TOOL_NAMES = [
  GLOB_TOOL_NAME,
  WRITE_TODOS_TOOL_NAME,
  WRITE_FILE_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  WEB_FETCH_TOOL_NAME,
  EDIT_TOOL_NAME,
  SHELL_TOOL_NAME,
  GREP_TOOL_NAME,
  READ_MANY_FILES_TOOL_NAME,
  READ_FILE_TOOL_NAME,
  LS_TOOL_NAME,
  MEMORY_TOOL_NAME,
  ACTIVATE_SKILL_TOOL_NAME,
  ASK_USER_TOOL_NAME,
  TRACKER_CREATE_TASK_TOOL_NAME,
  TRACKER_UPDATE_TASK_TOOL_NAME,
  TRACKER_GET_TASK_TOOL_NAME,
  TRACKER_LIST_TASKS_TOOL_NAME,
  TRACKER_ADD_DEPENDENCY_TOOL_NAME,
  TRACKER_VISUALIZE_TOOL_NAME,
  GET_INTERNAL_DOCS_TOOL_NAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  EXIT_PLAN_MODE_TOOL_NAME,
  UPDATE_TOPIC_TOOL_NAME
];
var PLAN_MODE_TOOLS = [
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  READ_FILE_TOOL_NAME,
  LS_TOOL_NAME,
  WEB_SEARCH_TOOL_NAME,
  ASK_USER_TOOL_NAME,
  ACTIVATE_SKILL_TOOL_NAME,
  GET_INTERNAL_DOCS_TOOL_NAME,
  UPDATE_TOPIC_TOOL_NAME,
  "codebase_investigator",
  "cli_help"
];
function isValidToolName(name, options = {}) {
  if (ALL_BUILTIN_TOOL_NAMES.includes(name)) {
    return true;
  }
  if (TOOL_LEGACY_ALIASES[name]) {
    return true;
  }
  if (name.startsWith(DISCOVERED_TOOL_PREFIX)) {
    return true;
  }
  if (options.allowWildcards && name === "*") {
    return true;
  }
  if (isMcpToolName(name)) {
    if (name === `${MCP_TOOL_PREFIX}*` && options.allowWildcards) {
      return true;
    }
    if (name.startsWith(`${MCP_TOOL_PREFIX}_`)) {
      return false;
    }
    const parsed = parseMcpToolName(name);
    if (parsed.serverName && parsed.toolName) {
      const slugRegex = /^[a-z0-9_.:-]+$/i;
      if (!slugRegex.test(parsed.serverName)) {
        return false;
      }
      if (parsed.toolName === "*") {
        return options.allowWildcards === true;
      }
      if (/^_*$/.test(parsed.toolName)) {
        return false;
      }
      return slugRegex.test(parsed.toolName);
    }
    return false;
  }
  return false;
}

// packages/core/dist/src/tools/definitions/resolver.js
function resolveToolDeclaration(definition, modelId) {
  if (!modelId || !definition.overrides) {
    return definition.base;
  }
  const override = definition.overrides(modelId);
  if (!override) {
    return definition.base;
  }
  return {
    ...definition.base,
    ...override
  };
}

// packages/core/dist/src/tools/memoryTool.js
var DEFAULT_CONTEXT_FILENAME = "GEMINI.md";
var MEMORY_SECTION_HEADER = "## Gemini Added Memories";
var currentGeminiMdFilename = DEFAULT_CONTEXT_FILENAME;
function setGeminiMdFilename(newFilename) {
  if (Array.isArray(newFilename)) {
    if (newFilename.length > 0) {
      currentGeminiMdFilename = newFilename.map((name) => name.trim());
    }
  } else if (newFilename && newFilename.trim() !== "") {
    currentGeminiMdFilename = newFilename.trim();
  }
}
function getCurrentGeminiMdFilename() {
  if (Array.isArray(currentGeminiMdFilename)) {
    return currentGeminiMdFilename[0];
  }
  return currentGeminiMdFilename;
}
function getAllGeminiMdFilenames() {
  if (Array.isArray(currentGeminiMdFilename)) {
    return currentGeminiMdFilename;
  }
  return [currentGeminiMdFilename];
}
function getGlobalMemoryFilePath() {
  return path2.join(Storage.getGlobalGeminiDir(), getCurrentGeminiMdFilename());
}
function ensureNewlineSeparation(currentContent) {
  if (currentContent.length === 0)
    return "";
  if (currentContent.endsWith("\n\n") || currentContent.endsWith("\r\n\r\n"))
    return "";
  if (currentContent.endsWith("\n") || currentContent.endsWith("\r\n"))
    return "\n";
  return "\n\n";
}
async function readMemoryFileContent() {
  try {
    return await fs2.readFile(getGlobalMemoryFilePath(), "utf-8");
  } catch (err) {
    const error = err;
    if (!(error instanceof Error) || error.code !== "ENOENT")
      throw err;
    return "";
  }
}
function computeNewContent(currentContent, fact) {
  let processedText = fact.replace(/[\r\n]/g, " ").trim();
  processedText = processedText.replace(/^(-+\s*)+/, "").trim();
  const newMemoryItem = `- ${processedText}`;
  const headerIndex = currentContent.indexOf(MEMORY_SECTION_HEADER);
  if (headerIndex === -1) {
    const separator = ensureNewlineSeparation(currentContent);
    return currentContent + `${separator}${MEMORY_SECTION_HEADER}
${newMemoryItem}
`;
  } else {
    const startOfSectionContent = headerIndex + MEMORY_SECTION_HEADER.length;
    let endOfSectionIndex = currentContent.indexOf("\n## ", startOfSectionContent);
    if (endOfSectionIndex === -1) {
      endOfSectionIndex = currentContent.length;
    }
    const beforeSectionMarker = currentContent.substring(0, startOfSectionContent).trimEnd();
    let sectionContent = currentContent.substring(startOfSectionContent, endOfSectionIndex).trimEnd();
    const afterSectionMarker = currentContent.substring(endOfSectionIndex);
    sectionContent += `
${newMemoryItem}`;
    return `${beforeSectionMarker}
${sectionContent.trimStart()}
${afterSectionMarker}`.trimEnd() + "\n";
  }
}
var MemoryToolInvocation = class _MemoryToolInvocation extends BaseToolInvocation {
  static allowlist = /* @__PURE__ */ new Set();
  proposedNewContent;
  constructor(params, messageBus, toolName, displayName) {
    super(params, messageBus, toolName, displayName);
  }
  getDescription() {
    const memoryFilePath = getGlobalMemoryFilePath();
    return `in ${tildeifyPath(memoryFilePath)}`;
  }
  async getConfirmationDetails(_abortSignal) {
    const memoryFilePath = getGlobalMemoryFilePath();
    const allowlistKey = memoryFilePath;
    if (_MemoryToolInvocation.allowlist.has(allowlistKey)) {
      return false;
    }
    const currentContent = await readMemoryFileContent();
    const { fact, modified_by_user, modified_content } = this.params;
    const contentForDiff = modified_by_user && modified_content !== void 0 ? modified_content : computeNewContent(currentContent, fact);
    this.proposedNewContent = contentForDiff;
    const fileName = path2.basename(memoryFilePath);
    const fileDiff = createPatch(fileName, currentContent, this.proposedNewContent, "Current", "Proposed", DEFAULT_DIFF_OPTIONS);
    const confirmationDetails = {
      type: "edit",
      title: `Confirm Memory Save: ${tildeifyPath(memoryFilePath)}`,
      fileName: memoryFilePath,
      filePath: memoryFilePath,
      fileDiff,
      originalContent: currentContent,
      newContent: this.proposedNewContent,
      onConfirm: async (outcome) => {
        if (outcome === ToolConfirmationOutcome.ProceedAlways) {
          _MemoryToolInvocation.allowlist.add(allowlistKey);
        }
      }
    };
    return confirmationDetails;
  }
  async execute(_signal) {
    const { fact, modified_by_user, modified_content } = this.params;
    try {
      let contentToWrite;
      let successMessage;
      const sanitizedFact = fact.replace(/[\r\n]/g, " ").trim();
      if (modified_by_user && modified_content !== void 0) {
        contentToWrite = modified_content;
        successMessage = `Okay, I've updated the memory file with your modifications.`;
      } else {
        if (this.proposedNewContent === void 0) {
          const currentContent = await readMemoryFileContent();
          this.proposedNewContent = computeNewContent(currentContent, fact);
        }
        contentToWrite = this.proposedNewContent;
        successMessage = `Okay, I've remembered that: "${sanitizedFact}"`;
      }
      await fs2.mkdir(path2.dirname(getGlobalMemoryFilePath()), {
        recursive: true
      });
      await fs2.writeFile(getGlobalMemoryFilePath(), contentToWrite, "utf-8");
      return {
        llmContent: JSON.stringify({
          success: true,
          message: successMessage
        }),
        returnDisplay: successMessage
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: JSON.stringify({
          success: false,
          error: `Failed to save memory. Detail: ${errorMessage}`
        }),
        returnDisplay: `Error saving memory: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.MEMORY_TOOL_EXECUTION_ERROR
        }
      };
    }
  }
};
var MemoryTool = class _MemoryTool extends BaseDeclarativeTool {
  static Name = MEMORY_TOOL_NAME;
  constructor(messageBus) {
    super(_MemoryTool.Name, "SaveMemory", MEMORY_DEFINITION.base.description, Kind.Think, MEMORY_DEFINITION.base.parametersJsonSchema, messageBus, true, false);
  }
  validateToolParamValues(params) {
    if (params.fact.trim() === "") {
      return 'Parameter "fact" must be a non-empty string.';
    }
    return null;
  }
  createInvocation(params, messageBus, toolName, displayName) {
    return new MemoryToolInvocation(params, messageBus, toolName ?? this.name, displayName ?? this.displayName);
  }
  getSchema(modelId) {
    return resolveToolDeclaration(MEMORY_DEFINITION, modelId);
  }
  getModifyContext(_abortSignal) {
    return {
      getFilePath: (_params) => getGlobalMemoryFilePath(),
      getCurrentContent: async (_params) => readMemoryFileContent(),
      getProposedContent: async (params) => {
        const currentContent = await readMemoryFileContent();
        const { fact, modified_by_user, modified_content } = params;
        return modified_by_user && modified_content !== void 0 ? modified_content : computeNewContent(currentContent, fact);
      },
      createUpdatedParams: (_oldContent, modifiedProposedContent, originalParams) => ({
        ...originalParams,
        modified_by_user: true,
        modified_content: modifiedProposedContent
      })
    };
  }
};

// packages/core/dist/src/utils/memoryImportProcessor.js
import * as fs3 from "node:fs/promises";
import * as path3 from "node:path";
var logger2 = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args) => debugLogger.debug("[DEBUG] [ImportProcessor]", ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args) => debugLogger.warn("[WARN] [ImportProcessor]", ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args) => debugLogger.error("[ERROR] [ImportProcessor]", ...args)
};
async function findProjectRoot(startDir, boundaryMarkers = [".git"]) {
  if (boundaryMarkers.length === 0) {
    return path3.resolve(startDir);
  }
  let currentDir = path3.resolve(startDir);
  while (true) {
    for (const marker of boundaryMarkers) {
      if (path3.isAbsolute(marker) || marker.includes("..")) {
        continue;
      }
      const markerPath = path3.join(currentDir, marker);
      try {
        await fs3.access(markerPath);
        return currentDir;
      } catch {
      }
    }
    const parentDir = path3.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return path3.resolve(startDir);
}
function hasMessage(err) {
  return typeof err === "object" && err !== null && "message" in err && typeof err.message === "string";
}
function findImports(content) {
  const imports = [];
  let i = 0;
  const len = content.length;
  while (i < len) {
    i = content.indexOf("@", i);
    if (i === -1)
      break;
    if (i > 0 && !isWhitespace(content[i - 1])) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < len && !isWhitespace(content[j]) && content[j] !== "\n" && content[j] !== "\r") {
      j++;
    }
    const importPath = content.slice(i + 1, j);
    if (importPath.length > 0 && (importPath[0] === "." || importPath[0] === "/" || isLetter(importPath[0]))) {
      imports.push({
        start: i,
        _end: j,
        path: importPath
      });
    }
    i = j + 1;
  }
  return imports;
}
function isWhitespace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function isLetter(char) {
  const code = char.charCodeAt(0);
  return code >= 65 && code <= 90 || // A-Z
  code >= 97 && code <= 122;
}
function findCodeRegions(content) {
  const regions = [];
  const regex = /(`+)([\s\S]*?)\1/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    regions.push([match.index, match.index + match[0].length]);
  }
  return regions;
}
async function processImports(content, basePath, debugMode = false, importState = {
  processedFiles: /* @__PURE__ */ new Set(),
  maxDepth: 5,
  currentDepth: 0
}, projectRoot, importFormat = "tree", boundaryMarkers = [".git"]) {
  if (!projectRoot) {
    projectRoot = await findProjectRoot(basePath, boundaryMarkers);
  }
  if (importState.currentDepth >= importState.maxDepth) {
    if (debugMode) {
      logger2.warn(`Maximum import depth (${importState.maxDepth}) reached. Stopping import processing.`);
    }
    return {
      content,
      importTree: { path: importState.currentFile || "unknown" }
    };
  }
  if (importFormat === "flat") {
    const flatFiles = [];
    const processedFiles = /* @__PURE__ */ new Set();
    async function processFlat(fileContent, fileBasePath, filePath, depth) {
      const normalizedPath = path3.normalize(filePath);
      if (processedFiles.has(normalizedPath))
        return;
      processedFiles.add(normalizedPath);
      flatFiles.push({ path: normalizedPath, content: fileContent });
      const codeRegions2 = findCodeRegions(fileContent);
      const imports2 = findImports(fileContent);
      for (let i = imports2.length - 1; i >= 0; i--) {
        const { start, path: importPath } = imports2[i];
        if (codeRegions2.some(([regionStart, regionEnd]) => start >= regionStart && start < regionEnd)) {
          continue;
        }
        if (!validateImportPath(importPath, fileBasePath, [projectRoot || ""])) {
          continue;
        }
        const fullPath = path3.resolve(fileBasePath, importPath);
        const normalizedFullPath = path3.normalize(fullPath);
        if (processedFiles.has(normalizedFullPath))
          continue;
        try {
          await fs3.access(fullPath);
          const importedContent = await fs3.readFile(fullPath, "utf-8");
          await processFlat(importedContent, path3.dirname(fullPath), normalizedFullPath, depth + 1);
        } catch (error) {
          if (debugMode) {
            logger2.warn(`Failed to import ${fullPath}: ${hasMessage(error) ? error.message : "Unknown error"}`);
          }
        }
      }
    }
    const rootPath = path3.normalize(importState.currentFile || path3.resolve(basePath));
    await processFlat(content, basePath, rootPath, 0);
    const flatContent = flatFiles.map((f) => `--- File: ${f.path} ---
${f.content.trim()}
--- End of File: ${f.path} ---`).join("\n\n");
    return {
      content: flatContent,
      importTree: { path: rootPath }
      // Tree not meaningful in flat mode
    };
  }
  const codeRegions = findCodeRegions(content);
  let result = "";
  let lastIndex = 0;
  const imports = [];
  const importsList = findImports(content);
  for (const { start, _end, path: importPath } of importsList) {
    result += content.substring(lastIndex, start);
    lastIndex = _end;
    if (codeRegions.some(([s, e]) => start >= s && start < e)) {
      result += `@${importPath}`;
      continue;
    }
    if (!validateImportPath(importPath, basePath, [projectRoot || ""])) {
      result += `<!-- Import failed: ${importPath} - Path traversal attempt -->`;
      continue;
    }
    const fullPath = path3.resolve(basePath, importPath);
    if (importState.processedFiles.has(fullPath)) {
      result += `<!-- File already processed: ${importPath} -->`;
      continue;
    }
    try {
      await fs3.access(fullPath);
      const fileContent = await fs3.readFile(fullPath, "utf-8");
      const newImportState = {
        ...importState,
        processedFiles: new Set(importState.processedFiles),
        currentDepth: importState.currentDepth + 1,
        currentFile: fullPath
      };
      newImportState.processedFiles.add(fullPath);
      const imported = await processImports(fileContent, path3.dirname(fullPath), debugMode, newImportState, projectRoot, importFormat, boundaryMarkers);
      result += `<!-- Imported from: ${importPath} -->
${imported.content}
<!-- End of import from: ${importPath} -->`;
      imports.push(imported.importTree);
    } catch (err) {
      let message = "Unknown error";
      if (hasMessage(err)) {
        message = err.message;
      } else if (typeof err === "string") {
        message = err;
      }
      logger2.error(`Failed to import ${importPath}: ${message}`);
      result += `<!-- Import failed: ${importPath} - ${message} -->`;
    }
  }
  result += content.substring(lastIndex);
  return {
    content: result,
    importTree: {
      path: importState.currentFile || "unknown",
      imports: imports.length > 0 ? imports : void 0
    }
  };
}
function validateImportPath(importPath, basePath, allowedDirectories) {
  if (/^(file|https?):\/\//.test(importPath)) {
    return false;
  }
  const resolvedPath = path3.resolve(basePath, importPath);
  return allowedDirectories.some((allowedDir) => isSubpath(allowedDir, resolvedPath));
}

// packages/core/dist/src/config/constants.js
var DEFAULT_MEMORY_FILE_FILTERING_OPTIONS = {
  respectGitIgnore: false,
  respectGeminiIgnore: true,
  maxFileCount: 2e4,
  searchTimeout: 5e3,
  customIgnoreFilePaths: []
};
var DEFAULT_FILE_FILTERING_OPTIONS = {
  respectGitIgnore: true,
  respectGeminiIgnore: true,
  maxFileCount: 2e4,
  searchTimeout: 5e3,
  customIgnoreFilePaths: []
};
var GEMINI_IGNORE_FILE_NAME = ".geminiignore";
var INTEGRITY_FILENAME = "extension_integrity.json";
var INTEGRITY_KEY_FILENAME = "integrity.key";
var KEYCHAIN_SERVICE_NAME = "gemini-cli-extension-integrity";
var SECRET_KEY_ACCOUNT = "secret-key";

// packages/core/dist/src/utils/memoryDiscovery.js
var logger3 = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (...args) => debugLogger.debug("[DEBUG] [MemoryDiscovery]", ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args) => debugLogger.warn("[WARN] [MemoryDiscovery]", ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args) => debugLogger.error("[ERROR] [MemoryDiscovery]", ...args)
};
async function deduplicatePathsByFileIdentity(filePaths) {
  if (filePaths.length === 0) {
    return {
      paths: [],
      identityMap: /* @__PURE__ */ new Map()
    };
  }
  const uniqueFilePaths = Array.from(new Set(filePaths));
  const fileIdentityMap = /* @__PURE__ */ new Map();
  const deduplicatedPaths = [];
  const CONCURRENT_LIMIT = 20;
  const results = [];
  for (let i = 0; i < uniqueFilePaths.length; i += CONCURRENT_LIMIT) {
    const batch = uniqueFilePaths.slice(i, i + CONCURRENT_LIMIT);
    const batchPromises = batch.map(async (filePath) => {
      try {
        const stats = await fs4.stat(filePath);
        return {
          path: filePath,
          dev: stats.dev,
          ino: stats.ino
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger3.debug(`could not stat file for deduplication: ${filePath}. error: ${message}`);
        return {
          path: filePath,
          dev: null,
          ino: null
        };
      }
    });
    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const message = getErrorMessage(result.reason);
        debugLogger.debug("[DEBUG] [MemoryDiscovery] unexpected error during deduplication stat:", message);
      }
    }
  }
  const pathToIdentityMap = /* @__PURE__ */ new Map();
  for (const { path: path5, dev, ino } of results) {
    if (dev !== null && ino !== null) {
      const identityKey = `${dev.toString()}:${ino.toString()}`;
      pathToIdentityMap.set(path5, identityKey);
      if (!fileIdentityMap.has(identityKey)) {
        fileIdentityMap.set(identityKey, path5);
        deduplicatedPaths.push(path5);
        debugLogger.debug("[DEBUG] [MemoryDiscovery] deduplication: keeping", path5, `(dev: ${dev}, ino: ${ino})`);
      } else {
        const existingPath = fileIdentityMap.get(identityKey);
        debugLogger.debug("[DEBUG] [MemoryDiscovery] deduplication: skipping", path5, `(same file as ${existingPath})`);
      }
    } else {
      deduplicatedPaths.push(path5);
    }
  }
  return {
    paths: deduplicatedPaths,
    identityMap: pathToIdentityMap
  };
}
async function findProjectRoot2(startDir, boundaryMarkers = [".git"]) {
  if (boundaryMarkers.length === 0) {
    return null;
  }
  let currentDir = normalizePath(startDir);
  while (true) {
    for (const marker of boundaryMarkers) {
      if (path4.isAbsolute(marker) || marker.includes("..")) {
        continue;
      }
      const markerPath = path4.join(currentDir, marker);
      try {
        await fs4.access(markerPath);
        return currentDir;
      } catch (error) {
        const isENOENT = typeof error === "object" && error !== null && "code" in error && // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
        error.code === "ENOENT";
        const isTestEnv = process.env["NODE_ENV"] === "test" || process.env["VITEST"];
        if (!isENOENT && !isTestEnv) {
          if (typeof error === "object" && error !== null && "code" in error) {
            const fsError = error;
            logger3.warn(`Error checking for ${marker} at ${markerPath}: ${fsError.message}`);
          } else {
            logger3.warn(`Non-standard error checking for ${marker} at ${markerPath}: ${String(error)}`);
          }
        }
      }
    }
    const parentDir = normalizePath(path4.dirname(currentDir));
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}
async function getGeminiMdFilePathsInternal(currentWorkingDirectory, includeDirectoriesToReadGemini, userHomePath, fileService, folderTrust, fileFilteringOptions, maxDirs, boundaryMarkers = [".git"]) {
  const dirs = /* @__PURE__ */ new Set([
    ...includeDirectoriesToReadGemini,
    currentWorkingDirectory
  ]);
  const CONCURRENT_LIMIT = 10;
  const dirsArray = Array.from(dirs);
  const globalPaths = /* @__PURE__ */ new Set();
  const projectPaths = /* @__PURE__ */ new Set();
  for (let i = 0; i < dirsArray.length; i += CONCURRENT_LIMIT) {
    const batch = dirsArray.slice(i, i + CONCURRENT_LIMIT);
    const batchPromises = batch.map((dir) => getGeminiMdFilePathsInternalForEachDir(dir, userHomePath, fileService, folderTrust, fileFilteringOptions, maxDirs, boundaryMarkers));
    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        result.value.global.forEach((p) => globalPaths.add(p));
        result.value.project.forEach((p) => projectPaths.add(p));
      } else {
        const error = result.reason;
        const message = error instanceof Error ? error.message : String(error);
        logger3.error(`Error discovering files in directory: ${message}`);
      }
    }
  }
  return {
    global: Array.from(globalPaths),
    project: Array.from(projectPaths)
  };
}
async function getGeminiMdFilePathsInternalForEachDir(dir, userHomePath, fileService, folderTrust, fileFilteringOptions, maxDirs, boundaryMarkers = [".git"]) {
  const globalPaths = /* @__PURE__ */ new Set();
  const projectPaths = /* @__PURE__ */ new Set();
  const geminiMdFilenames = getAllGeminiMdFilenames();
  for (const geminiMdFilename of geminiMdFilenames) {
    const resolvedHome = normalizePath(userHomePath);
    const globalGeminiDir = normalizePath(path4.join(resolvedHome, GEMINI_DIR));
    const globalMemoryPath = normalizePath(path4.join(globalGeminiDir, geminiMdFilename));
    try {
      await fs4.access(globalMemoryPath, fsSync2.constants.R_OK);
      globalPaths.add(globalMemoryPath);
      debugLogger.debug("[DEBUG] [MemoryDiscovery] Found readable global", geminiMdFilename + ":", globalMemoryPath);
    } catch {
    }
    if (dir && folderTrust) {
      const resolvedCwd = normalizePath(dir);
      debugLogger.debug("[DEBUG] [MemoryDiscovery] Searching for", geminiMdFilename, "starting from CWD:", resolvedCwd);
      const projectRoot = await findProjectRoot2(resolvedCwd, boundaryMarkers);
      debugLogger.debug("[DEBUG] [MemoryDiscovery] Determined project root:", projectRoot ?? "None");
      const upwardPaths = [];
      let currentDir = resolvedCwd;
      const ultimateStopDir = projectRoot ? normalizePath(path4.dirname(projectRoot)) : normalizePath(path4.dirname(resolvedHome));
      while (currentDir && currentDir !== normalizePath(path4.dirname(currentDir))) {
        if (currentDir === globalGeminiDir) {
          break;
        }
        const potentialPath = normalizePath(path4.join(currentDir, geminiMdFilename));
        try {
          await fs4.access(potentialPath, fsSync2.constants.R_OK);
          if (potentialPath !== globalMemoryPath) {
            upwardPaths.unshift(potentialPath);
          }
        } catch {
        }
        if (currentDir === ultimateStopDir) {
          break;
        }
        currentDir = normalizePath(path4.dirname(currentDir));
      }
      upwardPaths.forEach((p) => projectPaths.add(p));
      const mergedOptions = {
        ...DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
        ...fileFilteringOptions
      };
      const downwardPaths = await bfsFileSearch(resolvedCwd, {
        fileName: geminiMdFilename,
        maxDirs,
        fileService,
        fileFilteringOptions: mergedOptions
      });
      downwardPaths.sort();
      for (const dPath of downwardPaths) {
        projectPaths.add(normalizePath(dPath));
      }
    }
  }
  return {
    global: Array.from(globalPaths),
    project: Array.from(projectPaths)
  };
}
async function readGeminiMdFiles(filePaths, importFormat = "tree", boundaryMarkers = [".git"]) {
  const CONCURRENT_LIMIT = 20;
  const results = [];
  for (let i = 0; i < filePaths.length; i += CONCURRENT_LIMIT) {
    const batch = filePaths.slice(i, i + CONCURRENT_LIMIT);
    const batchPromises = batch.map(async (filePath) => {
      try {
        const content = await fs4.readFile(filePath, "utf-8");
        const processedResult = await processImports(content, path4.dirname(filePath), false, void 0, void 0, importFormat, boundaryMarkers);
        debugLogger.debug("[DEBUG] [MemoryDiscovery] Successfully read and processed imports:", filePath, `(Length: ${processedResult.content.length})`);
        return { filePath, content: processedResult.content };
      } catch (error) {
        const isTestEnv = process.env["NODE_ENV"] === "test" || process.env["VITEST"];
        if (!isTestEnv) {
          const message = error instanceof Error ? error.message : String(error);
          logger3.warn(`Warning: Could not read ${getAllGeminiMdFilenames()} file at ${filePath}. Error: ${message}`);
        }
        debugLogger.debug("[DEBUG] [MemoryDiscovery] Failed to read:", filePath);
        return { filePath, content: null };
      }
    });
    const batchResults = await Promise.allSettled(batchPromises);
    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        const error = result.reason;
        const message = error instanceof Error ? error.message : String(error);
        logger3.error(`Unexpected error processing file: ${message}`);
      }
    }
  }
  return results;
}
function concatenateInstructions(instructionContents) {
  return instructionContents.filter((item) => typeof item.content === "string").map((item) => {
    const trimmedContent = item.content.trim();
    if (trimmedContent.length === 0) {
      return null;
    }
    return `--- Context from: ${item.filePath} ---
${trimmedContent}
--- End of Context from: ${item.filePath} ---`;
  }).filter((block) => block !== null).join("\n\n");
}
async function getGlobalMemoryPaths() {
  const userHome = homedir();
  const geminiMdFilenames = getAllGeminiMdFilenames();
  const accessChecks = geminiMdFilenames.map(async (filename) => {
    const globalPath = normalizePath(path4.join(userHome, GEMINI_DIR, filename));
    try {
      await fs4.access(globalPath, fsSync2.constants.R_OK);
      debugLogger.debug("[DEBUG] [MemoryDiscovery] Found global memory file:", globalPath);
      return globalPath;
    } catch {
      return null;
    }
  });
  return (await Promise.all(accessChecks)).filter((p) => p !== null);
}
function getExtensionMemoryPaths(extensionLoader) {
  const extensionPaths = extensionLoader.getExtensions().filter((ext) => ext.isActive).flatMap((ext) => ext.contextFiles).map((p) => normalizePath(p));
  return Array.from(new Set(extensionPaths)).sort();
}
async function getEnvironmentMemoryPaths(trustedRoots, boundaryMarkers = [".git"]) {
  const allPaths = /* @__PURE__ */ new Set();
  const traversalPromises = trustedRoots.map(async (root) => {
    const resolvedRoot = normalizePath(root);
    const gitRoot = await findProjectRoot2(resolvedRoot, boundaryMarkers);
    const ceiling = gitRoot ? normalizePath(gitRoot) : resolvedRoot;
    debugLogger.debug("[DEBUG] [MemoryDiscovery] Loading environment memory for trusted root:", resolvedRoot, "(Stopping at", gitRoot ? `git root: ${ceiling})` : `trusted root: ${ceiling} \u2014 no git root found)`);
    return findUpwardGeminiFiles(resolvedRoot, ceiling);
  });
  const pathArrays = await Promise.all(traversalPromises);
  pathArrays.flat().forEach((p) => allPaths.add(p));
  return Array.from(allPaths).sort();
}
function categorizeAndConcatenate(paths, contentsMap) {
  const getConcatenated = (pList) => concatenateInstructions(pList.map((p) => contentsMap.get(p)).filter((c) => !!c));
  return {
    global: getConcatenated(paths.global),
    extension: getConcatenated(paths.extension),
    project: getConcatenated(paths.project)
  };
}
async function findUpwardGeminiFiles(startDir, stopDir) {
  const upwardPaths = [];
  let currentDir = normalizePath(startDir);
  const resolvedStopDir = normalizePath(stopDir);
  const geminiMdFilenames = getAllGeminiMdFilenames();
  const globalGeminiDir = normalizePath(path4.join(homedir(), GEMINI_DIR));
  debugLogger.debug("[DEBUG] [MemoryDiscovery] Starting upward search from", currentDir, "stopping at", resolvedStopDir);
  while (true) {
    if (currentDir === globalGeminiDir) {
      break;
    }
    const accessChecks = geminiMdFilenames.map(async (filename) => {
      const potentialPath = normalizePath(path4.join(currentDir, filename));
      try {
        await fs4.access(potentialPath, fsSync2.constants.R_OK);
        return potentialPath;
      } catch {
        return null;
      }
    });
    const foundPathsInDir = (await Promise.all(accessChecks)).filter((p) => p !== null);
    upwardPaths.unshift(...foundPathsInDir);
    const parentDir = normalizePath(path4.dirname(currentDir));
    if (currentDir === resolvedStopDir || currentDir === parentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return upwardPaths;
}
async function loadServerHierarchicalMemory(currentWorkingDirectory, includeDirectoriesToReadGemini, fileService, extensionLoader, folderTrust, importFormat = "tree", fileFilteringOptions, maxDirs = 200, boundaryMarkers = [".git"]) {
  const realCwd = normalizePath(await fs4.realpath(path4.resolve(currentWorkingDirectory)));
  const realHome = normalizePath(await fs4.realpath(path4.resolve(homedir())));
  const isHomeDirectory = realCwd === realHome;
  currentWorkingDirectory = isHomeDirectory ? "" : currentWorkingDirectory;
  debugLogger.debug("[DEBUG] [MemoryDiscovery] Loading server hierarchical memory for CWD:", currentWorkingDirectory, `(importFormat: ${importFormat})`);
  const userHomePath = homedir();
  const [discoveryResult, extensionPaths] = await Promise.all([
    getGeminiMdFilePathsInternal(currentWorkingDirectory, includeDirectoriesToReadGemini, userHomePath, fileService, folderTrust, fileFilteringOptions || DEFAULT_MEMORY_FILE_FILTERING_OPTIONS, maxDirs, boundaryMarkers),
    Promise.resolve(getExtensionMemoryPaths(extensionLoader))
  ]);
  const allFilePathsStringDeduped = Array.from(/* @__PURE__ */ new Set([
    ...discoveryResult.global,
    ...discoveryResult.project,
    ...extensionPaths
  ]));
  if (allFilePathsStringDeduped.length === 0) {
    debugLogger.debug("[DEBUG] [MemoryDiscovery] No GEMINI.md files found in hierarchy of the workspace.");
    return {
      memoryContent: { global: "", extension: "", project: "" },
      fileCount: 0,
      filePaths: []
    };
  }
  const { paths: allFilePaths } = await deduplicatePathsByFileIdentity(allFilePathsStringDeduped);
  if (allFilePaths.length === 0) {
    debugLogger.debug("[DEBUG] [MemoryDiscovery] No unique GEMINI.md files found after deduplication by file identity.");
    return {
      memoryContent: { global: "", extension: "", project: "" },
      fileCount: 0,
      filePaths: []
    };
  }
  const allContents = await readGeminiMdFiles(allFilePaths, importFormat, boundaryMarkers);
  const contentsMap = new Map(allContents.map((c) => [c.filePath, c]));
  const hierarchicalMemory = categorizeAndConcatenate({
    global: discoveryResult.global,
    extension: extensionPaths,
    project: discoveryResult.project
  }, contentsMap);
  return {
    memoryContent: hierarchicalMemory,
    fileCount: allContents.filter((c) => c.content !== null).length,
    filePaths: allFilePaths
  };
}
async function refreshServerHierarchicalMemory(config) {
  const result = await loadServerHierarchicalMemory(config.getWorkingDir(), config.shouldLoadMemoryFromIncludeDirectories() ? config.getWorkspaceContext().getDirectories() : [], config.getFileService(), config.getExtensionLoader(), config.isTrustedFolder(), config.getImportFormat(), config.getFileFilteringOptions(), config.getDiscoveryMaxDirs(), config.getMemoryBoundaryMarkers());
  const mcpInstructions = config.getMcpClientManager()?.getMcpInstructions() || "";
  const finalMemory = {
    ...result.memoryContent,
    project: [result.memoryContent.project, mcpInstructions.trimStart()].filter(Boolean).join("\n\n")
  };
  config.setUserMemory(finalMemory);
  config.setGeminiMdFileCount(result.fileCount);
  config.setGeminiMdFilePaths(result.filePaths);
  coreEvents.emit(CoreEvent.MemoryChanged, { fileCount: result.fileCount });
  return result;
}
async function loadJitSubdirectoryMemory(targetPath, trustedRoots, alreadyLoadedPaths, alreadyLoadedIdentities, boundaryMarkers = [".git"]) {
  const resolvedTarget = normalizePath(targetPath);
  let bestRoot = null;
  for (const root of trustedRoots) {
    const resolvedRoot = normalizePath(root);
    const resolvedRootWithTrailing = resolvedRoot.endsWith(path4.sep) ? resolvedRoot : resolvedRoot + path4.sep;
    if (resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRootWithTrailing)) {
      if (!bestRoot || resolvedRoot.length > bestRoot.length) {
        bestRoot = resolvedRoot;
      }
    }
  }
  if (!bestRoot) {
    debugLogger.debug("[DEBUG] [MemoryDiscovery] JIT memory skipped:", resolvedTarget, "is not in any trusted root.");
    return { files: [], fileIdentities: [] };
  }
  const gitRoot = await findProjectRoot2(bestRoot, boundaryMarkers);
  const resolvedCeiling = gitRoot ? normalizePath(gitRoot) : bestRoot;
  debugLogger.debug("[DEBUG] [MemoryDiscovery] Loading JIT memory for", resolvedTarget, `(Trusted root: ${bestRoot}, Ceiling: ${resolvedCeiling}${gitRoot ? " [git root]" : " [trusted root, no git]"})`);
  let startDir = resolvedTarget;
  try {
    const stat2 = await fs4.stat(resolvedTarget);
    if (stat2.isFile()) {
      startDir = normalizePath(path4.dirname(resolvedTarget));
    }
  } catch {
    startDir = normalizePath(path4.dirname(resolvedTarget));
  }
  const potentialPaths = await findUpwardGeminiFiles(startDir, resolvedCeiling);
  if (potentialPaths.length === 0) {
    return { files: [], fileIdentities: [] };
  }
  const { paths: deduplicatedNewPaths, identityMap: newPathsIdentityMap } = await deduplicatePathsByFileIdentity(potentialPaths);
  const cachedIdentities = alreadyLoadedIdentities ?? /* @__PURE__ */ new Set();
  if (!alreadyLoadedIdentities && alreadyLoadedPaths.size > 0) {
    const CONCURRENT_LIMIT = 20;
    const alreadyLoadedArray = Array.from(alreadyLoadedPaths);
    for (let i = 0; i < alreadyLoadedArray.length; i += CONCURRENT_LIMIT) {
      const batch = alreadyLoadedArray.slice(i, i + CONCURRENT_LIMIT);
      const batchPromises = batch.map(async (filePath) => {
        try {
          const stats = await fs4.stat(filePath);
          const identityKey = `${stats.dev.toString()}:${stats.ino.toString()}`;
          cachedIdentities.add(identityKey);
        } catch {
        }
      });
      await Promise.allSettled(batchPromises);
    }
  }
  const newPaths = [];
  const newFileIdentities = [];
  for (const filePath of deduplicatedNewPaths) {
    const identityKey = newPathsIdentityMap.get(filePath);
    if (identityKey && cachedIdentities.has(identityKey)) {
      debugLogger.debug("[DEBUG] [MemoryDiscovery] jit memory: skipping", filePath, "(already loaded with different case)");
      continue;
    }
    newPaths.push(filePath);
    if (identityKey) {
      newFileIdentities.push(identityKey);
    }
  }
  if (newPaths.length === 0) {
    return { files: [], fileIdentities: [] };
  }
  debugLogger.debug("[DEBUG] [MemoryDiscovery] Found new JIT memory files:", JSON.stringify(newPaths));
  const contents = await readGeminiMdFiles(newPaths, "tree", boundaryMarkers);
  return {
    files: contents.filter((item) => item.content !== null).map((item) => ({
      path: item.filePath,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
      content: item.content
    })),
    fileIdentities: newFileIdentities
  };
}

export {
  diffLines,
  applyPatch,
  createPatch,
  DEFAULT_DIFF_OPTIONS,
  getDiffStat,
  getDiffStatFromPatch,
  PREVIEW_GEMINI_MODEL,
  PREVIEW_GEMINI_3_1_MODEL,
  PREVIEW_GEMINI_3_1_CUSTOM_TOOLS_MODEL,
  PREVIEW_GEMINI_FLASH_MODEL,
  PREVIEW_GEMINI_3_1_FLASH_LITE_MODEL,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
  VALID_GEMINI_MODELS,
  PREVIEW_GEMINI_MODEL_AUTO,
  DEFAULT_GEMINI_MODEL_AUTO,
  GEMINI_MODEL_ALIAS_AUTO,
  GEMINI_MODEL_ALIAS_PRO,
  GEMINI_MODEL_ALIAS_FLASH,
  GEMINI_MODEL_ALIAS_FLASH_LITE,
  DEFAULT_GEMINI_EMBEDDING_MODEL,
  DEFAULT_THINKING_MODE,
  resolveModel,
  resolveClassifierModel,
  getDisplayString,
  isPreviewModel,
  isProModel,
  isGemini3Model,
  isGemini2Model,
  isCustomModel,
  supportsModernFeatures,
  isAutoModel,
  supportsMultimodalFunctionResponse,
  isActiveModel,
  PARAM_FILE_PATH,
  PARAM_DIR_PATH,
  PARAM_PATTERN,
  PARAM_CASE_SENSITIVE,
  PARAM_RESPECT_GIT_IGNORE,
  PARAM_RESPECT_GEMINI_IGNORE,
  PARAM_FILE_FILTERING_OPTIONS,
  PARAM_DESCRIPTION,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  GREP_PARAM_INCLUDE_PATTERN,
  GREP_PARAM_EXCLUDE_PATTERN,
  GREP_PARAM_NAMES_ONLY,
  GREP_PARAM_MAX_MATCHES_PER_FILE,
  GREP_PARAM_TOTAL_MAX_MATCHES,
  GREP_PARAM_FIXED_STRINGS,
  GREP_PARAM_CONTEXT,
  GREP_PARAM_AFTER,
  GREP_PARAM_BEFORE,
  GREP_PARAM_NO_IGNORE,
  LS_TOOL_NAME,
  LS_PARAM_IGNORE,
  READ_FILE_TOOL_NAME,
  READ_FILE_PARAM_START_LINE,
  READ_FILE_PARAM_END_LINE,
  SHELL_TOOL_NAME,
  SHELL_PARAM_COMMAND,
  SHELL_PARAM_IS_BACKGROUND,
  WRITE_FILE_TOOL_NAME,
  WRITE_FILE_PARAM_CONTENT,
  EDIT_TOOL_NAME,
  EDIT_PARAM_INSTRUCTION,
  EDIT_PARAM_OLD_STRING,
  EDIT_PARAM_NEW_STRING,
  EDIT_PARAM_ALLOW_MULTIPLE,
  WEB_SEARCH_TOOL_NAME,
  WEB_SEARCH_PARAM_QUERY,
  WRITE_TODOS_TOOL_NAME,
  TODOS_PARAM_TODOS,
  TODOS_ITEM_PARAM_DESCRIPTION,
  TODOS_ITEM_PARAM_STATUS,
  WEB_FETCH_TOOL_NAME,
  WEB_FETCH_PARAM_PROMPT,
  READ_MANY_FILES_TOOL_NAME,
  READ_MANY_PARAM_INCLUDE,
  READ_MANY_PARAM_EXCLUDE,
  READ_MANY_PARAM_RECURSIVE,
  READ_MANY_PARAM_USE_DEFAULT_EXCLUDES,
  MEMORY_TOOL_NAME,
  MEMORY_PARAM_FACT,
  GET_INTERNAL_DOCS_TOOL_NAME,
  DOCS_PARAM_PATH,
  ACTIVATE_SKILL_TOOL_NAME,
  SKILL_PARAM_NAME,
  ASK_USER_TOOL_NAME,
  ASK_USER_PARAM_QUESTIONS,
  ASK_USER_QUESTION_PARAM_QUESTION,
  ASK_USER_QUESTION_PARAM_HEADER,
  ASK_USER_QUESTION_PARAM_TYPE,
  ASK_USER_QUESTION_PARAM_OPTIONS,
  ASK_USER_QUESTION_PARAM_MULTI_SELECT,
  ASK_USER_QUESTION_PARAM_PLACEHOLDER,
  ASK_USER_OPTION_PARAM_LABEL,
  ASK_USER_OPTION_PARAM_DESCRIPTION,
  EXIT_PLAN_MODE_TOOL_NAME,
  EXIT_PLAN_PARAM_PLAN_FILENAME,
  ENTER_PLAN_MODE_TOOL_NAME,
  PLAN_MODE_PARAM_REASON,
  PARAM_ADDITIONAL_PERMISSIONS,
  UPDATE_TOPIC_TOOL_NAME,
  TOPIC_PARAM_TITLE,
  TOPIC_PARAM_SUMMARY,
  TOPIC_PARAM_STRATEGIC_INTENT,
  zodToJsonSchema,
  getUpdateTopicDeclaration,
  REFERENCE_CONTENT_START,
  REFERENCE_CONTENT_END,
  DEFAULT_MAX_LINES_TEXT_FILE,
  MAX_LINE_LENGTH_TEXT_FILE,
  MAX_FILE_SIZE_MB,
  READ_FILE_DEFINITION,
  WRITE_FILE_DEFINITION,
  GREP_DEFINITION,
  RIP_GREP_DEFINITION,
  WEB_SEARCH_DEFINITION,
  EDIT_DEFINITION,
  GLOB_DEFINITION,
  LS_DEFINITION,
  WEB_FETCH_DEFINITION,
  READ_MANY_FILES_DEFINITION,
  WRITE_TODOS_DEFINITION,
  GET_INTERNAL_DOCS_DEFINITION,
  ASK_USER_DEFINITION,
  ENTER_PLAN_MODE_DEFINITION,
  getShellDefinition,
  getExitPlanModeDefinition,
  getActivateSkillDefinition,
  EDIT_TOOL_NAMES,
  TOOLS_REQUIRING_NARROWING,
  TRACKER_CREATE_TASK_TOOL_NAME,
  TRACKER_UPDATE_TASK_TOOL_NAME,
  TRACKER_GET_TASK_TOOL_NAME,
  TRACKER_LIST_TASKS_TOOL_NAME,
  TRACKER_ADD_DEPENDENCY_TOOL_NAME,
  TRACKER_VISUALIZE_TOOL_NAME,
  WRITE_FILE_DISPLAY_NAME,
  EDIT_DISPLAY_NAME,
  ASK_USER_DISPLAY_NAME,
  READ_FILE_DISPLAY_NAME,
  GLOB_DISPLAY_NAME,
  LS_DISPLAY_NAME,
  GREP_DISPLAY_NAME,
  WEB_SEARCH_DISPLAY_NAME,
  WEB_FETCH_DISPLAY_NAME,
  READ_MANY_FILES_DISPLAY_NAME,
  TOOL_LEGACY_ALIASES,
  getToolAliases,
  DISCOVERED_TOOL_PREFIX,
  ALL_BUILTIN_TOOL_NAMES,
  PLAN_MODE_TOOLS,
  isValidToolName,
  resolveToolDeclaration,
  DEFAULT_CONTEXT_FILENAME,
  MEMORY_SECTION_HEADER,
  setGeminiMdFilename,
  getCurrentGeminiMdFilename,
  getAllGeminiMdFilenames,
  getGlobalMemoryFilePath,
  MemoryTool,
  DEFAULT_MEMORY_FILE_FILTERING_OPTIONS,
  DEFAULT_FILE_FILTERING_OPTIONS,
  GEMINI_IGNORE_FILE_NAME,
  INTEGRITY_FILENAME,
  INTEGRITY_KEY_FILENAME,
  KEYCHAIN_SERVICE_NAME,
  SECRET_KEY_ACCOUNT,
  bfsFileSearchSync,
  deduplicatePathsByFileIdentity,
  readGeminiMdFiles,
  concatenateInstructions,
  getGlobalMemoryPaths,
  getExtensionMemoryPaths,
  getEnvironmentMemoryPaths,
  categorizeAndConcatenate,
  loadServerHierarchicalMemory,
  refreshServerHierarchicalMemory,
  loadJitSubdirectoryMemory
};
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

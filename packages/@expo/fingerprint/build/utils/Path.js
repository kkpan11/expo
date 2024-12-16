"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPosixPath = exports.normalizeFilePath = exports.isIgnoredPathWithMatchObjects = exports.buildDirMatchObjects = exports.buildPathMatchObjects = exports.isIgnoredPath = void 0;
const minimatch_1 = __importDefault(require("minimatch"));
const node_process_1 = __importDefault(require("node:process"));
const path_1 = __importDefault(require("path"));
/**
 * Indicate the given `filePath` should be excluded by the `ignorePaths`.
 */
function isIgnoredPath(filePath, ignorePaths, minimatchOptions = { dot: true }) {
    const matchObjects = buildPathMatchObjects(ignorePaths, minimatchOptions);
    return isIgnoredPathWithMatchObjects(filePath, matchObjects);
}
exports.isIgnoredPath = isIgnoredPath;
/**
 * Prebuild match objects for `isIgnoredPathWithMatchObjects` calls.
 */
function buildPathMatchObjects(paths, minimatchOptions = { dot: true }) {
    return paths.map((filePath) => new minimatch_1.default.Minimatch(filePath, minimatchOptions));
}
exports.buildPathMatchObjects = buildPathMatchObjects;
/**
 * Build an ignore match objects for directories based on the given `ignorePathMatchObjects`.
 */
function buildDirMatchObjects(ignorePathMatchObjects, minimatchOptions = { dot: true }) {
    const dirIgnorePatterns = [];
    const ignorePaths = ignorePathMatchObjects.filter((obj) => !obj.negate).map((obj) => obj.pattern);
    const negatedIgnorePaths = ignorePathMatchObjects
        .filter((obj) => obj.negate)
        .map((obj) => obj.pattern);
    // [0] Add positive patterns to dirIgnorePatterns
    for (const pattern of ignorePaths) {
        if (pattern.endsWith('/**/*')) {
            // `/**/*` matches
            dirIgnorePatterns.push(pattern.slice(0, -5));
        }
        else if (pattern.endsWith('/**')) {
            // `/**` by default matches directories
            dirIgnorePatterns.push(pattern.slice(0, -3));
        }
        else if (pattern.endsWith('/')) {
            // `/` suffix matches directories
            dirIgnorePatterns.push(pattern.slice(0, -1));
        }
    }
    // [1] If there is a negate pattern in the same directory, we should remove the existing directory.
    for (const pattern of negatedIgnorePaths) {
        for (let i = 0; i < dirIgnorePatterns.length; ++i) {
            const existingPattern = dirIgnorePatterns[i];
            if (isSubDirectory(existingPattern, pattern)) {
                dirIgnorePatterns.splice(i, 1);
            }
        }
    }
    return dirIgnorePatterns.map((pattern) => new minimatch_1.default.Minimatch(pattern, minimatchOptions));
}
exports.buildDirMatchObjects = buildDirMatchObjects;
/**
 * Indicate the given `filePath` should be excluded by the prebuilt `matchObjects`.
 */
function isIgnoredPathWithMatchObjects(filePath, matchObjects) {
    let result = false;
    for (const minimatchObj of matchObjects) {
        const stripParentPrefix = minimatchObj.pattern.startsWith('**/');
        const normalizedFilePath = normalizeFilePath(filePath, { stripParentPrefix });
        const currMatch = minimatchObj.match(normalizedFilePath);
        if (minimatchObj.negate && result && !currMatch) {
            // Special handler for negate (!pattern).
            // As long as previous match result is true and not matched from the current negate pattern, we should early return.
            return false;
        }
        if (!minimatchObj.negate) {
            result ||= currMatch;
        }
    }
    return result;
}
exports.isIgnoredPathWithMatchObjects = isIgnoredPathWithMatchObjects;
/**
 * Returns true if `parent` is a parent directory of `child`.
 */
function isSubDirectory(parent, child) {
    const relative = path_1.default.relative(parent, child);
    return !relative.startsWith('..') && !path_1.default.isAbsolute(relative);
}
const STRIP_PARENT_PREFIX_REGEX = /^(\.\.\/)+/g;
/**
 * Normalize the given `filePath` to be used for matching against `ignorePaths`.
 *
 * @param filePath The file path to normalize.
 * @param options.stripParentPrefix
 *   When people use fingerprint inside a monorepo, they may get source files from parent directories.
 *   However, minimatch '**' doesn't match the parent directories.
 *   We need to strip the `../` prefix to match the node_modules from parent directories.
 */
function normalizeFilePath(filePath, options) {
    if (options.stripParentPrefix) {
        return filePath.replace(STRIP_PARENT_PREFIX_REGEX, '');
    }
    return filePath;
}
exports.normalizeFilePath = normalizeFilePath;
const REGEXP_REPLACE_SLASHES = /\\/g;
/**
 * Convert any platform-specific path to a POSIX path.
 */
function toPosixPath(filePath) {
    return node_process_1.default.platform === 'win32' ? filePath.replace(REGEXP_REPLACE_SLASHES, '/') : filePath;
}
exports.toPosixPath = toPosixPath;
//# sourceMappingURL=Path.js.map
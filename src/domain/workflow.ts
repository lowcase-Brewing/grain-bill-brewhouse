/**
 * Project-folder workflow: template, safe path components, and a manifest of
 * INTENDED folders/files. Nothing here creates folders — it only describes them.
 * The original AppleScript mapping is pending; see README "Workflow extension points".
 */
import type { WorkflowTemplate } from "./types";

export const PROPOSED_DEFAULT_WORKFLOW: WorkflowTemplate = {
  rootFolderPattern: "{name} v{version}",
  folders: ["Recipe", "Brew Logs", "Labels", "Assets"],
  recipeFolder: "Recipe",
  fileBasePattern: "{slug}-v{version}",
  matchedToOriginalAppleScript: false,
};

export const PATTERN_TOKENS = ["{name}", "{version}", "{style}", "{slug}", "{date}"] as const;

const RESERVED_WINDOWS = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])$/i;
const MAX_COMPONENT_LENGTH = 100;

/**
 * Makes one path component safe: no slashes/backslashes, no traversal (".", ".."),
 * no control or reserved characters, no Windows reserved device names.
 */
export function sanitizePathComponent(input: string, fallback = "untitled"): string {
  let s = (input ?? "")
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[/\\]/g, "-")
    .replace(/[<>:"|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^[.\-\s]+/, "").replace(/[.\s]+$/, "");
  if (s.length > MAX_COMPONENT_LENGTH) s = s.slice(0, MAX_COMPONENT_LENGTH).replace(/[.\s]+$/, "");
  if (!s) s = fallback;
  const stem = s.split(".")[0];
  if (RESERVED_WINDOWS.test(stem)) s = `_${s}`;
  return s;
}

export function slugify(s: string): string {
  const slug = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recipe";
}

export interface PatternContext {
  name: string;
  version: string;
  style: string;
  date: string; // YYYY-MM-DD
}

export function renderPattern(pattern: string, ctx: PatternContext): string {
  return pattern
    .replaceAll("{name}", ctx.name)
    .replaceAll("{version}", ctx.version)
    .replaceAll("{style}", ctx.style)
    .replaceAll("{slug}", slugify(ctx.name))
    .replaceAll("{date}", ctx.date);
}

export function validateWorkflowTemplate(t: WorkflowTemplate): string[] {
  const errors: string[] = [];
  if (!t.rootFolderPattern.trim()) errors.push("Root folder pattern is required.");
  if (!t.fileBasePattern.trim()) errors.push("File name pattern is required.");
  const names = t.folders.map((f) => f.trim());
  if (names.some((n) => !n)) errors.push("Folder names can't be blank.");
  const lower = names.map((n) => sanitizePathComponent(n).toLowerCase());
  if (new Set(lower).size !== lower.length) errors.push("Folder names must be unique.");
  if (!names.includes(t.recipeFolder.trim())) errors.push("Choose which folder receives recipe exports.");
  return errors;
}

export interface ManifestFile {
  path: string;
  kind: "recipe-json" | "recipe-markdown" | "project-manifest";
  description: string;
}

export interface ProjectManifest {
  format: "lowcase-brewing.project-manifest";
  schemaVersion: 1;
  generatedAt: string;
  status: "planned-not-created";
  automation: {
    appleScriptMapping: "pending";
    foldersCreated: false;
    note: string;
  };
  template: WorkflowTemplate;
  rootFolder: string;
  folders: string[];
  files: ManifestFile[];
}

export interface ExportFileNames {
  base: string;
  json: string;
  markdown: string;
  manifest: string;
}

export function exportFileNames(
  recipe: { name: string; version: string; style: string },
  template: WorkflowTemplate,
  date: string,
): ExportFileNames {
  const base = sanitizePathComponent(renderPattern(template.fileBasePattern, { ...recipe, date }), "recipe");
  return {
    base,
    json: `${base}.recipe.json`,
    markdown: `${base}.md`,
    manifest: `${base}.project-manifest.json`,
  };
}

export function buildProjectManifest(
  recipe: { name: string; version: string; style: string },
  template: WorkflowTemplate,
  now: string,
): ProjectManifest {
  const date = now.slice(0, 10);
  const ctx = { ...recipe, date };
  const root = sanitizePathComponent(renderPattern(template.rootFolderPattern, ctx), "lowcase project");
  const folders = template.folders.map((f) => `${root}/${sanitizePathComponent(f, "folder")}`);
  const recipeFolder = `${root}/${sanitizePathComponent(template.recipeFolder, "Recipe")}`;
  const names = exportFileNames(recipe, template, date);
  return {
    format: "lowcase-brewing.project-manifest",
    schemaVersion: 1,
    generatedAt: now,
    status: "planned-not-created",
    automation: {
      appleScriptMapping: "pending",
      foldersCreated: false,
      note: "Describes intended folders and files only. lowcase Brewing did not create any Finder or Google Drive folders. The proposed default template has not yet been matched to the original AppleScript.",
    },
    template,
    rootFolder: root,
    folders,
    files: [
      { path: `${recipeFolder}/${names.json}`, kind: "recipe-json", description: "Versioned recipe export (machine-readable)." },
      { path: `${recipeFolder}/${names.markdown}`, kind: "recipe-markdown", description: "Readable recipe sheet." },
      { path: `${root}/${names.manifest}`, kind: "project-manifest", description: "This manifest." },
    ],
  };
}

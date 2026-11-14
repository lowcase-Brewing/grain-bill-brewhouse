import { WhenStoreReady } from "@/components/brew/when-store-ready";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmButton } from "@/components/brew/confirm-button";
import { PageHeader, Panel } from "@/components/brew/page";
import { LegacyImportPanel } from "@/components/brew/legacy-import";
import { seedLibrary } from "@/domain/library";
import type { WorkflowTemplate } from "@/domain/types";
import {
  buildProjectManifest,
  PATTERN_TOKENS,
  PROPOSED_DEFAULT_WORKFLOW,
  validateWorkflowTemplate,
} from "@/domain/workflow";
import { downloadText } from "@/lib/download";
import { nowIso, useBrewStore } from "@/storage/brew-store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Workflow & settings · lowcase Brewing" },
      {
        name: "description",
        content:
          "Project folder template, exports and account storage details for lowcase Brewing.",
      },
      { property: "og:title", content: "Workflow & settings · lowcase Brewing" },
      { property: "og:description", content: "Folder template, exports and storage details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Workflow & settings"
        description="How projects are named, what exports contain, and where your data lives."
      />
      <WhenStoreReady>
        <Body />
      </WhenStoreReady>
    </>
  );
}

function Body() {
  const { data, actions, repositoryDescription } = useBrewStore();
  const [t, setT] = useState<WorkflowTemplate>(() => data!.settings.workflow);
  const [previewId, setPreviewId] = useState<string>("sample");
  if (!data) return null;
  const errors = validateWorkflowTemplate(t);
  const sample = data.recipes.find((r) => r.id === previewId) ?? {
    name: "Sample Recipe",
    version: "1.0.0",
    style: "Pale Ale",
  };
  const manifest = buildProjectManifest(sample, t, nowIso());

  return (
    <div className="space-y-6">
      <LegacyImportPanel />
      <Panel title="Where your data lives">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">Saved to your account</Badge> {repositoryDescription}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Recipes, calculator drafts, malt library edits and these settings are saved to your
              signed-in account, so another browser or device signed in as you sees them.
            </li>
            <li>
              Each account's data is private: the database only lets the signed-in owner read or
              change their own rows. Accounts are invite-only; public sign-up is off.
            </li>
            <li>
              A change is shown as saved only after the cloud confirms it. If a save fails you'll
              see an error — download a backup to keep an offline copy.
            </li>
            <li>
              Account features remain invite-only during beta. AppleScript, Finder and Drive
              automation are not connected.
            </li>
          </ul>
          {data.issues.map((issue) => (
            <div
              key={issue.section}
              className="rounded-md border border-amber/40 bg-amber-soft p-3 text-amber-foreground"
            >
              <p className="font-medium">
                Saving “{issue.section}” is paused: {issue.message}
              </p>
              <p className="mt-1 text-xs">
                The stored data was left untouched. Download it, then reset that section if you want
                to start fresh.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadText(issue.raw, `lowcase-${issue.section}-raw.txt`, "text/plain")
                  }
                >
                  <Download /> Download raw data
                </Button>
                <ConfirmButton
                  trigger={
                    <Button size="sm" variant="destructive">
                      Reset section
                    </Button>
                  }
                  title={`Reset ${issue.section}?`}
                  description="This overwrites the unreadable stored data for this section."
                  confirmLabel="Reset"
                  onConfirm={() => void actions.resetSection(issue.section)}
                />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  JSON.stringify(
                    {
                      format: "lowcase-brewing.account-backup",
                      schemaVersion: 1,
                      exportedAt: nowIso(),
                      recipes: data.recipes,
                      library: data.library,
                      settings: data.settings,
                      drafts: data.drafts,
                    },
                    null,
                    2,
                  ) + "\n",
                  `lowcase-backup-${nowIso().slice(0, 10)}.json`,
                  "application/json",
                )
              }
            >
              <Download /> Download full backup (JSON)
            </Button>
            <ConfirmButton
              trigger={<Button variant="outline">Restore seed malt library</Button>}
              title="Restore the seed malt library?"
              description="Replaces the library with the active 48 standard entries. Custom ingredients and edits are removed. Saved recipes keep their snapshots. For additions without replacement, use Review library updates in the Malt library."
              confirmLabel="Restore"
              onConfirm={async () => {
                if (await actions.replaceLibrary(seedLibrary(nowIso())))
                  toast.success("Seed library restored");
              }}
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Project folder template"
        description="Proposed default — not yet matched to the original AppleScript."
        actions={<Badge variant="amber">AppleScript workflow mapping pending</Badge>}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wf-root">Root folder pattern</Label>
              <Input
                id="wf-root"
                value={t.rootFolderPattern}
                onChange={(e) => setT({ ...t, rootFolderPattern: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-file">File name pattern</Label>
              <Input
                id="wf-file"
                value={t.fileBasePattern}
                onChange={(e) => setT({ ...t, fileBasePattern: e.target.value })}
              />
              <p className="text-[11px] text-muted-foreground">
                Tokens: {PATTERN_TOKENS.join(" ")}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Subfolders</Label>
              {t.folders.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    aria-label={`Folder ${i + 1}`}
                    value={f}
                    onChange={(e) => {
                      const folders = t.folders.map((x, j) => (j === i ? e.target.value : x));
                      setT({
                        ...t,
                        folders,
                        recipeFolder: t.recipeFolder === f ? e.target.value : t.recipeFolder,
                      });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove folder ${i + 1}`}
                    onClick={() => setT({ ...t, folders: t.folders.filter((_, j) => j !== i) })}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setT({ ...t, folders: [...t.folders, "New Folder"] })}
              >
                <Plus /> Add folder
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-recipe-folder">Recipe exports go in</Label>
              <Select
                value={t.folders.includes(t.recipeFolder) ? t.recipeFolder : ""}
                onValueChange={(v) => setT({ ...t, recipeFolder: v })}
              >
                <SelectTrigger id="wf-recipe-folder">
                  <SelectValue placeholder="Choose folder" />
                </SelectTrigger>
                <SelectContent>
                  {t.folders
                    .filter((f) => f.trim())
                    .map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {errors.length > 0 && (
              <ul className="text-xs text-destructive">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={errors.length > 0}
                onClick={async () => {
                  if (await actions.saveSettings({ ...data.settings, workflow: t }))
                    toast.success("Template saved");
                }}
              >
                Save template
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setT({
                    ...PROPOSED_DEFAULT_WORKFLOW,
                    folders: [...PROPOSED_DEFAULT_WORKFLOW.folders],
                  })
                }
              >
                Use proposed default
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wf-preview">Preview with</Label>
              <Select value={previewId} onValueChange={setPreviewId}>
                <SelectTrigger id="wf-preview">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sample">Sample Recipe v1.0.0</SelectItem>
                  {data.recipes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} v{r.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <pre className="overflow-x-auto rounded-md bg-sidebar p-4 font-mono text-xs leading-relaxed text-sidebar-foreground">
              {[
                manifest.rootFolder + "/",
                ...manifest.folders.map(
                  (f) => "  " + f.slice(manifest.rootFolder.length + 1) + "/",
                ),
                "",
                ...manifest.files.map((f) => f.path),
              ].join("\n")}
            </pre>
            <p className="text-xs text-muted-foreground">
              Names are sanitized (no slashes, backslashes, “..” or reserved names). This is a plan
              only — no Finder or Google Drive folders are created, and no AppleScript runs.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Planned integrations" description="Not active.">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Google sign-in: not added yet; this version uses invite-only email and password
            accounts.
          </li>
          <li>
            Desktop helper or Google Drive integration: would consume the project manifest to create
            folders, after the AppleScript mapping is approved.
          </li>
          <li>
            Live Google Sheet sync: not planned yet; the library is a read-only snapshot from
            2026-11-13.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

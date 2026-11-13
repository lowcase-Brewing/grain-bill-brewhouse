import { FileJson, FileText, FolderTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildRecipeExport, exportFileNames, recipeToMarkdown, serializeRecipeExport } from "@/domain/export";
import type { Recipe, WorkflowTemplate } from "@/domain/types";
import { buildProjectManifest } from "@/domain/workflow";
import { downloadText } from "@/lib/download";
import { nowIso } from "@/storage/brew-store";

export function ExportActions({ recipe, template }: { recipe: Recipe; template: WorkflowTemplate }) {
  const names = () => exportFileNames(recipe, template, nowIso().slice(0, 10));
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Button variant="outline" onClick={() => downloadText(serializeRecipeExport(buildRecipeExport(recipe, template, nowIso())), names().json, "application/json")}>
        <FileJson /> Recipe JSON
      </Button>
      <Button variant="outline" onClick={() => downloadText(recipeToMarkdown(recipe, template, nowIso()), names().markdown, "text/markdown")}>
        <FileText /> Markdown
      </Button>
      <Button variant="outline" onClick={() => downloadText(JSON.stringify(buildProjectManifest(recipe, template, nowIso()), null, 2) + "\n", names().manifest, "application/json")}>
        <FolderTree /> Project manifest
      </Button>
    </div>
  );
}

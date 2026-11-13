import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedLibrary } from "@/domain/library";
import { BrewStoreProvider, useBrewStore } from "../brew-store";
import { defaultSettings } from "../local-repository";
import type { BrewRepository, RepositorySnapshot } from "../repository";

function deferredRepo(label: string) {
  let resolve!: (s: RepositorySnapshot) => void;
  const loaded = new Promise<RepositorySnapshot>((r) => (resolve = r));
  const repo = {
    kind: "authenticated-backend",
    description: label,
    loadAll: () => loaded,
  } as unknown as BrewRepository;
  const snap = (name: string): RepositorySnapshot => ({ recipes: [{ id: name, name } as never], library: seedLibrary("2026-11-13T00:00:00.000Z"), settings: defaultSettings(), drafts: [], issues: [] });
  return { repo, finish: (name: string) => resolve(snap(name)) };
}

function Names() {
  const { data, status } = useBrewStore();
  return <p>{status}:{data?.recipes.map((r) => r.name).join(",") ?? "none"}</p>;
}

describe("account-bound store", () => {
  it("ignores a previous account's late load after switching accounts", async () => {
    const a = deferredRepo("A");
    const b = deferredRepo("B");
    const { rerender } = render(<BrewStoreProvider key="a" createRepository={() => a.repo}><Names /></BrewStoreProvider>);
    rerender(<BrewStoreProvider key="b" createRepository={() => b.repo}><Names /></BrewStoreProvider>);
    await act(async () => { a.finish("alice-secret"); await Promise.resolve(); });
    expect(screen.getByText("loading:none")).toBeInTheDocument();
    await act(async () => { b.finish("bob-recipe"); await Promise.resolve(); });
    expect(await screen.findByText("ready:bob-recipe")).toBeInTheDocument();
    expect(screen.queryByText(/alice-secret/)).not.toBeInTheDocument();
  });
});

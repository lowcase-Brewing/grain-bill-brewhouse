import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrewStoreProvider } from "@/storage/brew-store";
import { LocalBrewRepository } from "@/storage/local-repository";
import { WhenStoreReady } from "../when-store-ready";
import { useGrainBillWork } from "../use-grain-bill-work";
import { GuestCalculator } from "@/components/public/guest-calculator";
import { DEFAULT_CALC_SETTINGS } from "@/domain/calculator";
import type { EditorState } from "../grain-bill-editor";

const baseline: EditorState = {
  settings: { ...DEFAULT_CALC_SETTINGS },
  rows: [],
  loadedExample: false,
};
function PrivateDraft() {
  const { state, setState } = useGrainBillWork("scratch", null, baseline);
  return (
    <input
      aria-label="Private draft volume"
      value={state.settings.coldFermenterGal}
      onChange={(e) =>
        setState({ ...state, settings: { ...state.settings, coldFermenterGal: e.target.value } })
      }
    />
  );
}
function memoryRepository() {
  const data = new Map<string, string>();
  return new LocalBrewRepository({
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    removeItem: (k: string) => {
      data.delete(k);
    },
  });
}

describe("private draft persistence after guest editor extraction", () => {
  it("restores and autosaves the account draft, then flushes the last edit on navigation", async () => {
    const repo = memoryRepository();
    await repo.loadAll();
    await repo.upsertDraft({
      key: "scratch",
      recipeId: null,
      settings: { ...DEFAULT_CALC_SETTINGS, coldFermenterGal: "8" },
      rows: [],
      loadedExample: false,
      updatedAt: "2026-11-14T00:00:00Z",
    });
    const save = vi.spyOn(repo, "upsertDraft");
    const privateView = render(
      <BrewStoreProvider createRepository={() => repo}>
        <WhenStoreReady>
          <PrivateDraft />
        </WhenStoreReady>
      </BrewStoreProvider>,
    );
    expect(await screen.findByLabelText("Private draft volume")).toHaveValue("8");
    fireEvent.change(screen.getByLabelText("Private draft volume"), { target: { value: "9" } });
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({ settings: expect.objectContaining({ coldFermenterGal: "9" }) }),
      ),
    );
    fireEvent.change(screen.getByLabelText("Private draft volume"), { target: { value: "10" } });
    privateView.rerender(
      <BrewStoreProvider createRepository={() => repo}>
        <WhenStoreReady>
          <p>Another private route</p>
        </WhenStoreReady>
      </BrewStoreProvider>,
    );
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ coldFermenterGal: "10" }) }),
    );
    privateView.unmount();
    render(<GuestCalculator />);
    fireEvent.click(screen.getByRole("button", { name: "Load reference example" }));
    expect(screen.getByLabelText("Cold fermenter volume")).toHaveValue("6.5");
    const afterGuest = await repo.loadAll();
    expect(afterGuest.drafts[0]?.settings.coldFermenterGal).toBe("10");
  });
});

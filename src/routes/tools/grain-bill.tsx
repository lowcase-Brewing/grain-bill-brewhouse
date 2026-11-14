import { createFileRoute } from "@tanstack/react-router";
import { PublicShell } from "@/components/public/public-shell";
import { GuestCalculator } from "@/components/public/guest-calculator";

export const Route = createFileRoute("/tools/grain-bill")({
  head: () => ({
    meta: [
      { title: "Grain bill calculator · lowcase Brewing" },
      {
        name: "description",
        content: "Estimate original gravity from your grain bill. No account required.",
      },
      { property: "og:title", content: "Grain bill calculator · lowcase Brewing" },
      { property: "og:description", content: "Estimate grain and extract gravity with 48 standard ingredients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <PublicShell>
      <GuestCalculator />
    </PublicShell>
  ),
});

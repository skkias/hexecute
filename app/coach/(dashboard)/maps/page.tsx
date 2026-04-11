import type { Metadata } from "next";
import { listMaps } from "@/lib/catalog-queries";
import { MapListClient } from "@/components/coach/MapListClient";
import type { GameMap } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Map shapes · Coach",
  description: "Define map reference images and vector outlines.",
};

export default async function CoachMapsPage() {
  let maps: GameMap[] = [];
  let loadError: string | null = null;
  try {
    maps = await listMaps();
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Could not load maps from Supabase.";
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-violet-500/15 px-4 py-6 md:py-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-2xl font-semibold text-white drop-shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            Map shapes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-violet-200/65">
            Paste a minimap image for each competitive map, then trace attack and
            defense outlines. Strats reference these shapes for future layout tools.
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 md:py-8">
        <div className="mx-auto w-full max-w-6xl">
        {loadError ? (
          <p className="rounded-lg border border-fuchsia-900/50 bg-fuchsia-950/30 px-4 py-3 text-sm text-fuchsia-200">
            {loadError}{" "}
            <span className="text-fuchsia-300/70">
              Apply the migration in{" "}
              <code className="rounded bg-black/30 px-1">supabase/migrations/</code>{" "}
              if you have not created the catalog tables yet.
            </span>
          </p>
        ) : (
          <MapListClient maps={maps} />
        )}
        </div>
      </div>
    </main>
  );
}

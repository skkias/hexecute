import type { Metadata } from "next";
import { CoachDashboard } from "@/components/CoachDashboard";
import { listAgents, listMaps } from "@/lib/catalog-queries";
import type { Agent, GameMap } from "@/types/catalog";

export const metadata: Metadata = {
  title: "Coach · Valo Strats",
  description: "Create and edit team strategies.",
};

export default async function CoachPage() {
  let agents: Agent[] = [];
  let maps: GameMap[] = [];
  let catalogError: string | null = null;
  try {
    agents = await listAgents();
    maps = await listMaps();
  } catch (e) {
    catalogError =
      e instanceof Error ? e.message : "Could not load agents or maps from Supabase.";
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-3 pt-2 md:px-4 md:pb-4">
      <CoachDashboard
        initialAgents={agents}
        initialMaps={maps}
        catalogError={catalogError}
      />
    </main>
  );
}

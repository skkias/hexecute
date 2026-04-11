import type { Agent } from "@/types/catalog";
import type { AgentAbilityBlueprint } from "@/types/agent-ability";
import type { StratPlacedAbility } from "@/types/strat";

/** Saved coach blueprint for an agent slot, if any. */
export function agentBlueprintForSlot(
  agents: Agent[],
  agentSlug: string,
  slot: StratPlacedAbility["slot"],
): AgentAbilityBlueprint | undefined {
  const a = agents.find((x) => x.slug === agentSlug);
  return a?.abilities_blueprint?.find((b) => b.slot === slot);
}

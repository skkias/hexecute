import type { AgentAbilityBlueprint } from "@/types/agent-ability";
import type { StratPlacedAbility } from "@/types/strat";

const ALL_SLOTS: StratPlacedAbility["slot"][] = ["q", "e", "c", "x"];

/**
 * Ability chips on the strat map must match coach-defined blueprints when present.
 * If the blueprint is empty, all four slots are available (until blueprints are drawn).
 */
export function allowedAbilitySlotsFromBlueprint(
  blueprint: AgentAbilityBlueprint[] | null | undefined,
): StratPlacedAbility["slot"][] {
  if (!blueprint || blueprint.length === 0) return [...ALL_SLOTS];
  const set = new Set(blueprint.map((b) => b.slot));
  return ALL_SLOTS.filter((s) => set.has(s));
}

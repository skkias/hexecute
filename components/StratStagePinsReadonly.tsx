"use client";

import { useEffect, useMemo, useState } from "react";
import type { Agent } from "@/types/catalog";
import type { StratSide, StratStage } from "@/types/strat";
import type { ViewBoxRect } from "@/lib/map-path";
import { stratStagePinForDisplay } from "@/lib/strat-stage-coords";
import {
  StratStageAgentTokens,
  type StratAgentTokenTransition,
} from "@/components/StratStageAgentTokens";
import {
  abilitySlotLabel,
  abilitySlotStyle,
} from "@/lib/strat-stage-pin-styles";
import { agentBlueprintForSlot } from "@/lib/strat-ability-blueprint-lookup";
import { StratAbilityBlueprintSvg } from "@/components/StratAbilityBlueprintSvg";
import {
  abilityMetaForSlot,
  fetchValorantAbilityUiBySlug,
  type ValorantAbilityUiMeta,
} from "@/lib/valorant-api-abilities";
import { effectiveStratPlacementMode } from "@/lib/strat-blueprint-anchor";
import {
  stratAbilityRotationHandleDistance,
  stratAbilityRotationHandleStored,
} from "@/lib/strat-ability-rotation-handle";
import {
  blueprintPointToStratMapDisplay,
  rectangleStratPivotBlueprint,
  stratAnchorOverrideForBlueprint,
} from "@/lib/strat-blueprint-map-point";
import {
  clampCoachMapPinScale,
  stratAbilityPinDimensions,
} from "@/lib/strat-map-pin-scale";

export function StratStagePinsReadonly({
  vb,
  vbWidth,
  side,
  stage,
  compSlugs,
  agentsCatalog,
  agentTransition,
  pinScale = 1,
}: {
  vb: ViewBoxRect;
  vbWidth: number;
  side: StratSide;
  stage: StratStage;
  compSlugs: string[];
  agentsCatalog: Agent[];
  /** When the viewed stage tab changes, animate agent tokens from the previous stage. */
  agentTransition?: StratAgentTokenTransition;
  /** Coach / saved browser preference (default 1). */
  pinScale?: number;
}) {
  const roster = useMemo(() => {
    const slugs = compSlugs.map((s) => s.trim()).filter(Boolean);
    const uniq = [...new Set(slugs)];
    return uniq
      .map((slug) => {
        const a = agentsCatalog.find((x) => x.slug === slug);
        if (!a) return null;
        const raw = a.portrait_url?.trim();
        return {
          slug,
          name: a.name,
          role: a.role,
          portraitUrl:
            raw?.startsWith("https://") === true ? raw : null,
        };
      })
      .filter(
        (x): x is {
          slug: string;
          name: string;
          role: string;
          portraitUrl: string | null;
        } => x != null,
      );
  }, [compSlugs, agentsCatalog]);

  const pinS = clampCoachMapPinScale(pinScale);
  const { abilityR, fontAbility } = stratAbilityPinDimensions(
    vbWidth,
    pinScale,
  );

  const [valorantAbilityUi, setValorantAbilityUi] = useState<
    Record<string, ValorantAbilityUiMeta[]>
  >({});

  useEffect(() => {
    let cancelled = false;
    void fetchValorantAbilityUiBySlug()
      .then((data) => {
        if (!cancelled) setValorantAbilityUi(data);
      })
      .catch(() => {
        if (!cancelled) setValorantAbilityUi({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <g style={{ pointerEvents: "none" }}>
      {stage.abilities.map((ab) => {
        const st = abilitySlotStyle(ab.slot);
        const pos = stratStagePinForDisplay(vb, side, { x: ab.x, y: ab.y });
        const bp = agentBlueprintForSlot(agentsCatalog, ab.agentSlug, ab.slot);
        const useTwoHandles =
          bp != null && effectiveStratPlacementMode(bp) === "origin_direction";
        const stratOv = bp ? stratAnchorOverrideForBlueprint(bp) : undefined;
        const isRectOD =
          useTwoHandles &&
          bp != null &&
          bp.shapeKind === "rectangle" &&
          bp.geometry.kind === "rectangle";
        const rotDist = stratAbilityRotationHandleDistance(vbWidth) * pinS;
        const rotStored = stratAbilityRotationHandleStored(
          { x: ab.x, y: ab.y },
          ab.rotationDeg ?? 0,
          rotDist,
        );
        const rotPos = stratStagePinForDisplay(vb, side, rotStored);
        const rectCenterPos =
          isRectOD && bp && bp.geometry.kind === "rectangle"
            ? blueprintPointToStratMapDisplay(
                rectangleStratPivotBlueprint(bp.geometry),
                bp,
                pos.x,
                pos.y,
                vbWidth,
                ab.rotationDeg ?? 0,
                stratOv,
              )
            : null;

        return (
          <g key={ab.id}>
            {bp ? (
              <StratAbilityBlueprintSvg
                blueprint={bp}
                mapX={pos.x}
                mapY={pos.y}
                vbWidth={vbWidth}
                rotationDeg={ab.rotationDeg ?? 0}
                pointerEvents="none"
                stratAnchorOverride={stratOv}
                mapPinScale={pinScale}
                abilityDisplayIconUrl={
                  bp.shapeKind === "point"
                    ? abilityMetaForSlot(
                        valorantAbilityUi,
                        ab.agentSlug,
                        ab.slot,
                      )?.displayIcon ?? null
                    : null
                }
              />
            ) : (
              <g transform={`translate(${pos.x},${pos.y})`}>
                <circle
                  r={abilityR}
                  fill={st.fill}
                  stroke={st.stroke}
                  strokeWidth={vbWidth * 0.0024 * pinS}
                />
                <text
                  y={fontAbility * 0.35}
                  textAnchor="middle"
                  fill="rgba(15,23,42,0.92)"
                  style={{
                    fontSize: fontAbility,
                    fontFamily: "system-ui, sans-serif",
                    fontWeight: 800,
                  }}
                >
                  {abilitySlotLabel(ab.slot)}
                </text>
              </g>
            )}
            {useTwoHandles ? (
              <g pointerEvents="none">
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={isRectOD && rectCenterPos ? rectCenterPos.x : rotPos.x}
                  y2={isRectOD && rectCenterPos ? rectCenterPos.y : rotPos.y}
                  stroke="rgba(34, 211, 238, 0.55)"
                  strokeWidth={Math.max(vbWidth * 0.0016, 0.75) * pinS}
                  strokeDasharray="5 4"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={Math.max(vbWidth * 0.007, 3.5) * pinS}
                  fill="rgb(250, 204, 21)"
                  stroke="rgb(15, 23, 42)"
                  strokeWidth={Math.max(vbWidth * 0.0018, 0.8) * pinS}
                />
                <circle
                  cx={isRectOD && rectCenterPos ? rectCenterPos.x : rotPos.x}
                  cy={isRectOD && rectCenterPos ? rectCenterPos.y : rotPos.y}
                  r={Math.max(vbWidth * 0.0065, 3) * pinS}
                  fill="rgb(34, 211, 238)"
                  stroke="rgb(15, 23, 42)"
                  strokeWidth={Math.max(vbWidth * 0.0016, 0.75) * pinS}
                />
              </g>
            ) : null}
          </g>
        );
      })}
      <StratStageAgentTokens
        vb={vb}
        vbWidth={vbWidth}
        side={side}
        agents={stage.agents}
        roster={roster}
        transition={agentTransition ?? null}
        pinScale={pinScale}
        pointerEventsNoneOnText
      />
    </g>
  );
}

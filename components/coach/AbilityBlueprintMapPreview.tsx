"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameMap } from "@/types/catalog";
import type { AgentAbilityBlueprint } from "@/types/agent-ability";
import { StratMapViewer } from "@/components/StratMapViewer";
import { StratAbilityBlueprintSvg } from "@/components/StratAbilityBlueprintSvg";
import { stratMapDisplayData } from "@/lib/strat-map-display";
import type { StratSide } from "@/types/strat";
import { normalizeEditorMeta } from "@/lib/map-editor-meta";
import {
  mapGeometryScaleFromEditorMeta,
  rootPointToLogicalGeometry,
} from "@/lib/map-geometry-scale";
import { clientToSvgPoint } from "@/lib/svg-coords";
import { clampPointToViewBox } from "@/lib/map-path";
import {
  blueprintPointToStratMapDisplay,
  rectangleStratPivotBlueprint,
  stratAnchorOverrideForBlueprint,
} from "@/lib/strat-blueprint-map-point";
import { effectiveStratPlacementMode } from "@/lib/strat-blueprint-anchor";
import {
  stratAbilityRotationHandleDistance,
  stratAbilityRotationHandleStored,
} from "@/lib/strat-ability-rotation-handle";

function round4(n: number): string {
  const r = Math.round(n * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, "");
}

/**
 * Live map overlay using the same SVG stack and scaling as the strat designer
 * (`StratAbilityBlueprintSvg` + map viewBox).
 */
export function AbilityBlueprintMapPreview({
  gameMap,
  blueprint,
  /** Valorant API ability icon for point blueprints (see `abilityMetaForSlot`). */
  abilityDisplayIconUrl,
}: {
  gameMap: GameMap;
  blueprint: AgentAbilityBlueprint | null;
  abilityDisplayIconUrl?: string | null;
}) {
  const [side, setSide] = useState<StratSide>("atk");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [draggingAnchor, setDraggingAnchor] = useState(false);
  const [draggingRotation, setDraggingRotation] = useState(false);
  /** Map-test rotation only (degrees); does not change saved blueprint. */
  const [previewRotationDeg, setPreviewRotationDeg] = useState(0);

  const mapSvgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ pointerId: number; kind: "origin" | "rotate" } | null>(
    null,
  );

  const { vb } = useMemo(
    () => stratMapDisplayData(gameMap, side),
    [gameMap, side],
  );

  const mapGeoScale = useMemo(
    () =>
      mapGeometryScaleFromEditorMeta(
        normalizeEditorMeta(gameMap.editor_meta),
      ),
    [gameMap.editor_meta],
  );

  const defaultAnchor = useMemo(
    () => ({
      x: vb.minX + vb.width / 2,
      y: vb.minY + vb.height / 2,
    }),
    [vb.minX, vb.minY, vb.width, vb.height],
  );

  useEffect(() => {
    setAnchor(null);
    setPreviewRotationDeg(0);
  }, [gameMap.id, side]);

  useEffect(() => {
    setPreviewRotationDeg(0);
  }, [blueprint?.id]);

  const pos = anchor ?? defaultAnchor;
  const stratAnchorOverride = blueprint
    ? stratAnchorOverrideForBlueprint(blueprint)
    : undefined;
  const useTwoHandles =
    blueprint != null && effectiveStratPlacementMode(blueprint) === "origin_direction";
  const accentColor = blueprint?.color ?? "rgb(34, 211, 238)";
  const rotDist = stratAbilityRotationHandleDistance(vb.width);
  const rotHandlePos = stratAbilityRotationHandleStored(
    { x: pos.x, y: pos.y },
    previewRotationDeg,
    rotDist,
  );
  const rectCenterPos =
    useTwoHandles &&
    blueprint?.shapeKind === "rectangle" &&
    blueprint.geometry.kind === "rectangle"
      ? blueprintPointToStratMapDisplay(
          rectangleStratPivotBlueprint(blueprint.geometry),
          blueprint,
          pos.x,
          pos.y,
          vb.width,
          previewRotationDeg,
          stratAnchorOverride,
        )
      : null;

  const [axStr, setAxStr] = useState("");
  const [ayStr, setAyStr] = useState("");

  useEffect(() => {
    setAxStr(round4(pos.x));
    setAyStr(round4(pos.y));
  }, [pos.x, pos.y]);

  const pointerToLogical = useCallback(
    (clientX: number, clientY: number) => {
      const svg = mapSvgRef.current;
      if (!svg) return null;
      const root = clientToSvgPoint(svg, clientX, clientY);
      return rootPointToLogicalGeometry(root, vb, mapGeoScale);
    },
    [vb, mapGeoScale],
  );

  function applyAnchorFromInputs() {
    const x = Number.parseFloat(axStr);
    const y = Number.parseFloat(ayStr);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    setAnchor(clampPointToViewBox(vb, { x, y }));
  }

  const onBlueprintPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !blueprint || useTwoHandles) return;
      e.stopPropagation();
      e.preventDefault();
      setDraggingAnchor(true);
      dragRef.current = { pointerId: e.pointerId, kind: "origin" };
      function onMove(ev: PointerEvent) {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        const logical = pointerToLogical(ev.clientX, ev.clientY);
        if (logical) setAnchor(clampPointToViewBox(vb, logical));
      }
      function end(ev: PointerEvent) {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        setDraggingAnchor(false);
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [blueprint, pointerToLogical, useTwoHandles, vb],
  );

  const onOriginHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !blueprint) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = { pointerId: e.pointerId, kind: "origin" };
      setDraggingAnchor(true);
      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        const logical = pointerToLogical(ev.clientX, ev.clientY);
        if (logical) setAnchor(clampPointToViewBox(vb, logical));
      };
      const end = (ev: PointerEvent) => {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        setDraggingAnchor(false);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [blueprint, pointerToLogical, vb],
  );

  const onRotateHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !blueprint) return;
      e.stopPropagation();
      e.preventDefault();
      dragRef.current = { pointerId: e.pointerId, kind: "rotate" };
      setDraggingRotation(true);
      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        const logical = pointerToLogical(ev.clientX, ev.clientY);
        if (!logical) return;
        const rotationDeg = (Math.atan2(logical.y - pos.y, logical.x - pos.x) * 180) / Math.PI;
        if (Number.isFinite(rotationDeg)) setPreviewRotationDeg(rotationDeg);
      };
      const end = (ev: PointerEvent) => {
        if (!dragRef.current || ev.pointerId !== dragRef.current.pointerId) return;
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        setDraggingRotation(false);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    },
    [blueprint, pointerToLogical, pos.x, pos.y],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-violet-200/85">
        <span className="text-violet-400/80">Strat preview</span>
        <label className="inline-flex items-center gap-1.5">
          <span className="text-violet-500/90">Side</span>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as StratSide)}
            className="input-field py-1 text-xs"
          >
            <option value="atk">Attack</option>
            <option value="def">Defense</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary py-1 text-xs"
          onClick={() => setAnchor(null)}
        >
          Center anchor
        </button>
        <label className="inline-flex items-center gap-2">
          <span className="text-violet-500/90">Rotate test</span>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={previewRotationDeg}
            onChange={(e) =>
              setPreviewRotationDeg(Number(e.target.value) || 0)
            }
            className="w-28 accent-cyan-500 md:w-36"
            aria-label="Preview rotation in degrees"
          />
          <span className="w-8 font-mono text-violet-300/90">
            {previewRotationDeg}°
          </span>
          <button
            type="button"
            className="btn-secondary py-0.5 px-1.5 text-[10px]"
            onClick={() => setPreviewRotationDeg(0)}
          >
            0°
          </button>
        </label>
      </div>

      <StratMapViewer
        ref={mapSvgRef}
        gameMap={gameMap}
        side={side}
        showLayerToggles={false}
        showFooter={false}
        embed
      >
        {blueprint ? (
          <g
            onPointerDown={onBlueprintPointerDown}
            style={{
              cursor: draggingAnchor ? "grabbing" : "grab",
              touchAction: "none",
            }}
          >
            <StratAbilityBlueprintSvg
              blueprint={blueprint}
              mapX={pos.x}
              mapY={pos.y}
              vbWidth={vb.width}
              rotationDeg={previewRotationDeg}
              pointerEvents="auto"
              abilityDisplayIconUrl={abilityDisplayIconUrl ?? null}
              stratAnchorOverride={stratAnchorOverride}
            />
            {useTwoHandles ? (
              <>
                <line
                  x1={pos.x}
                  y1={pos.y}
                  x2={rectCenterPos ? rectCenterPos.x : rotHandlePos.x}
                  y2={rectCenterPos ? rectCenterPos.y : rotHandlePos.y}
                  stroke={accentColor}
                  opacity={0.8}
                  strokeWidth={Math.max(vb.width * 0.0018, 0.85)}
                  strokeDasharray="6 5"
                  pointerEvents="none"
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={Math.max(vb.width * 0.01, 5)}
                  fill={accentColor}
                  stroke="#0f172a"
                  strokeWidth={Math.max(vb.width * 0.0024, 1)}
                  style={{
                    cursor: draggingAnchor ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
                  onPointerDown={onOriginHandlePointerDown}
                />
                <circle
                  cx={rectCenterPos ? rectCenterPos.x : rotHandlePos.x}
                  cy={rectCenterPos ? rectCenterPos.y : rotHandlePos.y}
                  r={Math.max(vb.width * 0.009, 4.5)}
                  fill={accentColor}
                  stroke="#0f172a"
                  strokeWidth={Math.max(vb.width * 0.002, 1)}
                  style={{
                    cursor: draggingRotation ? "grabbing" : "grab",
                    touchAction: "none",
                  }}
                  onPointerDown={onRotateHandlePointerDown}
                />
              </>
            ) : null}
          </g>
        ) : null}
      </StratMapViewer>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block text-[11px] text-violet-400/90">
          Anchor X (map units)
          <input
            type="number"
            value={axStr}
            onChange={(e) => setAxStr(e.target.value)}
            onBlur={() => applyAnchorFromInputs()}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyAnchorFromInputs();
            }}
            className="input-field mt-0.5 w-full font-mono text-xs"
            step="any"
          />
        </label>
        <label className="block text-[11px] text-violet-400/90">
          Anchor Y (map units)
          <input
            type="number"
            value={ayStr}
            onChange={(e) => setAyStr(e.target.value)}
            onBlur={() => applyAnchorFromInputs()}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyAnchorFromInputs();
            }}
            className="input-field mt-0.5 w-full font-mono text-xs"
            step="any"
          />
        </label>
        <p className="col-span-2 text-[11px] leading-snug text-violet-500/75 sm:col-span-2">
          {useTwoHandles ? (
            <>
              Drag the <strong className="text-violet-300/85">origin handle</strong> to move
              and drag the <strong className="text-violet-300/85">rotation handle</strong> to
              set facing.
            </>
          ) : (
            <>
              <strong className="text-violet-300/85">Drag</strong> the blueprint on the map to
              move the anchor.
            </>
          )}{" "}
          Pan/zoom with the viewer; anchor is in logical map units ({round4(vb.minX)}…
          {round4(vb.minX + vb.width)} × {round4(vb.minY)}…{round4(vb.minY + vb.height)}). Use{" "}
          <strong className="text-violet-300/85">Rotate test</strong> for numeric fine tuning.
        </p>
      </div>
    </div>
  );
}

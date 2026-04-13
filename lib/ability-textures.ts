import type { AbilityTextureId } from "@/types/agent-ability";

export const ABILITY_TEXTURE_OPTIONS: ReadonlyArray<{
  id: AbilityTextureId;
  label: string;
}> = [
  { id: "solid", label: "Solid" },
  { id: "diag_fwd", label: "Diagonal /" },
  { id: "diag_back", label: "Diagonal \\" },
  { id: "crosshatch", label: "Crosshatch" },
  { id: "grid", label: "Grid" },
  { id: "dots_small", label: "Small dots" },
  { id: "dots_large", label: "Large dots" },
  { id: "stripes_h", label: "Horizontal stripes" },
  { id: "stripes_v", label: "Vertical stripes" },
  { id: "stripes_wide", label: "Wide bands" },
  { id: "zigzag", label: "Zigzag" },
  { id: "chevron", label: "Chevron" },
  { id: "triangles", label: "Triangles" },
  { id: "diamonds", label: "Diamonds" },
  { id: "bricks", label: "Bricks" },
  { id: "weave", label: "Weave" },
  { id: "waves", label: "Waves" },
  { id: "rings", label: "Rings" },
  { id: "radial", label: "Radial" },
  { id: "pluses", label: "Pluses" },
  { id: "confetti", label: "Confetti" },
  { id: "stairs", label: "Stairs" },
  { id: "honeycomb", label: "Honeycomb" },
  { id: "sparse_cross", label: "Sparse cross" },
];

const TEXTURE_IDS = new Set(ABILITY_TEXTURE_OPTIONS.map((x) => x.id));

export function normalizeAbilityTextureId(raw: unknown): AbilityTextureId | undefined {
  if (typeof raw !== "string") return undefined;
  return TEXTURE_IDS.has(raw as AbilityTextureId)
    ? (raw as AbilityTextureId)
    : undefined;
}

export function rgbaWithAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const c = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(c)) {
    const r = Number.parseInt(c.slice(1, 3), 16);
    const g = Number.parseInt(c.slice(3, 5), 16);
    const b = Number.parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    const r = Number.parseInt(c[1]! + c[1]!, 16);
    const g = Number.parseInt(c[2]! + c[2]!, 16);
    const b = Number.parseInt(c[3]! + c[3]!, 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

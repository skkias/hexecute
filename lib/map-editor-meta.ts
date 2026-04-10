import type {
  MapEditorMeta,
  MapLocationLabel,
  MapSpawnMarker,
} from "@/types/catalog";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultEditorMeta(): MapEditorMeta {
  return {
    show_reference_image: true,
    spawn_markers: [],
    location_labels: [],
  };
}

export function normalizeEditorMeta(raw: unknown): MapEditorMeta {
  const d = defaultEditorMeta();
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  if (typeof o.show_reference_image === "boolean") {
    d.show_reference_image = o.show_reference_image;
  }
  const spawns: MapSpawnMarker[] = [];
  if (Array.isArray(o.spawn_markers)) {
    for (const x of o.spawn_markers) {
      if (!x || typeof x !== "object") continue;
      const m = x as Record<string, unknown>;
      let id = typeof m.id === "string" && m.id ? m.id : newId();
      const sx = m.x;
      const sy = m.y;
      const side = m.side === "def" ? "def" : "atk";
      if (typeof sx === "number" && typeof sy === "number") {
        spawns.push({ id, side, x: sx, y: sy });
      }
    }
  }
  d.spawn_markers = spawns;
  const labels: MapLocationLabel[] = [];
  if (Array.isArray(o.location_labels)) {
    for (const x of o.location_labels) {
      if (!x || typeof x !== "object") continue;
      const m = x as Record<string, unknown>;
      let id = typeof m.id === "string" && m.id ? m.id : newId();
      const text =
        typeof m.text === "string" && m.text.trim() ? m.text.trim() : "Label";
      const lx = m.x;
      const ly = m.y;
      if (typeof lx === "number" && typeof ly === "number") {
        labels.push({ id, x: lx, y: ly, text });
      }
    }
  }
  d.location_labels = labels;
  return d;
}

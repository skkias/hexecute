import { NextResponse } from "next/server";
import { assertCoachGate } from "@/lib/coach-gate-server";
import { isValidUuid } from "@/lib/is-uuid";
import { persistMapUpdate } from "@/lib/map-persist-server";
import type { MapUpdatePayload } from "@/types/catalog";

/**
 * Reliable map save: full JSON body (no Server Actions / Flight serialization).
 * Lives under `/coach/api/*` so the coach cookie (`path: /coach`) is sent by the browser.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ mapId: string }> },
) {
  try {
    await assertCoachGate();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mapId } = await context.params;
  if (!isValidUuid(mapId)) {
    return NextResponse.json({ error: "Invalid map id." }, { status: 400 });
  }
  let payload: MapUpdatePayload;
  try {
    payload = (await req.json()) as MapUpdatePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    const result = await persistMapUpdate(mapId, payload);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({});
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

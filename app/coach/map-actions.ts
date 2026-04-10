"use server";

import { revalidatePath } from "next/cache";
import { assertCoachGate } from "@/lib/coach-gate-server";
import { persistMapUpdate } from "@/lib/map-persist-server";
import { createServiceSupabaseClient } from "@/lib/supabase-service";
import type { MapUpdatePayload } from "@/types/catalog";

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createMapAction(input: {
  name: string;
  slug?: string;
}): Promise<{ id?: string; error?: string }> {
  try {
    await assertCoachGate();
    const name = input.name.trim();
    if (!name) return { error: "Name is required." };
    const slug = slugify(input.slug ?? name);
    if (!slug) return { error: "Invalid slug." };
    const supabase = createServiceSupabaseClient();
    const { data, error } = await supabase
      .from("maps")
      .insert({
        name,
        slug,
        sort_order: 999,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/coach");
    revalidatePath("/coach/maps");
    return { id: data?.id as string };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create map." };
  }
}

export type { MapUpdatePayload } from "@/types/catalog";

/**
 * Legacy wrapper (e.g. reference image upload). Map editor uses POST `/coach/api/maps/[mapId]`.
 */
export async function updateMapAction(
  id: string,
  payloadJson: string,
): Promise<{ error?: string }> {
  try {
    await assertCoachGate();
    let payload: MapUpdatePayload;
    try {
      payload = JSON.parse(payloadJson) as MapUpdatePayload;
    } catch {
      return { error: "Invalid map save data." };
    }
    if (!payload || typeof payload !== "object") {
      return { error: "Invalid map save data." };
    }
    return await persistMapUpdate(id, payload);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update map." };
  }
}

export async function deleteMapAction(id: string): Promise<{ error?: string }> {
  try {
    await assertCoachGate();
    const supabase = createServiceSupabaseClient();
    const { error } = await supabase.from("maps").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/coach");
    revalidatePath("/coach/maps");
    revalidatePath("/");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete map." };
  }
}

export async function uploadMapReferenceImageAction(
  mapId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  try {
    await assertCoachGate();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return { error: "No file uploaded." };
    }
    const supabase = createServiceSupabaseClient();
    const name =
      file instanceof File && file.name
        ? file.name
        : `map-${Date.now()}.bin`;
    const safe = name.replace(/[^\w.-]/g, "_");
    const path = `coach/maps/${mapId}/ref-${Date.now()}-${safe}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const contentType =
      file instanceof File && file.type ? file.type : "application/octet-stream";
    const { error } = await supabase.storage
      .from("strat-images")
      .upload(path, buf, { contentType, upsert: true });
    if (error) return { error: error.message };
    const {
      data: { publicUrl },
    } = supabase.storage.from("strat-images").getPublicUrl(path);
    const up = await updateMapAction(
      mapId,
      JSON.stringify({ reference_image_url: publicUrl }),
    );
    if (up.error) return { error: up.error };
    return { url: publicUrl };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Upload failed",
    };
  }
}

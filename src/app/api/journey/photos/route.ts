import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createProgressPhoto,
  deleteProgressPhoto,
  updateProgressPhotoCaption,
} from "@/features/journey/queries";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import { isTenantPrefixedStoragePath } from "@/lib/tenant/storage-paths";
import { shouldUseMa5LiveData } from "@/lib/tenant/staging";

const createSchema = z.object({
  storagePath: z.string().min(1),
  caption: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  if (!isSupabasePublicConfigured()) {
    if (shouldUseMa5LiveData()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const storagePath = parsed.data.storagePath;
  const legacyOk = storagePath.startsWith(`journey/${session.id}/`);
  const tenantOk =
    storagePath.includes(`/members/${session.id}/`) &&
    isTenantPrefixedStoragePath(storagePath);
  if (!legacyOk && !tenantOk) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  try {
    const photo = await createProgressPhoto({
      userId: session.id,
      storagePath: parsed.data.storagePath,
      caption: parsed.data.caption ?? null,
    });
    return NextResponse.json({ photo });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save photo" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSupabasePublicConfigured()) {
    if (shouldUseMa5LiveData()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = z
    .object({
      photoId: z.string().uuid(),
      caption: z.string().max(500).nullable(),
    })
    .safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const photo = await updateProgressPhotoCaption({
      userId: session.id,
      photoId: parsed.data.photoId,
      caption: parsed.data.caption,
    });
    return NextResponse.json({ photo });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update photo" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSupabasePublicConfigured()) {
    if (shouldUseMa5LiveData()) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Not configured", demo: true }, { status: 503 });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const photoId = searchParams.get("photoId");
  if (!photoId) {
    return NextResponse.json({ error: "photoId required" }, { status: 400 });
  }

  try {
    await deleteProgressPhoto(session.id, photoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete photo" },
      { status: 500 },
    );
  }
}

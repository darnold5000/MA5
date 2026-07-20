import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MARKETING_GALLERY_COOKIE,
  parseMarketingGalleryStore,
  serializeMarketingGalleryStore,
} from "@/features/marketing-gallery/demo-store";
import {
  createMarketingGalleryItem,
  deleteMarketingGalleryItem,
  listMarketingGallery,
} from "@/features/marketing-gallery/queries";
import type { MarketingGallerySection } from "@/features/marketing-gallery/types";
import { getSessionUser } from "@/lib/auth/session";
import { BRAND_ASSETS_BUCKET } from "@/lib/assets/constants";
import { isSupabasePublicConfigured } from "@/lib/env";
import { canAccessAdmin } from "@/lib/permissions/roles";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

const sectionSchema = z.enum(["transformations", "community"]);

const createSchema = z.object({
  section: sectionSchema,
  storagePath: z.string().min(1),
  altText: z.string().max(240).optional(),
  clientName: z.string().max(80).nullable().optional(),
  featured: z.boolean().optional(),
});

function galleryCookieResponse(
  store: ReturnType<typeof parseMarketingGalleryStore>,
  body: unknown,
) {
  const response = NextResponse.json(body);
  response.cookies.set({
    name: MARKETING_GALLERY_COOKIE,
    value: serializeMarketingGalleryStore(store),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

async function requireAdmin() {
  const session =
    isSupabasePublicConfigured() && isSupabaseConfigured()
      ? await getSessionUser()
      : null;

  if (session && !canAccessAdmin(session.roles)) {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
    };
  }

  if (isSupabasePublicConfigured() && isSupabaseConfigured() && !session) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }

  return { session };
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");
  const parsedSection = sectionSchema.safeParse(section);
  if (!parsedSection.success) {
    return NextResponse.json({ error: "section required" }, { status: 400 });
  }

  const items = await listMarketingGallery(parsedSection.data);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { section, storagePath, altText, clientName, featured } = parsed.data;
  if (
    !storagePath.startsWith(`marketing/${section}/`) &&
    !storagePath.startsWith("demo:")
  ) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  try {
    const item = await createMarketingGalleryItem({
      section,
      storagePath,
      altText,
      clientName,
      featured,
    });

    if (!auth.session) {
      const jar = await import("next/headers").then((m) => m.cookies());
      const cookieStore = await jar;
      const store = parseMarketingGalleryStore(
        cookieStore.get(MARKETING_GALLERY_COOKIE)?.value,
      );
      store[section] = [item, ...store[section].filter((row) => row.id !== item.id)];
      return galleryCookieResponse(store, { item, warning: "Saved to demo store" });
    }

    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save photo" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    const { storagePath } = await deleteMarketingGalleryItem(id);

    if (
      storagePath &&
      !storagePath.startsWith("demo:") &&
      auth.session &&
      isSupabaseConfigured()
    ) {
      const supabase = await createClient();
      await supabase.storage.from(BRAND_ASSETS_BUCKET).remove([storagePath]);
    }

    if (!auth.session) {
      const jar = await import("next/headers").then((m) => m.cookies());
      const cookieStore = await jar;
      const store = parseMarketingGalleryStore(
        cookieStore.get(MARKETING_GALLERY_COOKIE)?.value,
      );
      for (const section of ["transformations", "community"] as const) {
        store[section] = store[section].filter((item) => item.id !== id);
      }
      return galleryCookieResponse(store, { ok: true, warning: "Removed from demo store" });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not delete photo" },
      { status: 500 },
    );
  }
}

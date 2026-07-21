import { NextResponse } from "next/server";

import { importMindbodyPaymentWorkbook } from "@/features/billing/import-mindbody-payments";
import { requireAdminSessionOrResponse } from "@/lib/auth/session";
import { isSupabasePublicConfigured } from "@/lib/env";
import {
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSupabasePublicConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase is not configured" },
      { status: 503 },
    );
  }

  const auth = await requireAdminSessionOrResponse();
  if (auth instanceof NextResponse) return auth;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to import payments" },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    return NextResponse.json(
      { error: "Upload an Excel file (.xlsx)" },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 12 MB)" },
      { status: 400 },
    );
  }

  const cutoffRaw = form.get("importBefore");
  const importBefore =
    typeof cutoffRaw === "string" && cutoffRaw.trim()
      ? new Date(cutoffRaw)
      : null;
  if (importBefore && Number.isNaN(importBefore.getTime())) {
    return NextResponse.json({ error: "Invalid import cutoff date" }, { status: 400 });
  }

  try {
    const buffer = await file.arrayBuffer();
    const admin = createServiceClient();
    const summary = await importMindbodyPaymentWorkbook(admin, buffer, {
      importBefore,
    });

    return NextResponse.json({ ok: true, ...summary });
  } catch (err) {
    console.error("[api/admin/payments/import]", err);
    return NextResponse.json(
      { error: "Could not import payment file" },
      { status: 500 },
    );
  }
}

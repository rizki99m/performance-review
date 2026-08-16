import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  createPerformanceReview,
  deletePerformanceReview,
  updatePerformanceReview,
} from "@/lib/server/repository";
import { errorResponse } from "@/lib/server/http";

export async function POST(r: Request) {
  try {
    const u = await requireAdmin();
    const id = await createPerformanceReview(await r.json(), u.id);

    return NextResponse.json({ id });
  } catch (e) {
    return errorResponse(
      e,
      "Review belum dapat dibuat. Periksa kembali seluruh field.",
    );
  }
}

export async function PATCH(r: Request) {
  try {
    await requireAdmin();

    const body = await r.json();

    await updatePerformanceReview(body);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Review belum dapat diperbarui.");
  }
}

export async function DELETE(r: Request) {
  try {
    await requireAdmin();

    await deletePerformanceReview(new URL(r.url).searchParams.get("id") || "");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Review belum dapat dihapus.");
  }
}

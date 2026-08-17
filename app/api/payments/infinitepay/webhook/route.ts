import { NextResponse } from "next/server";
import { confirmInfinitePayOrder } from "@/lib/infinitepay";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderNsu = String(body.order_nsu || "");
  const transactionNsu = String(body.transaction_nsu || "");
  const slug = String(body.invoice_slug || "");
  if (!orderNsu || !transactionNsu || !slug) {
    return NextResponse.json({ success: false, message: "Dados incompletos." }, { status: 400 });
  }
  try {
    await confirmInfinitePayOrder({
      orderNsu,
      transactionNsu,
      slug,
      receiptUrl: body.receipt_url ? String(body.receipt_url) : null,
    });
    return NextResponse.json({ success: true, message: null });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Falha ao confirmar." },
      { status: 400 },
    );
  }
}

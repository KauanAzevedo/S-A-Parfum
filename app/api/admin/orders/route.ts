import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const statuses = ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
export async function PATCH(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const id = String(body.id || ""); const status = statuses.find(value => value === body.status);
  if (!id || !status) return NextResponse.json({ error: "Pedido ou status inválido." }, { status: 400 });
  await prisma.order.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "STATUS_CHANGE", entity: "Order", entityId: id, metadata: { status } } });
  return NextResponse.json({ ok: true });
}

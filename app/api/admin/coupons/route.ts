import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const str = (value: unknown) => String(value ?? "").trim();
const serializeCoupon = <T extends { value: unknown; minimumAmount: unknown }>(coupon: T) => ({
  ...coupon,
  value: Number(coupon.value),
  minimumAmount: coupon.minimumAmount ? Number(coupon.minimumAmount) : null,
});
export async function POST(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const code = str(body.code).toUpperCase();
  if (!code || Number(body.value) <= 0) return NextResponse.json({ error: "Informe código e valor válidos." }, { status: 400 });
  const coupon = await prisma.coupon.create({ data: { code, type: body.type === "FIXED" ? "FIXED" : "PERCENTAGE", value: str(body.value), minimumAmount: str(body.minimumAmount) || null, usageLimit: body.usageLimit ? Number(body.usageLimit) : null, validUntil: body.validUntil ? new Date(str(body.validUntil)) : null, active: body.active !== false } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "CREATE", entity: "Coupon", entityId: coupon.id, metadata: { code } } });
  return NextResponse.json({ ok: true, coupon: serializeCoupon(coupon) });
}
export async function PATCH(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const id = str(body.id); if (!id) return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
  const coupon = await prisma.coupon.update({ where: { id }, data: { code: str(body.code).toUpperCase(), type: body.type === "FIXED" ? "FIXED" : "PERCENTAGE", value: str(body.value), minimumAmount: str(body.minimumAmount) || null, usageLimit: body.usageLimit ? Number(body.usageLimit) : null, validUntil: body.validUntil ? new Date(str(body.validUntil)) : null, active: body.active !== false } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: "UPDATE", entity: "Coupon", entityId: id } }); return NextResponse.json({ ok: true, coupon: serializeCoupon(coupon) });
}
export async function DELETE(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
  await prisma.coupon.delete({ where: { id } }); await prisma.auditLog.create({ data: { userId: admin.id, action: "DELETE", entity: "Coupon", entityId: id } }); return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const id = String(body.id || ""); const role = body.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
  if (!id || (id === admin.id && role !== "ADMIN")) return NextResponse.json({ error: "Você não pode remover o próprio acesso." }, { status: 400 });
  const user = await prisma.user.update({ where: { id }, data: { role } });
  await prisma.auditLog.create({ data: { userId: admin.id, action: role === "ADMIN" ? "PROMOTE" : "DEMOTE", entity: "User", entityId: id, metadata: { email: user.email } } });
  return NextResponse.json({ ok: true });
}

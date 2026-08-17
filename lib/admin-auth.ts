import { authenticatedCustomer } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";

export async function authenticatedAdmin(request: Request) {
  const user = await authenticatedCustomer(request);
  if (!user) return null;
  if (user.role === "ADMIN") return user;
  const bootstrapAdmins = String(process.env.ADMIN_EMAILS || "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!bootstrapAdmins.includes(user.email.toLowerCase())) return null;
  const promoted = await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await prisma.auditLog.create({ data: { userId: user.id, action: "BOOTSTRAP_ADMIN", entity: "User", entityId: user.id } });
  return promoted;
}

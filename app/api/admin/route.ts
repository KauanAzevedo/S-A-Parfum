import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await authenticatedAdmin(request);
  if (!admin) return NextResponse.json({ error: "Acesso administrativo não autorizado." }, { status: 403 });

  const [products, orders, coupons, users, auditLogs] = await Promise.all([
    prisma.product.findMany({ include: { category: true, images: { orderBy: { position: "asc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ include: { payment: true, items: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.coupon.findMany({ orderBy: { code: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.auditLog.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const paidOrders = orders.filter(order => ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status));
  const revenue = paidOrders.reduce((total, order) => total + Number(order.total), 0);
  const cost = paidOrders.reduce((total, order) => total + order.items.reduce((sum, item) => sum + Number(item.cost) * item.quantity, 0), 0);

  return NextResponse.json({
    admin: { id: admin.id, name: admin.name, email: admin.email },
    metrics: { revenue, profit: revenue - cost, orders: orders.length, pendingOrders: orders.filter(order => order.status === "PENDING_PAYMENT").length, products: products.length, activeProducts: products.filter(product => product.status === "ACTIVE").length, lowStock: products.filter(product => product.stock <= product.minimumStock).length, customers: users.filter(user => user.role === "CUSTOMER").length },
    products: products.map(product => ({ ...product, price: Number(product.price), compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null, cost: Number(product.cost) })),
    orders: orders.map(order => ({ ...order, source:typeof order.address==="object"&&order.address!==null&&!Array.isArray(order.address)&&(order.address as Record<string,unknown>).channel==="EXTERNAL"?"EXTERNAL":"SITE", subtotal: Number(order.subtotal), discount: Number(order.discount), shippingCost: Number(order.shippingCost), total: Number(order.total), payment: order.payment ? { ...order.payment, amount: Number(order.payment.amount) } : null, items: order.items.map(item => ({ ...item, unitPrice: Number(item.unitPrice), cost: Number(item.cost) })) })),
    coupons: coupons.map(coupon => ({ ...coupon, value: Number(coupon.value), minimumAmount: coupon.minimumAmount ? Number(coupon.minimumAmount) : null })),
    users,
    auditLogs,
  });
}

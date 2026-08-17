import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const paymentMethods = ["PIX", "CASH", "CREDIT_CARD", "DEBIT_CARD", "TRANSFER"] as const;
const cents = (value: unknown) => Math.round(Math.max(0, Number(value) || 0) * 100);

export async function POST(request: Request) {
  const admin = await authenticatedAdmin(request);
  if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const customerName = String(body.customerName || "").trim();
  const customerEmail = String(body.customerEmail || "").trim().toLowerCase();
  const customerPhone = String(body.customerPhone || "").replace(/\D/g, "");
  const customerCpf = String(body.customerCpf || "").replace(/\D/g, "");
  const discountCents = cents(body.discount);
  const rawItems: Array<Record<string, unknown>> = Array.isArray(body.items) ? body.items : [];
  const rawPayments: Array<Record<string, unknown>> = Array.isArray(body.payments) ? body.payments : [];

  if (customerName.length < 2) return NextResponse.json({ error: "Informe o nome do cliente." }, { status: 400 });
  if (!rawItems.length) return NextResponse.json({ error: "Adicione pelo menos um perfume à venda." }, { status: 400 });

  const items = rawItems.map((item) => ({
    productId: String(item.productId || ""),
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPriceCents: cents(item.unitPrice),
  }));
  if (items.some((item) => !item.productId || item.unitPriceCents <= 0))
    return NextResponse.json({ error: "Revise os perfumes e os preços presenciais." }, { status: 400 });

  const quantities = new Map<string, number>();
  for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  const products = await prisma.product.findMany({ where: { id: { in: [...quantities.keys()] }, status: "ACTIVE" } });
  if (products.length !== quantities.size)
    return NextResponse.json({ error: "Um dos perfumes não está mais disponível." }, { status: 409 });
  const productsById = new Map(products.map((product) => [product.id, product]));
  for (const product of products) {
    if (product.stock < (quantities.get(product.id) || 0))
      return NextResponse.json({ error: `Estoque insuficiente para ${product.name}.` }, { status: 409 });
  }

  const subtotalCents = items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
  if (discountCents > subtotalCents)
    return NextResponse.json({ error: "O desconto não pode superar o valor dos produtos." }, { status: 400 });

  const payments = rawPayments.map((payment) => {
    const candidate = String(payment.method);
    const method = paymentMethods.includes(candidate as typeof paymentMethods[number])
      ? candidate as typeof paymentMethods[number]
      : "PIX";
    return {
      method,
      amountCents: cents(payment.amount),
      installments: method === "CREDIT_CARD" ? Math.min(24, Math.max(1, Math.floor(Number(payment.installments) || 1))) : 1,
      customerFeeCents: cents(payment.customerFee),
      operatorFeeCents: cents(payment.operatorFee),
      status: payment.status === "PENDING" ? "PENDING" as const : "PAID" as const,
    };
  });
  if (!payments.length || payments.some((payment) => payment.amountCents <= 0))
    return NextResponse.json({ error: "Informe pelo menos uma forma de pagamento com valor válido." }, { status: 400 });

  const customerFeeCents = payments.reduce((total, payment) => total + payment.customerFeeCents, 0);
  const operatorFeeCents = payments.reduce((total, payment) => total + payment.operatorFeeCents, 0);
  const baseTotalCents = subtotalCents - discountCents;
  const chargedTotalCents = baseTotalCents + customerFeeCents;
  const receivedTotalCents = payments.reduce((total, payment) => total + payment.amountCents, 0);
  if (receivedTotalCents !== chargedTotalCents)
    return NextResponse.json({ error: `A soma dos pagamentos deve ser R$ ${(chargedTotalCents / 100).toFixed(2).replace(".", ",")}.` }, { status: 400 });

  const paid = payments.every((payment) => payment.status === "PAID");
  const number = `EXT-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`.toUpperCase();
  const linkedCustomer = customerEmail ? await prisma.user.findUnique({ where: { email: customerEmail }, select: { id: true } }) : null;

  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const product of products) {
        const quantity = quantities.get(product.id) || 0;
        const updated = await tx.product.updateMany({ where: { id: product.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (!updated.count) throw new Error(`Estoque insuficiente para ${product.name}.`);
      }
      const created = await tx.order.create({
        data: {
          number, customerId: linkedCustomer?.id, customerName,
          customerEmail: customerEmail || `venda-externa-${number.toLowerCase()}@local`, customerCpf, customerPhone,
          status: paid ? "PAID" : "PENDING_PAYMENT", subtotal: subtotalCents / 100, discount: discountCents / 100,
          total: chargedTotalCents / 100, shippingCost: 0,
          address: {
            channel: "EXTERNAL",
            saleChannel: ["PRESENCIAL", "WHATSAPP", "INDICACAO", "OUTRO"].includes(String(body.saleChannel)) ? String(body.saleChannel) : "PRESENCIAL",
            transactionReference: String(body.transactionReference || "").trim(),
            notes: String(body.notes || "").trim(),
            registeredBy: admin.id,
          },
          items: { create: items.map((item) => { const product = productsById.get(item.productId)!; return { productId: item.productId, sku: product.sku, name: product.name, quantity: item.quantity, unitPrice: item.unitPriceCents / 100, cost: product.cost }; }) },
          payment: { create: {
            provider: "MANUAL", status: paid ? "PAID" : "PENDING", amount: chargedTotalCents / 100,
            method: payments.length > 1 ? "MIXED" : payments[0].method,
            raw: {
              channel: "EXTERNAL", baseTotal: baseTotalCents / 100, customerFee: customerFeeCents / 100,
              operatorFee: operatorFeeCents / 100, netExpected: (chargedTotalCents - operatorFeeCents) / 100,
              payments: payments.map((payment) => ({ method: payment.method, amount: payment.amountCents / 100, installments: payment.installments, customerFee: payment.customerFeeCents / 100, operatorFee: payment.operatorFeeCents / 100, status: payment.status })),
            },
          } },
        },
      });
      await tx.auditLog.create({ data: { userId: admin.id, action: "EXTERNAL_SALE_CREATED", entity: "Order", entityId: created.id, metadata: { number, baseTotal: baseTotalCents / 100, chargedTotal: chargedTotalCents / 100, operatorFee: operatorFeeCents / 100, paymentMethods: payments.map((payment) => payment.method), paid } } });
      return created;
    });
    return NextResponse.json({ ok: true, orderNumber: order.number });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível registrar a venda." }, { status: 409 });
  }
}

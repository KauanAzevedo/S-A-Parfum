import { prisma } from "@/lib/prisma";

const API_URL = "https://api.checkout.infinitepay.io";

export const INFINITEPAY_HANDLE =
  process.env.INFINITEPAY_HANDLE?.trim() || "s_a-parfum";

type PaymentCheck = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  installments?: number;
  capture_method?: string;
};

export async function createInfinitePayLink(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/links`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ handle: INFINITEPAY_HANDLE, ...payload }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as { url?: string; message?: string };
  let checkoutUrl: URL | null = null;
  try {
    checkoutUrl = body.url ? new URL(body.url) : null;
  } catch {
    checkoutUrl = null;
  }
  const allowedCheckoutHosts = new Set([
    "checkout.infinitepay.io",
    "checkout.infinitepay.com.br",
  ]);
  if (
    !response.ok ||
    !checkoutUrl ||
    checkoutUrl.protocol !== "https:" ||
    !allowedCheckoutHosts.has(checkoutUrl.hostname)
  ) {
    throw new Error(body.message || "A InfinitePay não conseguiu criar o pagamento.");
  }
  return checkoutUrl.toString();
}

export async function checkInfinitePayPayment(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
}) {
  const response = await fetch(`${API_URL}/payment_check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      handle: INFINITEPAY_HANDLE,
      order_nsu: input.orderNsu,
      transaction_nsu: input.transactionNsu,
      slug: input.slug,
    }),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as PaymentCheck;
  if (!response.ok || body.success !== true) {
    throw new Error("Não foi possível confirmar o pagamento na InfinitePay.");
  }
  return body;
}

export async function confirmInfinitePayOrder(input: {
  orderNsu: string;
  transactionNsu: string;
  slug: string;
  receiptUrl?: string | null;
}) {
  const order = await prisma.order.findUnique({
    where: { number: input.orderNsu },
    include: { payment: true },
  });
  if (!order?.payment || order.payment.provider !== "INFINITEPAY") {
    throw new Error("Pedido não encontrado.");
  }
  if (order.payment.status === "PAID") {
    if (order.payment.externalId !== input.transactionNsu) {
      throw new Error("A transação não corresponde ao pagamento registrado.");
    }
    return order;
  }
  if (order.payment.status !== "PENDING" || order.status === "CANCELLED") {
    throw new Error("O prazo de pagamento deste pedido expirou.");
  }

  const checked = await checkInfinitePayPayment(input);
  if (!checked.paid) throw new Error("Pagamento ainda não aprovado.");

  const captureMethod = String(checked.capture_method || "").toLowerCase();
  if (!['pix', 'credit_card'].includes(captureMethod)) {
    throw new Error("Forma de pagamento não reconhecida.");
  }
  const fullAmount = Math.round(Number(order.subtotal) * 100);
  const pixAmount = Math.round(fullAmount * 0.92);
  const confirmedAmount = Number(checked.amount);
  const allowedAmounts = captureMethod === "pix" ? [pixAmount, fullAmount] : [fullAmount];
  if (!allowedAmounts.includes(confirmedAmount)) {
    throw new Error("O valor confirmado não corresponde ao pedido.");
  }

  return prisma.$transaction(async (tx) => {
    const paid = await tx.payment.updateMany({
      where: { id: order.payment!.id, status: "PENDING" },
      data: {
        status: "PAID",
        method: captureMethod === "pix" ? "PIX" : "CREDIT_CARD",
        externalId: input.transactionNsu,
        amount: confirmedAmount / 100,
        raw: {
          slug: input.slug,
          transactionNsu: input.transactionNsu,
          receiptUrl: input.receiptUrl || null,
          installments: checked.installments || 1,
          captureMethod,
          amount: checked.amount,
          paidAmount: checked.paid_amount,
          confirmedAt: new Date().toISOString(),
        },
      },
    });
    if (!paid.count) {
      const current = await tx.payment.findUnique({ where: { id: order.payment!.id } });
      if (current?.status !== "PAID") {
        throw new Error("O prazo de pagamento deste pedido expirou.");
      }
      return tx.order.findUniqueOrThrow({ where: { id: order.id } });
    }
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        discount: captureMethod === "pix" ? (fullAmount - confirmedAmount) / 100 : 0,
        total: confirmedAmount / 100,
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
}

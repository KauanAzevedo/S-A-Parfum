import { prisma } from "@/lib/prisma";

export const PAYMENT_EXPIRATION_MINUTES = 30;

export async function cancelExpiredPendingOrders(now = new Date()) {
  const expiresBefore = new Date(
    now.getTime() - PAYMENT_EXPIRATION_MINUTES * 60 * 1000,
  );
  const expiredOrders = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { lte: expiresBefore },
      payment: { is: { provider: "INFINITEPAY", status: "PENDING" } },
    },
    select: {
      id: true,
      number: true,
      items: { select: { productId: true, quantity: true } },
      payment: { select: { id: true } },
    },
  });

  let cancelled = 0;
  for (const order of expiredOrders) {
    if (!order.payment) continue;
    await prisma.$transaction(async (tx) => {
      // Only one transition can win: either the webhook confirms this payment
      // or the timeout changes the still-pending payment to cancelled.
      const payment = await tx.payment.updateMany({
        where: { id: order.payment!.id, status: "PENDING" },
        data: {
          status: "CANCELLED",
          raw: {
            cancellationReason: "PAYMENT_TIMEOUT",
            cancelledAt: now.toISOString(),
            expirationMinutes: PAYMENT_EXPIRATION_MINUTES,
          },
        },
      });
      if (!payment.count) return;

      const updatedOrder = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
      });
      if (!updatedOrder.count) return;

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.auditLog.create({
        data: {
          action: "PAYMENT_TIMEOUT",
          entity: "Order",
          entityId: order.id,
          metadata: {
            orderNumber: order.number,
            expirationMinutes: PAYMENT_EXPIRATION_MINUTES,
          },
        },
      });
      cancelled += 1;
    });
  }
  return cancelled;
}

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { createInfinitePayLink } from "@/lib/infinitepay";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await authenticatedCustomer(request);
  if (!user)
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const addressId = String(body.addressId || "");
  if (body.acceptedTerms !== true)
    return NextResponse.json(
      { error: "É necessário aceitar os termos e as políticas da compra." },
      { status: 400 },
    );
  const [profile, address, cart] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.address.findFirst({ where: { id: addressId, userId: user.id } }),
    prisma.cart.findFirst({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    }),
  ]);
  if (!profile || !profile.cpf || !profile.phone)
    return NextResponse.json(
      { error: "Complete CPF e telefone no seu cadastro antes de finalizar." },
      { status: 400 },
    );
  if (!address)
    return NextResponse.json(
      { error: "Selecione um endereço de entrega válido." },
      { status: 400 },
    );
  if (!cart?.items.length)
    return NextResponse.json(
      { error: "Seu carrinho está vazio." },
      { status: 400 },
    );
  for (const item of cart.items) {
    if (item.product.status !== "ACTIVE" || item.product.stock < item.quantity)
      return NextResponse.json(
        {
          error: `O perfume ${item.product.name} possui apenas ${item.product.stock} unidade${item.product.stock === 1 ? "" : "s"} em estoque.`,
        },
        { status: 409 },
      );
  }
  const subtotal = cart.items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const total = subtotal;
  const number =
    `SA-${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`.toUpperCase();
  try {
    const order = await prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (!updated.count)
          throw new Error(
            `Estoque atualizado para ${item.product.name}. Revise o carrinho.`,
          );
      }
      const created = await tx.order.create({
        data: {
          number,
          customerId: user.id,
          customerName: profile.name,
          customerEmail: profile.email,
          customerCpf: profile.cpf || "",
          customerPhone: profile.phone || "",
          status: "PENDING_PAYMENT",
          subtotal,
          discount: 0,
          total,
          shippingCost: 0,
          address: {
            zipCode: address.zipCode,
            street: address.street,
            number: address.number,
            complement: address.complement,
            district: address.district,
            city: address.city,
            state: address.state,
          },
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              sku: item.product.sku,
              name: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              cost: item.product.cost,
            })),
          },
          payment: {
            create: {
              provider: "INFINITEPAY",
              status: "PENDING",
              amount: total,
              method: null,
              raw: {
                termsAcceptedAt: new Date().toISOString(),
                termsVersion: "2026-08-16",
              },
            },
          },
        },
      });
      return created;
    });
    const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    let paymentUrl: string;
    try {
      paymentUrl = await createInfinitePayLink({
        redirect_url: `${origin}/pagamento/retorno`,
        webhook_url: `${origin}/api/payments/infinitepay/webhook`,
        order_nsu: order.number,
        customer: {
          name: profile.name,
          email: profile.email,
          phone_number: profile.phone,
        },
        address: {
          cep: address.zipCode.replace(/\D/g, ""),
          street: address.street,
          neighborhood: address.district,
          number: address.number,
          complement: address.complement || undefined,
        },
        items: cart.items.map((item) => ({
          quantity: item.quantity,
          price: Math.round(Number(item.product.price) * 100),
          description: `${item.product.brand} ${item.product.name} ${item.product.volume}`,
        })),
      });
    } catch (providerError) {
      await prisma.$transaction(async (tx) => {
        for (const item of cart.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
        await tx.payment.update({
          where: { orderId: order.id },
          data: {
            status: "FAILED",
            raw: { providerError: providerError instanceof Error ? providerError.message : "Falha na InfinitePay" },
          },
        });
      });
      throw providerError;
    }
    await prisma.$transaction([
      prisma.payment.update({
        where: { orderId: order.id },
        data: { raw: { checkoutUrl: paymentUrl, termsAcceptedAt: new Date().toISOString(), termsVersion: "2026-08-16" } },
      }),
      prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
    ]);
    return NextResponse.json({
      ok: true,
      orderNumber: order.number,
      total,
      paymentUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o pedido.",
      },
      { status: 409 },
    );
  }
}

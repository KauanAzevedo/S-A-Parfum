import { CheckCircle2, Clock3 } from "lucide-react";
import { confirmInfinitePayOrder } from "@/lib/infinitepay";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PaymentReturnPage({ searchParams }: Props) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] : "";
  const orderNsu = value("order_nsu");
  let paid = false;
  if (orderNsu && value("transaction_nsu") && value("slug")) {
    try {
      await confirmInfinitePayOrder({
        orderNsu,
        transactionNsu: value("transaction_nsu"),
        slug: value("slug"),
        receiptUrl: value("receipt_url") || null,
      });
      paid = true;
    } catch {
      paid = false;
    }
  }
  return (
    <main className="payment-return">
      <section>
        {paid ? <CheckCircle2 /> : <Clock3 />}
        <p className="eyebrow">S&amp;A Parfum</p>
        <h1>{paid ? "Pagamento confirmado" : "Pagamento em confirmação"}</h1>
        <p>{paid ? `Seu pedido ${orderNsu} foi pago com sucesso.` : "Estamos consultando a confirmação da InfinitePay. O pedido será atualizado automaticamente."}</p>
        <div><a href="/conta?secao=pedidos">Acompanhar pedido</a><a href="/perfumes">Voltar à loja</a></div>
      </section>
    </main>
  );
}

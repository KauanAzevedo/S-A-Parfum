"use client";

import {
  Check,
  ChevronRight,
  CreditCard,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type Address = {
  id: string;
  label: string;
  recipient: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
};
type Account = {
  profile: {
    name: string;
    email: string;
    cpf?: string | null;
    phone?: string | null;
  };
  addresses: Address[];
};
type CartItem = {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
    brand: string;
    volume: string;
    image: string;
    slug: string;
    stock: number;
  };
};
export function CheckoutForm() {
  const [account, setAccount] = useState<Account | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [addressId, setAddressId] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  async function sessionToken() {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session?.access_token) {
      window.location.href = `/entrar?retorno=${encodeURIComponent("/checkout")}`;
      return null;
    }
    return data.session.access_token;
  }
  useEffect(() => {
    void (async () => {
      const token = await sessionToken();
      if (!token) return;
      const headers = { authorization: `Bearer ${token}` };
      const [accountResponse, cartResponse] = await Promise.all([
        fetch("/api/account", { headers, cache: "no-store" }),
        fetch("/api/cart", { headers, cache: "no-store" }),
      ]);
      if (accountResponse.status === 401 || cartResponse.status === 401) {
        window.location.href = `/entrar?retorno=${encodeURIComponent("/checkout")}`;
        return;
      }
      const [a, c] = await Promise.all([
        accountResponse.json(),
        cartResponse.json(),
      ]);
      setAccount(a);
      setItems(c.items || []);
      const preferred =
        (a.addresses || []).find((address: Address) => address.isDefault) ||
        (a.addresses || [])[0];
      setAddressId(preferred?.id || "");
      setLoading(false);
    })();
  }, []);
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );
  const pixTotal = subtotal * 0.95;
  async function finish() {
    if (!addressId) {
      setError("Selecione ou cadastre um endereço de entrega.");
      return;
    }
    if (!acceptedTerms) {
      setError(
        "Leia e aceite os termos e as políticas para finalizar a compra.",
      );
      return;
    }
    const token = await sessionToken();
    if (!token) return;
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ addressId, acceptedTerms }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Não foi possível finalizar o pedido.");
      setSubmitting(false);
      return;
    }
    window.dispatchEvent(new Event("sa:commerce-updated"));
    window.location.href = body.paymentUrl;
  }
  if (loading)
    return (
      <div className="commerce-loading">Preparando seu checkout seguro…</div>
    );
  if (!items.length)
    return (
      <div className="empty-cart">
        <ShoppingBag />
        <h2>Não há produtos para finalizar.</h2>
        <a href="/perfumes">Voltar à loja</a>
      </div>
    );
  return (
    <>
      <div className="checkout-progress">
        <span className="done">
          <Check /> Carrinho
        </span>
        <i />
        <span className="active">2 Endereço e pagamento</span>
        <i />
        <span>3 Confirmação</span>
      </div>
      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
      <div className="checkout-flow">
        <div className="checkout-customer">
          <section className="checkout-card customer-card">
            <header>
              <Check />
              <div>
                <h2>Dados pessoais</h2>
                <p>Informações vinculadas à sua conta</p>
              </div>
            </header>
            <dl>
              <div>
                <dt>Nome</dt>
                <dd>{account?.profile.name}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{account?.profile.email}</dd>
              </div>
              <div>
                <dt>CPF</dt>
                <dd>{account?.profile.cpf || "Não informado"}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{account?.profile.phone || "Não informado"}</dd>
              </div>
            </dl>
            {(!account?.profile.cpf || !account?.profile.phone) && (
              <a className="checkout-edit-link" href="/conta">
                Completar cadastro <ChevronRight />
              </a>
            )}
          </section>
          <section className="checkout-card address-card">
            <header>
              <MapPin />
              <div>
                <h2>Endereço de entrega</h2>
                <p>Escolha onde deseja receber seu pedido</p>
              </div>
            </header>
            {account?.addresses.length ? (
              account.addresses.map((address) => (
                <label
                  className={
                    addressId === address.id
                      ? "address-option selected"
                      : "address-option"
                  }
                  key={address.id}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                  />
                  <span>
                    <b>{address.label || address.recipient}</b>
                    <small>
                      {address.street}, {address.number}
                      {address.complement ? ` · ${address.complement}` : ""}
                    </small>
                    <small>
                      {address.district} · {address.city}/{address.state}
                    </small>
                    <small>CEP {address.zipCode}</small>
                  </span>
                </label>
              ))
            ) : (
              <p className="checkout-empty-address">
                Você ainda não possui um endereço cadastrado.
              </p>
            )}
            <a className="checkout-edit-link" href="/conta">
              {account?.addresses.length
                ? "Gerenciar endereços"
                : "Adicionar endereço"}{" "}
              <ChevronRight />
            </a>
            <div className="free-delivery">
              <PackageCheck />
              <span>
                <b>Entrega gratuita</b>
                <small>
                  Prazo exibido após a integração com a transportadora
                </small>
              </span>
            </div>
          </section>
        </div>
        <section className="checkout-card payment-card">
          <header>
            <CreditCard />
            <div>
              <h2>Pagamento</h2>
              <p>Escolha como deseja pagar</p>
            </div>
          </header>
          <div className="payment-option selected">
            <span>
              <b>Pix</b>
              <small>5% de desconto</small>
            </span>
            <strong>{money(pixTotal)}</strong>
          </div>
          <div className="payment-option">
            <span>
              <b>Cartão de crédito</b>
              <small>Em até 4x sem juros</small>
            </span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="payment-notice">
            <Sparkles />
            <p>
              <b>Pagamento seguro</b> Você escolherá Pix ou cartão no ambiente
              protegido da InfinitePay.
            </p>
          </div>
        </section>
        <aside className="checkout-card order-summary">
          <header>
            <ShoppingBag />
            <h2>Resumo do pedido</h2>
          </header>
          <div className="checkout-products">
            {items.map((item) => (
              <div key={item.id}>
                <img src={item.product.image} alt="" />
                <span>
                  <b>{item.product.name}</b>
                  <small>
                    {item.quantity} × {item.product.volume}
                  </small>
                </span>
                <strong>{money(item.unitPrice * item.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="summary-line">
            <span>Produtos</span>
            <b>{money(subtotal)}</b>
          </div>
          <div className="summary-line">
            <span>Entrega</span>
            <b>Grátis</b>
          </div>
          <div className="checkout-total">
            <span>Cartão</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-line discount">
            <span>Pix com 5% de desconto</span>
            <b>{money(pixTotal)}</b>
          </div>
          <label className="checkout-terms">
            <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
            <span>Li e aceito os <a href="/termos-de-uso" target="_blank">Termos de Uso e Compra</a>, a <a href="/politica-de-entrega" target="_blank">Política de Entrega</a>, a <a href="/trocas-e-devolucoes" target="_blank">Política de Trocas e Devoluções</a> e a <a href="/politica-de-privacidade" target="_blank">Política de Privacidade</a>.</span>
          </label>
          <button onClick={finish} disabled={submitting || !addressId || !acceptedTerms}>
            {submitting ? "Abrindo pagamento…" : "Ir para pagamento seguro"}
          </button>
          <small className="checkout-disclaimer">
            Ao finalizar, você confirma os dados deste pedido.
          </small>
        </aside>
      </div>
    </>
  );
}

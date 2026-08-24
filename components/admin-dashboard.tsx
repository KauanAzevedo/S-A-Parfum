"use client";

import {
  BadgeDollarSign,
  DollarSign,
  Home,
  LogOut,
  Package,
  Pencil,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

type Tab =
  | "overview"
  | "products"
  | "orders"
  | "sales"
  | "finance"
  | "coupons"
  | "access";
type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  gender: string;
  volume: string;
  description: string;
  family: string;
  notes: string[];
  price: number;
  inPersonPrice: number;
  compareAtPrice?: number;
  cost: number;
  stock: number;
  minimumStock: number;
  imageUrl: string;
  images: Array<{ id: string; url: string; position: number }>;
  status: string;
  featured: boolean;
  category: { name: string };
};
type Order = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  status: string;
  source: "SITE" | "EXTERNAL";
  total: number;
  createdAt: string;
  payment?: { status: string; method?: string } | null;
  items: Array<{ name: string; quantity: number }>;
};
type Coupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minimumAmount?: number;
  usageLimit?: number;
  usageCount: number;
  validUntil?: string;
  active: boolean;
};
type User = {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  role: string;
  createdAt: string;
};
type AdminData = {
  admin: { id: string; name: string; email: string };
  metrics: {
    revenue: number;
    profit: number;
    orders: number;
    pendingOrders: number;
    products: number;
    activeProducts: number;
    lowStock: number;
    customers: number;
  };
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  users: User[];
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    user?: { name: string } | null;
  }>;
};
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const orderLabels: Record<string, string> = {
  PENDING_PAYMENT: "Aguardando pagamento",
  PAID: "Pago",
  PREPARING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [savingSale, setSavingSale] = useState(false);
  const [saleFormKey, setSaleFormKey] = useState(0);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const { data: session } =
      await getSupabaseBrowserClient().auth.getSession();
    const token = session.session?.access_token;
    if (!token) {
      window.location.href = "/entrar";
      return new Response(JSON.stringify({ error: "Sessão encerrada" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (!(init?.body instanceof FormData))
      headers.set("content-type", "application/json");
    return fetch(path, { ...init, headers });
  }, []);
  const load = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const response = await request("/api/admin");
      if (response.status === 403) {
        window.location.replace("/conta");
        return;
      }
      if (!response.ok) {
        setNotice("Não foi possível carregar o painel.");
        return;
      }
      setData(await response.json());
    } catch {
      setNotice("Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [request]);
  useEffect(() => {
    load();
    const refresh = window.setInterval(() => {
      void load(true);
    }, 60_000);
    return () => window.clearInterval(refresh);
  }, [load]);
  useEffect(() => {
    const tabs: Tab[] = [
      "overview",
      "products",
      "orders",
      "sales",
      "finance",
      "coupons",
      "access",
    ];
    const sync = () => {
      const value = window.location.hash.slice(1) as Tab;
      if (tabs.includes(value)) setTab(value);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  function openTab(value: Tab) {
    setTab(value);
    setNotice("");
    window.location.hash = value;
  }
  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  }
  async function mutate(path: string, method: string, body?: object) {
    setNotice("");
    const response = await request(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      setNotice(result.error || "Não foi possível concluir a ação.");
      return false;
    }
    setNotice("Alteração salva com sucesso.");
    await load();
    return true;
  }
  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setSavingProduct(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const newImages = formData
      .getAll("images")
      .filter(
        (value): value is File => value instanceof File && value.size > 0,
      );
    let imageUrls: string[] = JSON.parse(
      String(formData.get("existingImages") || "[]"),
    );
    if (imageUrls.length + newImages.length > 8) {
      setNotice("Use no máximo 8 imagens por perfume.");
      setSavingProduct(false);
      return;
    }
    if (newImages.length) {
      for (const image of newImages) {
        const upload = new FormData();
        upload.append("images", image);
        const response = await request("/api/admin/product-image", {
          method: "POST",
          body: upload,
        });
        const result = await response.json();
        if (!response.ok) {
          setNotice(result.error || "Não foi possível enviar as imagens.");
          setSavingProduct(false);
          return;
        }
        imageUrls.push(...result.urls);
      }
    }
    formData.delete("images");
    formData.delete("existingImages");
    const body = {
      ...Object.fromEntries(formData),
      id: editingProduct?.id,
      imageUrls,
      featured: formData.has("featured"),
    };
    if (
      await mutate(
        "/api/admin/products",
        editingProduct ? "PATCH" : "POST",
        body,
      )
    ) {
      setEditingProduct(null);
      form.reset();
    }
    setSavingProduct(false);
  }
  async function saveCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const body = {
      ...Object.fromEntries(formData),
      id: editingCoupon?.id,
      active: formData.has("active"),
    };
    if (
      await mutate("/api/admin/coupons", editingCoupon ? "PATCH" : "POST", body)
    ) {
      setEditingCoupon(null);
      form.reset();
    }
  }
  async function saveExternalSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSale(true);
    const formData = new FormData(event.currentTarget);
    const body = {
      ...Object.fromEntries(formData),
      items: JSON.parse(String(formData.get("items") || "[]")),
      payments: JSON.parse(String(formData.get("payments") || "[]")),
    };
    if (await mutate("/api/admin/external-sales", "POST", body))
      setSaleFormKey((value) => value + 1);
    setSavingSale(false);
  }
  if (loading)
    return (
      <main className="admin-loading">Carregando painel administrativo…</main>
    );
  if (!data)
    return (
      <main className="admin-denied">
        <h1>Acesso restrito</h1>
        <p>{notice}</p>
        <a href="/conta">Voltar para minha conta</a>
      </main>
    );
  const menu: Array<[Tab, string, typeof Home]> = [
    ["overview", "Visão geral", Home],
    ["products", "Perfumes", Package],
    ["orders", "Pedidos", ShoppingBag],
    ["sales", "Vendas externas", BadgeDollarSign],
    ["finance", "Financeiro", DollarSign],
    ["coupons", "Cupons", Tag],
    ["access", "Acessos", UserRound],
  ];
  return (
    <main className="admin-page">
      <aside className="admin-sidebar">
        <a
          className="admin-brand"
          href="/"
          aria-label="S&A Parfum - ir para a loja"
        >
          <img src="/logo-sa-footer.png" alt="S&A Parfum" />
          <span>Administração</span>
        </a>
        <nav aria-label="Menu administrativo">
          {menu.map(([key, label, Icon]) => (
            <button
              type="button"
              key={key}
              className={tab === key ? "active" : ""}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => openTab(key)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-user">
          <span>Conectado como</span>
          <b>{data.admin.name}</b>
          <button onClick={logout}>
            <LogOut /> Sair
          </button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-top">
          <div>
            <p className="eyebrow">Painel administrativo</p>
            <h1>{menu.find(([key]) => key === tab)?.[1]}</h1>
          </div>
          <a href="/">Ver loja</a>
        </header>
        {notice && <p className="admin-notice">{notice}</p>}
        {tab === "overview" && (
          <>
            <div className="admin-metrics">
              <Metric label="Faturamento" value={money(data.metrics.revenue)} />
              <Metric
                label="Lucro estimado"
                value={money(data.metrics.profit)}
              />
              <Metric label="Pedidos" value={String(data.metrics.orders)} />
              <Metric
                label="Pedidos pendentes"
                value={String(data.metrics.pendingOrders)}
              />
              <Metric
                label="Perfumes ativos"
                value={`${data.metrics.activeProducts}/${data.metrics.products}`}
              />
              <Metric
                label="Estoque baixo"
                value={String(data.metrics.lowStock)}
                alert={data.metrics.lowStock > 0}
              />
              <Metric label="Clientes" value={String(data.metrics.customers)} />
            </div>
            <div className="admin-overview-grid">
              <section className="admin-panel">
                <h2>Pedidos recentes</h2>
                <OrderTable
                  orders={data.orders.slice(0, 6)}
                  onStatus={(id, status) =>
                    mutate("/api/admin/orders", "PATCH", { id, status })
                  }
                />
              </section>
              <section className="admin-panel">
                <h2>Atividade recente</h2>
                <div className="audit-list">
                  {data.auditLogs.map((log) => (
                    <article key={log.id}>
                      <b>{log.action}</b>
                      <span>
                        {log.entity} · {log.user?.name || "Sistema"}
                      </span>
                      <small>
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
        {tab === "products" && (
          <div className="admin-split">
            <section className="admin-panel admin-form-panel">
              <h2>{editingProduct ? "Editar perfume" : "Cadastrar perfume"}</h2>
              <ProductForm
                key={editingProduct?.id || "new"}
                product={editingProduct}
                saving={savingProduct}
                onSubmit={saveProduct}
                onCancel={() => setEditingProduct(null)}
              />
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Perfumes cadastrados</h2>
                <span>{data.products.length} itens</span>
              </div>
              <div className="admin-product-list">
                {data.products.map((product) => (
                  <article key={product.id}>
                    <img src={product.imageUrl} alt="" />
                    <div>
                      <small>
                        {product.brand} · {product.category.name}
                      </small>
                      <h3>{product.name}</h3>
                      <p>
                        {money(product.price)} · Estoque {product.stock}
                      </p>
                      <span
                        className={`admin-status ${product.status.toLowerCase()}`}
                      >
                        {product.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                      {product.featured && (
                        <span className="admin-featured">
                          <Star /> Destaque
                        </span>
                      )}
                    </div>
                    <div className="admin-row-actions">
                      <button
                        onClick={() => setEditingProduct(product)}
                        aria-label="Editar"
                      >
                        <Pencil />
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Remover ${product.name}?`) &&
                          mutate(
                            `/api/admin/products?id=${product.id}`,
                            "DELETE",
                          )
                        }
                        aria-label="Remover"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {tab === "orders" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Gestão de pedidos</h2>
              <span>{data.orders.length} pedidos</span>
            </div>
            <OrderTable
              orders={data.orders}
              onStatus={(id, status) =>
                mutate("/api/admin/orders", "PATCH", { id, status })
              }
            />
          </section>
        )}
        {tab === "sales" && (
          <div className="admin-sales-stack">
            <section className="admin-panel external-sale-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Registrar venda externa</h2>
                  <p>Para vendas presenciais, indicações ou WhatsApp.</p>
                </div>
              </div>
              <ExternalSaleForm
                key={saleFormKey}
                products={data.products.filter(
                  (product) => product.status === "ACTIVE" && product.stock > 0,
                )}
                customers={data.users.filter((user) => user.role === "CUSTOMER")}
                saving={savingSale}
                onSubmit={saveExternalSale}
              />
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Vendas externas registradas</h2>
                <span>
                  {
                    data.orders.filter((order) => order.source === "EXTERNAL")
                      .length
                  }{" "}
                  vendas
                </span>
              </div>
              <OrderTable
                orders={data.orders.filter(
                  (order) => order.source === "EXTERNAL",
                )}
                onStatus={(id, status) =>
                  mutate("/api/admin/orders", "PATCH", { id, status })
                }
              />
            </section>
          </div>
        )}
        {tab === "finance" && (
          <>
            <div className="admin-metrics">
              <Metric
                label="Receita confirmada"
                value={money(data.metrics.revenue)}
              />
              <Metric
                label="Lucro estimado"
                value={money(data.metrics.profit)}
              />
              <Metric
                label="Margem estimada"
                value={
                  data.metrics.revenue
                    ? `${Math.round((data.metrics.profit / data.metrics.revenue) * 100)}%`
                    : "0%"
                }
              />
              <Metric
                label="A receber"
                value={String(data.metrics.pendingOrders)}
              />
            </div>
            <section className="admin-panel">
              <h2>Movimentação por pedido</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Pagamento</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.number}</td>
                      <td>{order.customerName}</td>
                      <td>{order.payment?.status || "Pendente"}</td>
                      <td>{orderLabels[order.status]}</td>
                      <td>{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
        {tab === "coupons" && (
          <div className="admin-split">
            <section className="admin-panel admin-form-panel">
              <h2>{editingCoupon ? "Editar cupom" : "Cadastrar cupom"}</h2>
              <CouponForm
                key={editingCoupon?.id || "new"}
                coupon={editingCoupon}
                onSubmit={saveCoupon}
                onCancel={() => setEditingCoupon(null)}
              />
            </section>
            <section className="admin-panel">
              <h2>Cupons cadastrados</h2>
              <div className="admin-coupon-list">
                {data.coupons.map((coupon) => (
                  <article key={coupon.id}>
                    <div>
                      <b>{coupon.code}</b>
                      <span>
                        {coupon.type === "PERCENTAGE"
                          ? `${coupon.value}%`
                          : money(coupon.value)}
                      </span>
                      <small>
                        {coupon.usageCount}
                        {coupon.usageLimit ? `/${coupon.usageLimit}` : ""} usos
                        · {coupon.active ? "Ativo" : "Inativo"}
                      </small>
                    </div>
                    <div className="admin-row-actions">
                      <button onClick={() => setEditingCoupon(coupon)}>
                        <Pencil />
                      </button>
                      <button
                        onClick={() =>
                          confirm(`Remover o cupom ${coupon.code}?`) &&
                          mutate(`/api/admin/coupons?id=${coupon.id}`, "DELETE")
                        }
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
        {tab === "access" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Controle de acessos</h2>
                <p>Promova somente pessoas autorizadas a gerenciar a loja.</p>
              </div>
              <span>
                {data.users.filter((user) => user.role === "ADMIN").length}{" "}
                administradores
              </span>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Cadastro</th>
                  <th>Nível</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      {user.role === "ADMIN" ? "Administrador" : "Cliente"}
                    </td>
                    <td>
                      <button
                        className="admin-access-button"
                        disabled={user.id === data.admin.id}
                        onClick={() =>
                          mutate("/api/admin/users", "PATCH", {
                            id: user.id,
                            role: user.role === "ADMIN" ? "CUSTOMER" : "ADMIN",
                          })
                        }
                      >
                        {user.id === data.admin.id
                          ? "Sua conta"
                          : user.role === "ADMIN"
                            ? "Remover acesso"
                            : "Promover acesso"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <article className={alert ? "alert" : ""}>
      <span>{label}</span>
      <b>{value}</b>
    </article>
  );
}
function OrderTable({
  orders,
  onStatus,
}: {
  orders: Order[];
  onStatus: (id: string, status: string) => void;
}) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Cliente</th>
          <th>Data</th>
          <th>Total</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>
              <b>{order.number}</b>
            </td>
            <td>
              {order.customerName}
              <small>{order.customerEmail}</small>
            </td>
            <td>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
            <td>{money(order.total)}</td>
            <td>
              <select
                value={order.status}
                onChange={(event) => onStatus(order.id, event.target.value)}
              >
                {Object.entries(orderLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function ProductForm({
  product,
  saving,
  onSubmit,
  onCancel,
}: {
  product: Product | null;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const initial = product?.images.length
    ? product.images.map((image) => image.url)
    : product
      ? [product.imageUrl]
      : [];
  const [existing, setExisting] = useState(initial);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  function selectImages(files: FileList | null) {
    setNewPreviews(
      files ? Array.from(files).map((file) => URL.createObjectURL(file)) : [],
    );
  }
  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <div>
        <label>
          Nome*
          <input name="name" defaultValue={product?.name} required />
        </label>
        <label>
          Marca*
          <input name="brand" defaultValue={product?.brand} required />
        </label>
      </div>
      <div>
        <label>
          SKU
          <input name="sku" defaultValue={product?.sku} />
        </label>
        <label>
          Slug
          <input name="slug" defaultValue={product?.slug} />
        </label>
      </div>
      <div>
        <label>
          Gênero*
          <select name="gender" defaultValue={product?.gender || "Masculino"}>
            <option>Masculino</option>
            <option>Feminino</option>
            <option>Unissex</option>
          </select>
        </label>
        <label>
          Categoria*
          <input
            name="category"
            defaultValue={product?.category.name || "Importado"}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Volume*
          <input
            name="volume"
            defaultValue={product?.volume}
            placeholder="100 ml"
            required
          />
        </label>
        <label>
          Família olfativa
          <input name="family" defaultValue={product?.family} />
        </label>
      </div>
      <label>
        Notas, separadas por vírgula
        <input name="notes" defaultValue={product?.notes.join(", ")} />
      </label>
      <label>
        Descrição
        <textarea name="description" defaultValue={product?.description} />
      </label>
      <div>
        <label>
          Preço do site*
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price}
            required
          />
        </label>
        <label>
          Preço presencial*
          <input
            name="inPersonPrice"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={product?.inPersonPrice || product?.price}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Preço anterior do site
          <input
            name="compareAtPrice"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.compareAtPrice}
          />
        </label>
      </div>
      <div>
        <label>
          Custo
          <input
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.cost}
          />
        </label>
        <label>
          Estoque
          <input
            name="stock"
            type="number"
            min="0"
            defaultValue={product?.stock || 0}
          />
        </label>
      </div>
      <div>
        <label>
          Estoque mínimo
          <input
            name="minimumStock"
            type="number"
            min="0"
            defaultValue={product?.minimumStock || 2}
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={product?.status || "ACTIVE"}>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
          </select>
        </label>
      </div>
      <input
        type="hidden"
        name="existingImages"
        value={JSON.stringify(existing)}
      />
      <label className="admin-image-upload">
        Fotos do perfume*
        <input
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          required={!existing.length}
          onChange={(event) => selectImages(event.currentTarget.files)}
        />
        <span>Selecionar fotos do computador</span>
        <small>Até 8 imagens · JPG, PNG ou WebP · máximo de 4 MB cada</small>
      </label>
      {(existing.length > 0 || newPreviews.length > 0) && (
        <div className="admin-image-grid">
          {existing.map((url, index) => (
            <figure key={url}>
              <img src={url} alt={`Foto ${index + 1}`} />
              <button
                type="button"
                onClick={() =>
                  setExisting((images) =>
                    images.filter((image) => image !== url),
                  )
                }
              >
                Remover
              </button>
            </figure>
          ))}
          {newPreviews.map((url, index) => (
            <figure key={url}>
              <img src={url} alt={`Nova foto ${index + 1}`} />
              <small>Nova</small>
            </figure>
          ))}
        </div>
      )}
      <label className="admin-check">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={product?.featured}
        />{" "}
        Exibir como destaque
      </label>
      <div className="admin-form-actions">
        <button type="submit" disabled={saving}>
          {saving
            ? "Enviando imagens..."
            : product
              ? "Salvar perfume"
              : "Cadastrar perfume"}
        </button>
        {product && (
          <button type="button" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
function ExternalSaleForm({
  products,
  customers,
  saving,
  onSubmit,
}: {
  products: Product[];
  customers: User[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [items, setItems] = useState<Array<{ key: string; productId: string; quantity: number; unitPrice: number }>>([]);
  const [payments, setPayments] = useState([
    { key: crypto.randomUUID(), method: "PIX", amount: 0, installments: 1, customerFee: 0, operatorFee: 0, status: "PAID", manualAmount: false },
  ]);
  const [productQuery, setProductQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [discountType, setDiscountType] = useState<"VALUE" | "PERCENT">("VALUE");
  const [discountInput, setDiscountInput] = useState(0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const discount = Math.min(subtotal, discountType === "PERCENT" ? subtotal * Math.min(100, discountInput) / 100 : discountInput);
  const customerFee = payments.reduce((total, payment) => total + payment.customerFee, 0);
  const operatorFee = payments.reduce((total, payment) => total + payment.operatorFee, 0);
  const total = Math.max(0, subtotal - discount + customerFee);
  const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const difference = Math.round((total - paymentsTotal) * 100) / 100;
  const change = Math.max(0, -difference);
  const hasPending = payments.some((payment) => payment.status === "PENDING");
  const hasCash = payments.some((payment) => payment.method === "CASH");
  const validFinancial = difference === 0 || (difference > 0 && hasPending) || (difference < 0 && hasCash);
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const matchingCustomers = customerQuery.trim().length < 2 ? [] : customers.filter((customer) => {
    const haystack = `${customer.name} ${customer.email} ${customer.phone || ""} ${customer.cpf || ""}`.toLowerCase();
    return haystack.includes(customerQuery.toLowerCase());
  }).slice(0, 6);
  const matchingProducts = productQuery.trim().length < 1 ? [] : products.filter((product) =>
    `${product.name} ${product.brand} ${product.sku}`.toLowerCase().includes(productQuery.toLowerCase()),
  ).slice(0, 8);
  useEffect(() => {
    setPayments((current) => current.map((payment, index) =>
      index === 0 && !payment.manualAmount && current.length === 1
        ? { ...payment, amount: total }
        : payment,
    ));
  }, [total]);
  function updateItem(index: number, values: Partial<(typeof items)[number]>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
  }
  function updatePayment(index: number, values: Partial<(typeof payments)[number]>) {
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...values } : payment));
  }
  function addProduct(product: Product) {
    setItems((current) => {
      const existing = current.findIndex((item) => item.productId === product.id);
      if (existing >= 0) return current.map((item, index) => index === existing ? { ...item, quantity: Math.min(product.stock, item.quantity + 1) } : item);
      return [...current, { key: crypto.randomUUID(), productId: product.id, quantity: 1, unitPrice: product.inPersonPrice }];
    });
    setProductQuery("");
  }
  return (
    <form className="admin-form external-sale-form" onSubmit={onSubmit}>
      <div className="external-sale-layout">
        <div className="external-sale-flow">
          <section className="external-section compact-section">
            <div className="external-section-title"><span>01</span><div><h3>Canal da venda</h3><p>Usado apenas em relatórios. O preço aplicado será sempre o presencial.</p></div></div>
            <label>Canal<select name="saleChannel" defaultValue="PRESENCIAL"><option value="PRESENCIAL">Presencial</option><option value="WHATSAPP">WhatsApp</option><option value="INSTAGRAM">Instagram</option><option value="TELEFONE">Telefone</option><option value="INDICACAO">Indicação</option><option value="OUTRO">Outro</option></select></label>
          </section>
          <section className="external-section">
            <div className="external-section-title"><span>02</span><div><h3>Cliente <small>opcional</small></h3><p>Pesquise um cadastro ou registre a venda sem identificar o cliente.</p></div></div>
            <div className="external-search-wrap"><Search/><input value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setSelectedCustomerId(""); }} placeholder="Buscar cliente por nome, telefone ou CPF..." />{matchingCustomers.length > 0 && <div className="external-search-results">{matchingCustomers.map((customer) => <button type="button" key={customer.id} onClick={() => { setSelectedCustomerId(customer.id); setCustomerQuery(customer.name); setShowNewCustomer(false); }}><b>{customer.name}</b><small>{customer.phone || customer.email}{customer.cpf ? ` · CPF ${customer.cpf}` : ""}</small></button>)}</div>}</div>
            {selectedCustomer && <div className="selected-customer"><CheckCircle2/><span><b>{selectedCustomer.name}</b><small>{selectedCustomer.phone || selectedCustomer.email}</small></span><button type="button" onClick={() => { setSelectedCustomerId(""); setCustomerQuery(""); }}>Alterar</button></div>}
            <div className="customer-actions"><button type="button" onClick={() => { setShowNewCustomer((value) => !value); setSelectedCustomerId(""); }}>+ Novo cliente</button><span>ou venda sem identificar cliente</span></div>
            {showNewCustomer && <div className="new-customer-fields"><label>Nome<input name="customerName" /></label><label>Telefone<input name="customerPhone" inputMode="tel" /></label><label>CPF<input name="customerCpf" inputMode="numeric" /></label><label>E-mail<input name="customerEmail" type="email" /></label></div>}
            {!showNewCustomer && <><input type="hidden" name="customerId" value={selectedCustomerId}/><input type="hidden" name="customerName" value={selectedCustomer?.name || ""}/><input type="hidden" name="customerPhone" value={selectedCustomer?.phone || ""}/><input type="hidden" name="customerCpf" value={selectedCustomer?.cpf || ""}/><input type="hidden" name="customerEmail" value={selectedCustomer?.email || ""}/></>}
          </section>
          <section className="external-section products-section">
            <div className="external-section-title"><span>03</span><div><h3>Produtos</h3><p>O preço presencial vem automaticamente do cadastro e pode ser ajustado só nesta venda.</p></div></div>
            <div className="external-search-wrap product-search"><Search/><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Pesquisar perfume por nome, marca ou SKU..." />{matchingProducts.length > 0 && <div className="external-search-results">{matchingProducts.map((product) => <button type="button" key={product.id} onClick={() => addProduct(product)}><b>{product.name}</b><small>{money(product.inPersonPrice)} presencial · estoque {product.stock}</small></button>)}</div>}</div>
            {!items.length && <div className="external-empty-products"><Search/><b>Adicione o primeiro perfume</b><span>Comece pesquisando pelo nome acima.</span></div>}
            <div className="external-product-list">{items.map((item, index) => { const product = products.find((value) => value.id === item.productId)!; return <article key={item.key}><div className="external-product-heading"><div><small>{product.brand}</small><h4>{product.name}</h4><p>Preço no site: {money(product.price)} · Estoque disponível: {product.stock}</p></div><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><Trash2/> Remover</button></div><div className="external-product-controls"><label>Preço presencial<input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Math.max(0, Number(event.target.value) || 0) })}/></label><div className="quantity-control"><span>Quantidade</span><div><button type="button" disabled={item.quantity <= 1} onClick={() => updateItem(index, { quantity: item.quantity - 1 })}><Minus/></button><b>{item.quantity}</b><button type="button" disabled={item.quantity >= product.stock} onClick={() => updateItem(index, { quantity: item.quantity + 1 })}><Plus/></button></div></div><div className="line-total"><span>Total</span><b>{money(item.unitPrice * item.quantity)}</b></div></div>{item.quantity >= product.stock && <p className="stock-limit">Estoque disponível: apenas {product.stock} unidade{product.stock === 1 ? "" : "s"}.</p>}</article>})}</div>
          </section>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        )}
      />
          <section className="external-section payments-section">
            <div className="external-section-title"><span>04</span><div><h3>Pagamento</h3><p>Use uma ou mais formas. O valor restante é sugerido automaticamente.</p></div></div>
        {payments.map((payment, index) => (
          <div className="external-payment-card" key={payment.key}>
            <div className="payment-methods">{[["PIX","PIX"],["CASH","Dinheiro"],["DEBIT_CARD","Débito"],["CREDIT_CARD","Crédito"],["OTHER","Outro"]].map(([value,label]) => <button type="button" className={payment.method === value ? "active" : ""} key={value} onClick={() => updatePayment(index, { method: value, installments: value === "CREDIT_CARD" ? payment.installments : 1, ...(value === "CASH" ? { customerFee: 0, operatorFee: 0 } : {}) })}>{label}</button>)}</div>
            <div className="payment-fields"><label>Valor recebido<input type="number" min="0.01" step="0.01" value={payment.amount || ""} onChange={(event) => updatePayment(index, { amount: Math.max(0, Number(event.target.value) || 0), manualAmount: true })} required /></label>
            {payment.method === "CREDIT_CARD" && <label>Parcelas<select value={payment.installments} onChange={(event) => updatePayment(index, { installments: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, value) => value + 1).map((installments) => <option key={installments} value={installments}>{installments}x</option>)}</select></label>}
            {payment.method !== "CASH" && <label>Acréscimo ao cliente<input type="number" min="0" step="0.01" value={payment.customerFee} onChange={(event) => updatePayment(index, { customerFee: Math.max(0, Number(event.target.value) || 0) })} /></label>}
            {payment.method !== "CASH" && <label>Taxa da operadora<input type="number" min="0" step="0.01" value={payment.operatorFee} onChange={(event) => updatePayment(index, { operatorFee: Math.max(0, Number(event.target.value) || 0) })} /></label>}
            <label>Situação<select value={payment.status} onChange={(event) => updatePayment(index, { status: event.target.value })}><option value="PAID">Pago</option><option value="PENDING">Pendente</option></select></label>
            </div>{payment.method === "CASH" && change > 0 && <p className="payment-change">Troco: <b>{money(change)}</b></p>}{payments.length > 1 && <button className="remove-payment" type="button" onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}><Trash2 /> Remover pagamento</button>}
          </div>
        ))}
        <button className="external-add-item" type="button" onClick={() => setPayments((current) => [...current, { key: crypto.randomUUID(), method: "CASH", amount: Math.max(0, difference), installments: 1, customerFee: 0, operatorFee: 0, status: "PAID", manualAmount: false }])}><Plus /> Adicionar outra forma de pagamento</button>
          </section>
      <input type="hidden" name="payments" value={JSON.stringify(payments.map(({ method, amount, installments, customerFee, operatorFee, status }) => ({ method, amount, installments, customerFee, operatorFee, status })))} />
          <section className="external-section discount-section"><div className="external-section-title"><span>05</span><div><h3>Desconto</h3><p>Opcional e limitado ao subtotal dos produtos.</p></div></div><div className="discount-control"><div><button type="button" className={discountType === "VALUE" ? "active" : ""} onClick={() => setDiscountType("VALUE")}>R$</button><button type="button" className={discountType === "PERCENT" ? "active" : ""} onClick={() => setDiscountType("PERCENT")}>%</button></div><input type="number" min="0" max={discountType === "PERCENT" ? 100 : subtotal} step="0.01" value={discountInput || ""} onChange={(event) => setDiscountInput(Math.max(0, Number(event.target.value) || 0))}/></div><input type="hidden" name="discount" value={discount}/></section>
          <details className="external-section additional-info"><summary>Mais informações da venda</summary><div><label>Identificador / comprovante<input name="transactionReference" placeholder="Referência geral" /></label><label>NSU<input name="nsu" /></label><label>Código da transação<input name="transactionCode" /></label><label>Referência<input name="reference" /></label></div><label>Observações<textarea name="notes" placeholder="Venda pelo WhatsApp, cliente retirará amanhã..." /></label></details>
        </div>
        <aside className="external-sale-summary"><p>Resumo da venda</p><span>{items.length} produto{items.length === 1 ? "" : "s"}</span><dl><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>Desconto</dt><dd>- {money(discount)}</dd></div><div><dt>Acréscimo ao cliente</dt><dd>+ {money(customerFee)}</dd></div></dl><div className="summary-total"><span>Total cobrado</span><strong>{money(total)}</strong></div><dl className="summary-payment-status"><div><dt>Valor recebido</dt><dd>{money(paymentsTotal)}</dd></div><div><dt>{difference < 0 ? "Troco" : "Restante"}</dt><dd>{money(Math.abs(difference))}</dd></div></dl>{difference === 0 && <p className="payment-complete"><CheckCircle2/> Pagamento completo</p>}{difference > 0 && <p className={hasPending ? "payment-pending" : "payment-missing"}>{hasPending ? `Venda pendente: ${money(difference)} a receber.` : `Faltam ${money(difference)} nos pagamentos.`}</p>}{change > 0 && <p className="payment-complete">Troco calculado: {money(change)}</p>}<div className="summary-net"><span>Líquido estimado</span><b>{money(Math.max(0, Math.min(total, paymentsTotal - change) - operatorFee))}</b><small>Após {money(operatorFee)} em taxas da operadora</small></div><button type="submit" disabled={saving || !items.length || items.some((item) => item.quantity < 1 || item.unitPrice <= 0) || !payments.length || !validFinancial}>{saving ? "Registrando venda..." : "Registrar venda"}</button><small className="stock-note">O estoque só será baixado após a venda ser salva.</small></aside>
      </div>
    </form>
  );
}
function CouponForm({
  coupon,
  onSubmit,
  onCancel,
}: {
  coupon: Coupon | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <label>
        Código*
        <input name="code" defaultValue={coupon?.code} required />
      </label>
      <div>
        <label>
          Tipo
          <select name="type" defaultValue={coupon?.type || "PERCENTAGE"}>
            <option value="PERCENTAGE">Percentual</option>
            <option value="FIXED">Valor fixo</option>
          </select>
        </label>
        <label>
          Valor*
          <input
            name="value"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={coupon?.value}
            required
          />
        </label>
      </div>
      <label>
        Compra mínima
        <input
          name="minimumAmount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={coupon?.minimumAmount}
        />
      </label>
      <div>
        <label>
          Limite de usos
          <input
            name="usageLimit"
            type="number"
            min="1"
            defaultValue={coupon?.usageLimit}
          />
        </label>
        <label>
          Validade
          <input
            name="validUntil"
            type="date"
            defaultValue={coupon?.validUntil?.slice(0, 10)}
          />
        </label>
      </div>
      <label className="admin-check">
        <input
          name="active"
          type="checkbox"
          defaultChecked={coupon?.active ?? true}
        />{" "}
        Cupom ativo
      </label>
      <div className="admin-form-actions">
        <button type="submit">
          {coupon ? "Salvar cupom" : "Cadastrar cupom"}
        </button>
        {coupon && (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

"use client";

import {
  BadgeDollarSign,
  DollarSign,
  Home,
  LogOut,
  Package,
  Pencil,
  Plus,
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
  const load = useCallback(async () => {
    setLoading(true);
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
      void load();
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
          <div className="admin-split">
            <section className="admin-panel admin-form-panel">
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
          Preço*
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
          Preço anterior
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
  saving,
  onSubmit,
}: {
  products: Product[];
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const firstProduct = products[0];
  const [items, setItems] = useState([
    { key: crypto.randomUUID(), productId: firstProduct?.id || "", quantity: 1, unitPrice: firstProduct?.price || 0 },
  ]);
  const [payments, setPayments] = useState([
    { key: crypto.randomUUID(), method: "PIX", amount: 0, installments: 1, customerFee: 0, operatorFee: 0, status: "PAID" },
  ]);
  const [discount, setDiscount] = useState(0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  const customerFee = payments.reduce((total, payment) => total + payment.customerFee, 0);
  const operatorFee = payments.reduce((total, payment) => total + payment.operatorFee, 0);
  const total = Math.max(0, subtotal - discount + customerFee);
  const paymentsTotal = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const difference = Math.round((total - paymentsTotal) * 100) / 100;
  function updateItem(index: number, values: Partial<(typeof items)[number]>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...values } : item));
  }
  function updatePayment(index: number, values: Partial<(typeof payments)[number]>) {
    setPayments((current) => current.map((payment, paymentIndex) => paymentIndex === index ? { ...payment, ...values } : payment));
  }
  return (
    <form className="admin-form external-sale-form" onSubmit={onSubmit}>
      <div>
        <label>
          Nome do cliente*
          <input name="customerName" required />
        </label>
        <label>
          Telefone
          <input name="customerPhone" inputMode="tel" />
        </label>
      </div>
      <div>
        <label>
          E-mail
          <input name="customerEmail" type="email" />
        </label>
        <label>
          CPF
          <input name="customerCpf" inputMode="numeric" />
        </label>
      </div>
      <fieldset className="external-sale-items">
        <legend>Perfumes vendidos</legend>
        {items.map((item, index) => (
          <div className="external-sale-item" key={item.key}>
            <label>
              Perfume
              <select
                value={item.productId}
                onChange={(event) => { const product = products.find((value) => value.id === event.target.value); updateItem(index, { productId: event.target.value, unitPrice: product?.price || 0 }); }}
                required
              >
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {money(product.price)} · estoque{" "}
                    {product.stock}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preço presencial
              <input type="number" min="0.01" step="0.01" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Math.max(0, Number(event.target.value) || 0) })} required />
              {products.find((product) => product.id === item.productId) && <small>Site: {money(products.find((product) => product.id === item.productId)!.price)}</small>}
            </label>
            <label>
              Quantidade
              <input
                type="number"
                min="1"
                max={
                  products.find((product) => product.id === item.productId)
                    ?.stock || 1
                }
                value={item.quantity}
                onChange={(event) => updateItem(index, { quantity: Math.max(1, Number(event.target.value) || 1) })}
              />
            </label>
            <button
              type="button"
              disabled={items.length === 1}
              onClick={() =>
                setItems((current) =>
                  current.filter((_, itemIndex) => itemIndex !== index),
                )
              }
            >
              <Trash2 /> Remover
            </button>
          </div>
        ))}
        <button
          className="external-add-item"
          type="button"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                key: crypto.randomUUID(),
                productId: products[0]?.id || "",
                quantity: 1,
                unitPrice: products[0]?.price || 0,
              },
            ])
          }
        >
          <Plus /> Adicionar outro perfume
        </button>
      </fieldset>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          items.map(({ productId, quantity, unitPrice }) => ({ productId, quantity, unitPrice })),
        )}
      />
      <fieldset className="external-sale-items external-payments">
        <legend>Pagamentos</legend>
        {payments.map((payment, index) => (
          <div className="external-payment-item" key={payment.key}>
            <label>Forma<select value={payment.method} onChange={(event) => updatePayment(index, { method: event.target.value, installments: event.target.value === "CREDIT_CARD" ? payment.installments : 1 })}><option value="PIX">PIX</option><option value="CASH">Dinheiro</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="TRANSFER">Transferência</option></select></label>
            <label>Valor recebido<input type="number" min="0.01" step="0.01" value={payment.amount || ""} onChange={(event) => updatePayment(index, { amount: Math.max(0, Number(event.target.value) || 0) })} required /></label>
            {payment.method === "CREDIT_CARD" && <label>Parcelas<select value={payment.installments} onChange={(event) => updatePayment(index, { installments: Number(event.target.value) })}>{Array.from({ length: 12 }, (_, value) => value + 1).map((installments) => <option key={installments} value={installments}>{installments}x</option>)}</select></label>}
            <label>Taxa para o cliente<input type="number" min="0" step="0.01" value={payment.customerFee} onChange={(event) => updatePayment(index, { customerFee: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label>Taxa da operadora<input type="number" min="0" step="0.01" value={payment.operatorFee} onChange={(event) => updatePayment(index, { operatorFee: Math.max(0, Number(event.target.value) || 0) })} /></label>
            <label>Situação<select value={payment.status} onChange={(event) => updatePayment(index, { status: event.target.value })}><option value="PAID">Pago</option><option value="PENDING">Pendente</option></select></label>
            <button type="button" disabled={payments.length === 1} onClick={() => setPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index))}><Trash2 /> Remover</button>
          </div>
        ))}
        <button className="external-add-item" type="button" onClick={() => setPayments((current) => [...current, { key: crypto.randomUUID(), method: "CASH", amount: 0, installments: 1, customerFee: 0, operatorFee: 0, status: "PAID" }])}><Plus /> Adicionar outra forma de pagamento</button>
      </fieldset>
      <input type="hidden" name="payments" value={JSON.stringify(payments.map(({ method, amount, installments, customerFee, operatorFee, status }) => ({ method, amount, installments, customerFee, operatorFee, status })))} />
      <label>
        Desconto concedido
        <input
          name="discount"
          type="number"
          min="0"
          max={subtotal}
          step="0.01"
          value={discount}
          onChange={(event) =>
            setDiscount(Math.max(0, Number(event.target.value) || 0))
          }
        />
      </label>
      <div>
        <label>
          Canal da venda
          <select name="saleChannel" defaultValue="PRESENCIAL">
            <option value="PRESENCIAL">Presencial</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INDICACAO">Indicação</option>
            <option value="OUTRO">Outro</option>
          </select>
        </label>
        <label>
          Identificador/comprovante
          <input name="transactionReference" placeholder="NSU, código ou referência" />
        </label>
      </div>
      <label>
        Observações
        <textarea
          name="notes"
          placeholder="Ex.: venda pelo WhatsApp, indicação, retirada presencial..."
        />
      </label>
      <div className="external-sale-total">
        <span>
          Subtotal <b>{money(subtotal)}</b>
        </span>
        <span>
          Total-base <b>{money(Math.max(0, subtotal - discount))}</b>
        </span>
        <span>
          Acréscimo ao cliente <b>{money(customerFee)}</b>
        </span>
        <span>
          Total cobrado <strong>{money(total)}</strong>
        </span>
        <span>
          Líquido estimado <b>{money(Math.max(0, total - operatorFee))}</b>
        </span>
      </div>
      {difference !== 0 && <p className="admin-notice">{difference > 0 ? `Falta informar ${money(difference)} nos pagamentos.` : `Os pagamentos excedem o total em ${money(Math.abs(difference))}.`}</p>}
      <div className="admin-form-actions">
        <button type="submit" disabled={saving || !products.length || difference !== 0}>
          {saving ? "Registrando venda..." : "Registrar venda e baixar estoque"}
        </button>
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

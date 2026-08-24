import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { authenticatedAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const text = (value: unknown) => String(value ?? "").trim();

function productData(body: Record<string, unknown>) {
  const name = text(body.name);
  const categoryName = text(body.category) || "Outros";
  return {
    name,
    sku: text(body.sku) || `SA-${Date.now()}`,
    slug: slugify(text(body.slug) || name),
    brand: text(body.brand),
    gender: text(body.gender),
    volume: text(body.volume),
    description: text(body.description),
    family: text(body.family),
    notes: text(body.notes).split(",").map(note => note.trim()).filter(Boolean),
    styles: text(body.styles).split(",").map(value => value.trim()).filter(Boolean),
    intensity: text(body.intensity),
    occasions: text(body.occasions).split(",").map(value => value.trim()).filter(Boolean),
    characteristics: text(body.characteristics).split(",").map(value => value.trim()).filter(Boolean),
    isArabian: body.isArabian === true,
    price: text(body.price),
    inPersonPrice: text(body.inPersonPrice) || text(body.price),
    compareAtPrice: text(body.compareAtPrice) || null,
    cost: text(body.cost) || "0",
    stock: Math.max(0, Number(body.stock) || 0),
    minimumStock: Math.max(0, Number(body.minimumStock) || 0),
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls.map(text).filter(Boolean).slice(0,8) : [],
    status: body.status === "INACTIVE" ? "INACTIVE" as const : "ACTIVE" as const,
    featured: body.featured === true,
    categoryName,
    categorySlug: slugify(categoryName),
  };
}

async function audit(userId: string, action: string, entityId: string, metadata?: object) {
  await prisma.auditLog.create({ data: { userId, action, entity: "Product", entityId, metadata } });
}

function refreshCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/perfumes");
  if (slug) revalidatePath(`/produto/${slug}`);
}

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: { category: { select: { name: true } }; images: true };
}>;

const serializeProduct = (product: ProductWithRelations) => ({
  ...product,
  price: Number(product.price),
  inPersonPrice: Number(product.inPersonPrice),
  compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
  cost: Number(product.cost),
});

export async function POST(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const data = productData(body);
  if (!data.name || !data.brand || !data.gender || !data.volume || !data.price || !data.imageUrls.length) return NextResponse.json({ error: "Preencha os campos obrigatórios e adicione ao menos uma foto." }, { status: 400 });
  const category = await prisma.category.upsert({ where: { slug: data.categorySlug }, update: { name: data.categoryName }, create: { name: data.categoryName, slug: data.categorySlug } });
  const { categoryName, categorySlug, imageUrls, ...values } = data;
  const product = await prisma.product.create({ data: { ...values, imageUrl:imageUrls[0], categoryId: category.id, images:{create:imageUrls.map((url,position)=>({url,alt:`${data.name} - foto ${position+1}`,position}))} }, include: { category: { select: { name: true } }, images: { orderBy: { position: "asc" } } } });
  await audit(admin.id, "CREATE", product.id, { name: product.name });
  refreshCatalog(product.slug);
  console.info("[admin/products] created", { productId: product.id, slug: product.slug });
  return NextResponse.json({ ok: true, product: serializeProduct(product) });
}

export async function PATCH(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const body = await request.json(); const id = text(body.id); const data = productData(body);
  if (!id || !data.name || !data.brand || !data.price || !data.imageUrls.length) return NextResponse.json({ error: "Revise os dados do perfume e mantenha ao menos uma foto." }, { status: 400 });
  const category = await prisma.category.upsert({ where: { slug: data.categorySlug }, update: { name: data.categoryName }, create: { name: data.categoryName, slug: data.categorySlug } });
  const { categoryName, categorySlug, imageUrls, ...values } = data;
  const product = await prisma.product.update({ where: { id }, data: { ...values, imageUrl:imageUrls[0], categoryId: category.id, images:{deleteMany:{},create:imageUrls.map((url,position)=>({url,alt:`${data.name} - foto ${position+1}`,position}))} }, include: { category: { select: { name: true } }, images: { orderBy: { position: "asc" } } } });
  await audit(admin.id, "UPDATE", id, { name: data.name });
  refreshCatalog(product.slug);
  console.info("[admin/products] updated", { productId: product.id, slug: product.slug });
  return NextResponse.json({ ok: true, product: serializeProduct(product) });
}

export async function DELETE(request: Request) {
  const admin = await authenticatedAdmin(request); if (!admin) return NextResponse.json({ error: "Não autorizado." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Perfume inválido." }, { status: 400 });
  const used = await prisma.orderItem.count({ where: { productId: id } });
  const product = await prisma.product.findUnique({ where: { id }, select: { slug: true } });
  if (!product) return NextResponse.json({ error: "Perfume não encontrado." }, { status: 404 });
  if (used) await prisma.product.update({ where: { id }, data: { status: "INACTIVE", featured: false, deletedAt: new Date() } });
  else await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { productId: id } }),
    prisma.review.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ]);
  await audit(admin.id, used ? "ARCHIVE" : "DELETE", id);
  refreshCatalog(product.slug);
  console.info("[admin/products] removed", { productId: id, archived: used > 0 });
  return NextResponse.json({ ok: true, removed: true });
}

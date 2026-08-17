import type { Prisma } from "@prisma/client";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import {CatalogFilters} from "@/components/catalog-filters";
import { toCatalogProduct } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

export default async function Catalog({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;const text=(key:string)=>typeof query[key]==="string"?String(query[key]).trim():"";
  const gender=text("genero");const category=text("categoria");const search=text("busca");const brand=text("marca");const order=text("ordem");
  const where:Prisma.ProductWhereInput={status:"ACTIVE"};
  if(gender)where.gender={equals:gender,mode:"insensitive"};
  if(category==="arabe")where.category={slug:"arabe"};
  else if(category==="promocao")where.OR=[{compareAtPrice:{not:null}},{category:{slug:"promocao"}}];
  if(brand)where.brand={equals:brand,mode:"insensitive"};
  if(search)where.AND=[{OR:[{name:{contains:search,mode:"insensitive"}},{brand:{contains:search,mode:"insensitive"}},{family:{contains:search,mode:"insensitive"}}]}];
  const orderBy:Prisma.ProductOrderByWithRelationInput[]=order==="menor-preco"?[{price:"asc"}]:order==="maior-preco"?[{price:"desc"}]:order==="recentes"?[{createdAt:"desc"}]:[{featured:"desc"},{createdAt:"desc"}];
  const [records,brandRows]=await Promise.all([prisma.product.findMany({where,include:{category:true,images:{orderBy:{position:"asc"}}},orderBy}),prisma.product.findMany({where:{status:"ACTIVE"},distinct:["brand"],select:{brand:true},orderBy:{brand:"asc"}})]);
  const products=records.map(product=>toCatalogProduct(product));
  const genderTitle:Record<string,string>={feminino:"Perfumes femininos",masculino:"Perfumes masculinos",unissex:"Perfumes unissex"};
  const title=gender?genderTitle[gender.toLowerCase()]||"Perfumes":category==="arabe"?"Perfumes árabes":category==="promocao"?"Ofertas":order==="recentes"?"Novidades":"Perfumes";
  return <><Header/><main className="catalog container-site"><p className="breadcrumbs">Início / {title}</p><div className="catalog-title"><div><p className="eyebrow">Nossa curadoria</p><h1>{title}</h1><p>Fragrâncias cadastradas e selecionadas pela S&amp;A Parfum.</p></div><span>{products.length} produto{products.length===1?"":"s"}</span></div><CatalogFilters search={search} gender={gender} brand={brand} order={order} brands={brandRows.map(row=>row.brand)}/>{products.length?<div className="product-grid catalog-product-grid">{products.map(product=><ProductCard key={product.slug} product={product}/>)}</div>:<div className="catalog-empty"><h2>Nenhum perfume encontrado</h2><p>Ajuste os filtros ou cadastre um perfume ativo nessa categoria.</p></div>}</main><Footer/></>;
}

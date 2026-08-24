import type { Prisma } from "@prisma/client";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import {CatalogFilters} from "@/components/catalog-filters";
import { toCatalogProduct } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

export default async function Catalog({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const query=await searchParams;const text=(key:string)=>typeof query[key]==="string"?String(query[key]).trim():"";
  const gender=text("genero");const category=text("categoria");const search=text("busca");const brand=text("marca");const order=text("ordem");const family=text("familia");const characteristic=text("caracteristica");const availability=text("disponibilidade");const maxPrice=Number(text("precoMax")||search.match(/(?:até|ate)\s*r?\$?\s*(\d+)/i)?.[1]||0);
  const where:Prisma.ProductWhereInput={status:"ACTIVE",deletedAt:null,...(maxPrice?{price:{lte:maxPrice}}:{}),...(availability==="estoque"?{stock:{gt:0}}:{})};
  if(gender)where.gender={equals:gender,mode:"insensitive"};
  if(category==="arabe")where.category={slug:"arabe"};
  else if(category==="promocao")where.OR=[{compareAtPrice:{not:null}},{category:{slug:"promocao"}}];
  if(brand)where.brand={equals:brand,mode:"insensitive"};
  if(family)where.family={contains:family,mode:"insensitive"};
  if(characteristic)where.characteristics={has:characteristic};
  if(search&&!maxPrice)where.AND=[{OR:[{name:{contains:search,mode:"insensitive"}},{brand:{contains:search,mode:"insensitive"}},{gender:{contains:search,mode:"insensitive"}},{family:{contains:search,mode:"insensitive"}},{description:{contains:search,mode:"insensitive"}},{category:{name:{contains:search,mode:"insensitive"}}},{notes:{has:search}},{styles:{has:search}},{characteristics:{has:search}}]}];
  const orderBy:Prisma.ProductOrderByWithRelationInput[]=order==="menor-preco"?[{price:"asc"}]:order==="maior-preco"?[{price:"desc"}]:order==="recentes"?[{createdAt:"desc"}]:[{featured:"desc"},{createdAt:"desc"}];
  const [records,brandRows,soldItems]=await Promise.all([prisma.product.findMany({where,include:{category:true,images:{orderBy:{position:"asc"}},reviews:{where:{approved:true},select:{rating:true}}},orderBy}),prisma.product.findMany({where:{status:"ACTIVE",deletedAt:null},distinct:["brand"],select:{brand:true},orderBy:{brand:"asc"}}),order==="mais-vendidos"?prisma.orderItem.findMany({where:{order:{status:{in:["PAID","PREPARING","SHIPPED","DELIVERED"]}}},select:{productId:true,quantity:true}}):Promise.resolve([])]);
  const sales=new Map<string,number>();soldItems.forEach(item=>sales.set(item.productId,(sales.get(item.productId)||0)+item.quantity));
  if(order==="mais-vendidos")records.sort((a,b)=>(sales.get(b.id)||0)-(sales.get(a.id)||0));
  if(order==="melhor-avaliados")records.sort((a,b)=>{const avg=(items:{rating:number}[])=>items.length?items.reduce((sum,item)=>sum+item.rating,0)/items.length:0;return avg(b.reviews)-avg(a.reviews)});
  const products=records.map(product=>toCatalogProduct(product));
  const genderTitle:Record<string,string>={feminino:"Perfumes femininos",masculino:"Perfumes masculinos",unissex:"Perfumes unissex"};
  const title=gender?genderTitle[gender.toLowerCase()]||"Perfumes":category==="arabe"?"Perfumes árabes":category==="promocao"?"Ofertas":order==="recentes"?"Novidades":"Perfumes";
  return <><Header/><main className="catalog container-site"><p className="breadcrumbs">Início / {title}</p><div className="catalog-title"><div><p className="eyebrow">Nossa curadoria</p><h1>{title}</h1><p>Fragrâncias cadastradas e selecionadas pela S&amp;A Parfum.</p></div><span>{products.length} produto{products.length===1?"":"s"}</span></div><CatalogFilters search={search} gender={gender} brand={brand} order={order} brands={brandRows.map(row=>row.brand)} family={family} characteristic={characteristic} maxPrice={maxPrice||0} availability={availability}/>{products.length?<div className="product-grid catalog-product-grid">{products.map(product=><ProductCard key={product.slug} product={product}/>)}</div>:<div className="catalog-empty"><h2>Nenhum perfume encontrado</h2><p>Ajuste os filtros ou cadastre um perfume ativo nessa categoria.</p></div>}</main><Footer/></>;
}

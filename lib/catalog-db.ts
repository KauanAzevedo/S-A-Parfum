import type { Prisma } from "@prisma/client";
import type { Product } from "@/lib/catalog";

export type CatalogRecord=Prisma.ProductGetPayload<{include:{category:true;images:{orderBy:{position:"asc"}}}}>;

export function toCatalogProduct(product:CatalogRecord,badge?:string):Product{
  const recent=Date.now()-product.createdAt.getTime()<=30*24*60*60*1000;
  return {slug:product.slug,name:product.name,brand:product.brand,gender:product.gender,category:product.category.name,volume:product.volume,price:Number(product.price),oldPrice:product.compareAtPrice?Number(product.compareAtPrice):undefined,image:product.images[0]?.url||product.imageUrl,badge:badge||(product.compareAtPrice?"Oferta":recent?"Novidade":product.featured?"Destaque":undefined),family:product.family,notes:product.notes,styles:product.styles,intensity:product.intensity,occasions:product.occasions,characteristics:product.characteristics,isArabian:product.isArabian,description:product.description,stock:product.stock};
}

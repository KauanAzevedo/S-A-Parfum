"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { money, type Product } from "@/lib/catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export function ProductCard({product}:{product:Product}){
  const [favorite,setFavorite]=useState(false);const [busy,setBusy]=useState(false);
  async function toggleFavorite(){
    if(busy)return;setBusy(true);
    const {data}=await getSupabaseBrowserClient().auth.getSession();const token=data.session?.access_token;
    if(!token){window.location.href="/entrar";return}
    const next=!favorite;const response=await fetch(next?"/api/account/favorites":`/api/account/favorites?productId=${product.slug}`,{method:next?"POST":"DELETE",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:next?JSON.stringify({productId:product.slug}):undefined});
    if(response.ok)setFavorite(next);setBusy(false);
  }
  return <article className="product-card"><div className="product-image"><a href={`/produto/${product.slug}`}>{product.badge&&<span>{product.badge}</span>}<img src={product.image} alt={`Perfume ${product.name}`} loading="lazy"/></a><button className={favorite?"favorite-active":""} onClick={toggleFavorite} aria-label={`${favorite?"Remover":"Adicionar"} ${product.name} dos favoritos`}><Heart size={18} fill={favorite?"currentColor":"none"}/></button></div><div className="product-info"><p>{product.brand}</p><a href={`/produto/${product.slug}`}><h3>{product.name}</h3></a><small>{product.volume} · {product.gender}</small><div className="price">{product.oldPrice&&<del>{money(product.oldPrice)}</del>}<b>{money(product.price)}</b><em>ou 6x de {money(product.price/6)}</em></div><a className="add" href={`/produto/${product.slug}`}><ShoppingBag size={17}/> Ver perfume</a></div></article>;
}

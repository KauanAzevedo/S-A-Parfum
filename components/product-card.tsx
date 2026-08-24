"use client";

import { Heart, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { money, type Product } from "@/lib/catalog";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export function ProductCard({product}:{product:Product}){
  const soldOut=product.stock<1;
  const [favorite,setFavorite]=useState<boolean|null>(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;(async()=>{const {data}=await getSupabaseBrowserClient().auth.getSession();const token=data.session?.access_token;if(!token){if(active)setFavorite(false);return}const response=await fetch(`/api/account/favorites?productId=${encodeURIComponent(product.slug)}`,{headers:{authorization:`Bearer ${token}`}});if(response.ok){const result=await response.json();if(active)setFavorite(Boolean(result.favorite))}})();return()=>{active=false}},[product.slug]);
  async function toggleFavorite(){
    if(busy)return;setBusy(true);
    const {data}=await getSupabaseBrowserClient().auth.getSession();const token=data.session?.access_token;
    if(!token){const retorno=`${window.location.pathname}${window.location.search}`;window.location.href=`/entrar?retorno=${encodeURIComponent(retorno)}&acao=favorito&produto=${encodeURIComponent(product.slug)}`;return}
    const previous=Boolean(favorite);const optimistic=!previous;setFavorite(optimistic);window.dispatchEvent(new CustomEvent("sa:commerce-optimistic",{detail:{favorites:optimistic?1:-1}}));
    const response=await fetch("/api/account/favorites",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify({productId:product.slug})});
    if(response.ok){const result=await response.json();const confirmed=Boolean(result.favorite);setFavorite(confirmed);if(confirmed!==optimistic)window.dispatchEvent(new CustomEvent("sa:commerce-optimistic",{detail:{favorites:confirmed?1:-1}}));window.dispatchEvent(new Event("sa:commerce-updated"))}else{setFavorite(previous);window.dispatchEvent(new CustomEvent("sa:commerce-optimistic",{detail:{favorites:previous?1:-1}}))}setBusy(false);
  }
  const pixPrice=product.price*.92;
  return <article className={`product-card${soldOut?" product-card-sold-out":""}`}><div className="product-image"><a href={`/produto/${product.slug}`}>{(soldOut||product.badge)&&<span>{soldOut?"Esgotado":product.badge}</span>}<img src={product.image} alt={`Perfume ${product.name}`} loading="lazy" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src="/perfume-placeholder.svg"}}/></a><button className={favorite?"favorite-active":""} onClick={toggleFavorite} aria-label={`${favorite?"Remover":"Adicionar"} ${product.name} dos favoritos`}><Heart size={18} fill={favorite?"currentColor":"none"}/></button></div><div className="product-info"><p>{product.brand}</p><div className="product-card-title-row"><a href={`/produto/${product.slug}`}><h3>{product.name}</h3></a><small>{product.volume} · {product.gender}</small></div><div className="price">{soldOut?<em>Produto temporariamente indisponível</em>:<><div className="card-pix-row"><b className="card-pix-price">{money(pixPrice)}</b><span className="card-pix-label">No Pix · 8% de desconto</span></div><small className="card-credit-price">No cartão: {money(product.price)} em até 4x de {money(product.price/4)} sem juros</small></>}</div><a className="add" href={`/produto/${product.slug}`} aria-label={soldOut?`${product.name}: produto indisponível`:`Ver perfume ${product.name}`}><ShoppingBag size={17}/> {soldOut?"Produto indisponível":"Ver perfume"}</a></div></article>;
}

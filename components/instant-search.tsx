"use client";
import {Search} from "lucide-react";
import {useEffect,useRef,useState} from "react";
import {money} from "@/lib/catalog";
type Result={slug:string;name:string;brand:string;price:number;image:string};
export function InstantSearch(){
  const[q,setQ]=useState("");const[results,setResults]=useState<Result[]>([]);const[open,setOpen]=useState(false);const box=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(q.trim().length<2){setResults([]);return}const controller=new AbortController();const timer=setTimeout(async()=>{try{const response=await fetch(`/api/search?q=${encodeURIComponent(q)}`,{signal:controller.signal});if(response.ok){setResults((await response.json()).products);setOpen(true)}}catch(error){if(!(error instanceof DOMException&&error.name==="AbortError"))setResults([])}},220);return()=>{clearTimeout(timer);controller.abort()}},[q]);
  useEffect(()=>{const close=(event:PointerEvent)=>{if(!box.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[]);
  return <div className="instant-search" ref={box}><form className="compact-search" action="/perfumes"><Search/><input name="busca" value={q} onChange={event=>setQ(event.target.value)} onFocus={()=>setOpen(true)} autoComplete="off" aria-label="Pesquisar fragrância" placeholder="Pesquisar"/></form>{open&&q.trim().length>=2&&<div className="search-suggestions"><b>Produtos</b>{results.length?results.map(product=><a href={`/produto/${product.slug}`} key={product.slug}><img src={product.image} alt="" loading="lazy"/><span><strong>{product.name}</strong><small>{product.brand} · {money(product.price)}</small></span></a>):<p>Nenhum perfume encontrado.</p>}<a className="search-all" href={`/perfumes?busca=${encodeURIComponent(q)}`}>Ver todos os resultados para “{q}” →</a></div>}</div>;
}

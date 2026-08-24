"use client";

import { Heart, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import {CommerceCounts,readCommerceCounts,writeCommerceCounts} from "@/lib/commerce-counts";
import {InstantSearch} from "@/components/instant-search";

const links = [
  ["Novidades", "/perfumes?ordem=recentes"],
  ["Femininos", "/perfumes?genero=feminino"],
  ["Masculinos", "/perfumes?genero=masculino"],
  ["Árabes", "/perfumes?categoria=arabe"],
  ["Marcas", "/perfumes"],
  ["Ofertas", "/perfumes?categoria=promocao"],
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState<{ name: string } | null>(null);
  const [counts,setCounts]=useState<CommerceCounts|null>(null);
  const userId=useRef<string|null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    function showSession(session:Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]){
      userId.current=session?.user.id||null;
      setCustomer(session?.user ? { name: String(session.user.user_metadata?.name || session.user.email?.split("@")[0] || "Cliente") } : null);
      if(!session){setCounts({favorites:0,cart:0});return}
      const cached=readCommerceCounts(session.user.id);
      if(cached)setCounts(cached);
    }
    async function refreshCounts(accessToken?:string,currentUserId?:string){
      const token=accessToken||(await supabase.auth.getSession()).data.session?.access_token;
      const owner=currentUserId||userId.current;
      if(!token||!owner){setCounts({favorites:0,cart:0});return}
      const response=await fetch("/api/account/summary",{headers:{authorization:`Bearer ${token}`},cache:"no-store"});
      if(response.ok)setCounts(writeCommerceCounts(owner,await response.json()));
    }
    supabase.auth.getSession().then(({data})=>{
      showSession(data.session);
      if(data.session)void refreshCounts(data.session.access_token,data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      showSession(session);
      if(session?.access_token)void refreshCounts(session.access_token,session.user.id);
    });
    const commerceUpdated=()=>void refreshCounts();
    const commerceOptimistic=(event:Event)=>{const detail=(event as CustomEvent<{favorites?:number;cart?:number}>).detail||{};setCounts(current=>{const next={favorites:Math.max(0,(current?.favorites||0)+(detail.favorites||0)),cart:Math.max(0,(current?.cart||0)+(detail.cart||0))};return userId.current?writeCommerceCounts(userId.current,next):next})};
    window.addEventListener("sa:commerce-updated",commerceUpdated);
    window.addEventListener("sa:commerce-optimistic",commerceOptimistic);
    return () => {listener.subscription.unsubscribe();window.removeEventListener("sa:commerce-updated",commerceUpdated);window.removeEventListener("sa:commerce-optimistic",commerceOptimistic)};
  }, []);

  async function logout() {
    await getSupabaseBrowserClient().auth.signOut();
    setCustomer(null);
    window.location.href = "/";
  }

  return <>
    <div className="topbar"><span className="topbar-line"/>8% OFF no PIX<span className="topbar-line"/></div>
    <header className="site-header luxury-header">
      <div className="container-site header-main">
        <button className="menu-trigger mobile-only" onClick={() => setOpen(!open)} aria-label="Abrir menu">{open ? <X/> : <Menu/>}</button>
        <a href="/" className="brand brand-image" aria-label="S&A Parfum - início"><img src="/logo-sa-header.png" alt="S&A Parfum"/></a>
        <nav className={open ? "nav open" : "nav"}>{links.map(([label, href]) => <a key={label} href={href}><span>{label}</span></a>)}</nav>
        <div className="header-icons">
          <InstantSearch/>
          <div className="account-menu">
            <button aria-label="Minha conta" className="account-trigger"><UserRound/>{customer && <span className="account-customer-name">{customer.name.split(" ")[0]}</span>}</button>
            <div className="account-panel">
              <span className="account-arrow"/>
              {customer ? <>
                <b>Olá, {customer.name.split(" ")[0]}</b><strong>Sua conta S&amp;A</strong>
                <a className="account-login" href="/conta">Minha conta</a>
                <p><button className="account-logout" onClick={logout}>Sair da conta</button></p>
              </> : <>
                <b>Já possui cadastro?</b><strong>Acesse sua conta</strong>
                <a className="account-login" href="/entrar">Entrar</a>
                <p>Cliente novo? <a href="/cadastro">Cadastrar</a></p><hr/>
                <p>Consulte o seu pedido<br/><a href="/entrar">Acompanhe aqui</a></p>
              </>}
            </div>
          </div>
          <a href="/conta?secao=favoritos" aria-label={`Favoritos: ${counts?.favorites??"carregando"}`} className="bag"><Heart/>{counts!==null&&<i>{counts.favorites}</i>}</a>
          <a href="/carrinho" aria-label={`Carrinho: ${counts?.cart??"carregando"}`} className="bag"><ShoppingBag/>{counts!==null&&<i>{counts.cart}</i>}</a>
        </div>
      </div>
    </header>
  </>;
}

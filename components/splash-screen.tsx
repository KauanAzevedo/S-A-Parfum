"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function SplashScreen(){
  const pathname=usePathname();
  const [visible,setVisible]=useState(false);
  const [leaving,setLeaving]=useState(false);

  useEffect(()=>{
    if(pathname.startsWith("/admin")) return;
    const key="sa-parfum-intro-seen";
    if(sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key,"1");
    setVisible(true);
    const leave=window.setTimeout(()=>setLeaving(true),1800);
    const hide=window.setTimeout(()=>setVisible(false),2350);
    return()=>{window.clearTimeout(leave);window.clearTimeout(hide)};
  },[pathname]);

  if(!visible)return null;
  return <div className={`splash-screen${leaving?" splash-leaving":""}`} role="status" aria-label="Carregando S&A Parfum">
    <div className="splash-pattern"/>
    <div className="splash-content">
      <p>Perfumaria premium</p>
      <div className="splash-progress"><span/></div>
    </div>
    <small>Carregando experiência</small>
  </div>;
}

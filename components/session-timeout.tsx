"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

const IDLE_LIMIT = 30 * 60 * 1000;
const ABSOLUTE_LIMIT = 8 * 60 * 60 * 1000;
const WARNING_TIME = 2 * 60 * 1000;
const LAST_ACTIVITY_KEY = "sa-parfum:last-activity";
const LOGIN_STARTED_KEY = "sa-parfum:login-started";

export function SessionTimeout(){
  const [warning,setWarning]=useState(false);
  const [seconds,setSeconds]=useState(WARNING_TIME/1000);

  const clearTimers=useCallback(()=>{
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LOGIN_STARTED_KEY);
    setWarning(false);
  },[]);

  const expire=useCallback(async()=>{
    clearTimers();
    await getSupabaseBrowserClient().auth.signOut({scope:"local"});
    window.location.replace("/entrar?sessao=expirada");
  },[clearTimers]);

  const continueSession=useCallback(()=>{
    localStorage.setItem(LAST_ACTIVITY_KEY,String(Date.now()));
    setWarning(false);
    setSeconds(WARNING_TIME/1000);
  },[]);

  useEffect(()=>{
    const supabase=getSupabaseBrowserClient();
    let lastRecorded=0;

    const ensureSessionTimers=async()=>{
      const {data}=await supabase.auth.getSession();
      if(!data.session){clearTimers();return}
      const now=Date.now();
      if(!localStorage.getItem(LOGIN_STARTED_KEY))localStorage.setItem(LOGIN_STARTED_KEY,String(now));
      if(!localStorage.getItem(LAST_ACTIVITY_KEY))localStorage.setItem(LAST_ACTIVITY_KEY,String(now));
    };

    const recordActivity=()=>{
      const now=Date.now();
      if(warning||now-lastRecorded<15000)return;
      lastRecorded=now;
      if(localStorage.getItem(LOGIN_STARTED_KEY))localStorage.setItem(LAST_ACTIVITY_KEY,String(now));
    };

    const check=async()=>{
      const started=Number(localStorage.getItem(LOGIN_STARTED_KEY)||0);
      const lastActivity=Number(localStorage.getItem(LAST_ACTIVITY_KEY)||0);
      if(!started||!lastActivity)return;
      const now=Date.now();
      const idleRemaining=IDLE_LIMIT-(now-lastActivity);
      const absoluteRemaining=ABSOLUTE_LIMIT-(now-started);
      const remaining=Math.min(idleRemaining,absoluteRemaining);
      if(remaining<=0){await expire();return}
      if(remaining<=WARNING_TIME){setWarning(true);setSeconds(Math.max(1,Math.ceil(remaining/1000)))}
      else setWarning(false);
    };

    ensureSessionTimers();
    const events=["pointerdown","keydown","scroll","touchstart"] as const;
    events.forEach(event=>window.addEventListener(event,recordActivity,{passive:true}));
    const interval=window.setInterval(check,1000);
    const {data:listener}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==="SIGNED_OUT"){clearTimers();return}
      if(event==="SIGNED_IN"&&session&&!localStorage.getItem(LOGIN_STARTED_KEY)){
        const now=String(Date.now());localStorage.setItem(LOGIN_STARTED_KEY,now);localStorage.setItem(LAST_ACTIVITY_KEY,now);
      }
    });
    return()=>{
      events.forEach(event=>window.removeEventListener(event,recordActivity));
      window.clearInterval(interval);
      listener.subscription.unsubscribe();
    };
  },[clearTimers,expire,warning]);

  if(!warning)return null;
  const minutes=Math.floor(seconds/60);const remainingSeconds=seconds%60;
  return <div className="session-warning-backdrop" role="dialog" aria-modal="true" aria-labelledby="session-warning-title">
    <section className="session-warning">
      <Clock3/>
      <p className="eyebrow">Segurança da conta</p>
      <h2 id="session-warning-title">Sua sessão está terminando</h2>
      <p>Por segurança, você será desconectado por inatividade em <strong>{minutes}:{String(remainingSeconds).padStart(2,"0")}</strong>.</p>
      <div><button onClick={continueSession}>Continuar conectado</button><button onClick={expire}>Sair agora</button></div>
    </section>
  </div>;
}

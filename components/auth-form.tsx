"use client";

import { CreditCard, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";

export function AuthForm({mode}:{mode:"login"|"register"}){
  const register=mode==="register";
  const [show,setShow]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  function validCpf(value:string){
    const cpf=value.replace(/\D/g,"");
    if(cpf.length!==11||/^(\d)\1{10}$/.test(cpf))return false;
    const digit=(size:number)=>{let sum=0;for(let i=0;i<size;i++)sum+=Number(cpf[i])*(size+1-i);const result=(sum*10)%11;return result===10?0:result};
    return digit(9)===Number(cpf[9])&&digit(10)===Number(cpf[10]);
  }

  function maskCpf(value:string){return value.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")}
  function maskPhone(value:string){const digits=value.replace(/\D/g,"").slice(0,11);return digits.replace(/^(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2")}

  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setLoading(true);setError("");setMessage("");
    const data=new FormData(event.currentTarget);
    const email=String(data.get("email")||"").trim();
    const password=String(data.get("password")||"");
    const confirmation=String(data.get("confirmation")||"");
    if(register&&password!==confirmation){setError("As senhas não coincidem.");setLoading(false);return}
    const cpf=String(data.get("cpf")||"");
    const phone=String(data.get("phone")||"");
    if(register&&!validCpf(cpf)){setError("Informe um CPF válido.");setLoading(false);return}
    if(register&&phone.replace(/\D/g,"").length<10){setError("Informe um telefone válido com DDD.");setLoading(false);return}
    try{
      const supabase=getSupabaseBrowserClient();
      if(register){
        const name=String(data.get("name")||"").trim();
        const {data:result,error:authError}=await supabase.auth.signUp({email,password,options:{data:{name,phone:phone.replace(/\D/g,""),cpf:cpf.replace(/\D/g,"")},emailRedirectTo:`${window.location.origin}/conta`}});
        if(authError)throw authError;
        if(!result.session){
          const {error:loginError}=await supabase.auth.signInWithPassword({email,password});
          if(loginError)throw loginError;
        }
        window.location.href="/";
      }else{
        const {error:authError}=await supabase.auth.signInWithPassword({email,password});
        if(authError)throw authError;
        window.location.href="/";
      }
    }catch(value){
      const text=value instanceof Error?value.message:"Não foi possível concluir. Tente novamente.";
      const translated=text.includes("Invalid login credentials")?"E-mail ou senha incorretos.":text.includes("User already registered")?"Este e-mail já possui cadastro.":text;
      setError(translated);
    }finally{setLoading(false)}
  }

  return <form className="auth-form" onSubmit={submit}>
    {register&&<label>Nome completo<div><UserRound/><input name="name" required autoComplete="name" placeholder="Seu nome completo"/></div></label>}
    {register&&<div className="auth-fields-row"><label>Telefone<div><Phone/><input name="phone" type="tel" required autoComplete="tel" inputMode="tel" placeholder="(00) 00000-0000" onChange={e=>e.currentTarget.value=maskPhone(e.currentTarget.value)}/></div></label><label>CPF<div><CreditCard/><input name="cpf" required inputMode="numeric" placeholder="000.000.000-00" onChange={e=>e.currentTarget.value=maskCpf(e.currentTarget.value)}/></div></label></div>}
    <label>E-mail<div><Mail/><input name="email" type="email" required autoComplete="email" placeholder="seu@email.com"/></div></label>
    <label>Senha<div><LockKeyhole/><input name="password" type={show?"text":"password"} required minLength={6} autoComplete={register?"new-password":"current-password"} placeholder="Mínimo de 6 caracteres"/><button type="button" onClick={()=>setShow(!show)} aria-label={show?"Ocultar senha":"Mostrar senha"}>{show?<EyeOff/>:<Eye/>}</button></div></label>
    {register&&<label>Confirmar senha<div><LockKeyhole/><input name="confirmation" type={show?"text":"password"} required minLength={6} autoComplete="new-password" placeholder="Repita sua senha"/></div></label>}
    {!register&&<div className="auth-options"><label><input type="checkbox"/> Lembrar de mim</label><a href="/recuperar-senha">Esqueci minha senha</a></div>}
    {register&&<label className="auth-consent"><input type="checkbox" required/> Li e aceito a <a href="/politica-de-privacidade">Política de Privacidade</a> e os <a href="/termos-de-uso">Termos de Uso</a>.</label>}
    {error&&<p className="auth-message auth-error" role="alert">{error}</p>}
    {message&&<p className="auth-message auth-success" role="status">{message}</p>}
    <button className="auth-submit" disabled={loading}>{loading?"Aguarde...":register?"Criar minha conta":"Entrar"}</button>
  </form>;
}

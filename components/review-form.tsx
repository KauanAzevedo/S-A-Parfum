"use client";
import {useEffect,useState} from "react";
import {Star} from "lucide-react";
import {useRouter} from "next/navigation";
import {getSupabaseBrowserClient} from "@/lib/supabase-client";

export function ReviewForm({target,productId}:{target:"store"|"product";productId?:string}){
  const router=useRouter();
  const [authenticated,setAuthenticated]=useState<boolean|null>(null);
  const [rating,setRating]=useState(0);
  const [hover,setHover]=useState(0);
  const [comment,setComment]=useState("");
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const supabase=getSupabaseBrowserClient();
    supabase.auth.getSession().then(({data})=>setAuthenticated(Boolean(data.session)));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setAuthenticated(Boolean(session)));
    return()=>listener.subscription.unsubscribe();
  },[]);

  const loginUrl=`/entrar?retorno=${encodeURIComponent(target==="store"?"/#avaliacoes":`/produto/${productId}#avaliacoes`)}`;
  async function submit(event:React.FormEvent){
    event.preventDefault();
    const {data}=await getSupabaseBrowserClient().auth.getSession();
    const token=data.session?.access_token;
    if(!token){window.location.href=loginUrl;return}
    setPending(true);setMessage("");
    try{
      const response=await fetch("/api/reviews",{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify({target,productId,rating,comment})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||"Não foi possível salvar sua avaliação.");
      setMessage("Avaliação publicada. Obrigado por compartilhar sua experiência!");
      setComment("");setRating(0);router.refresh();
    }catch(error){setMessage(error instanceof Error?error.message:"Não foi possível salvar sua avaliação.")}
    finally{setPending(false)}
  }

  if(authenticated===false)return <div className="review-login"><Star/><h3>{target==="store"?"Avalie sua experiência com a S&A":"Já conhece esta fragrância?"}</h3><p>Entre na sua conta para deixar sua nota e comentário.</p><a href={loginUrl}>Entrar para avaliar</a></div>;
  return <form className="review-form" onSubmit={submit}><div><p className="eyebrow">Sua opinião importa</p><h3>{target==="store"?"Como foi sua experiência com a S&A?":"Avalie este perfume"}</h3></div><fieldset disabled={pending||authenticated===null}><legend>Sua nota</legend><div className="review-stars" onMouseLeave={()=>setHover(0)}>{[1,2,3,4,5].map(value=><button type="button" key={value} onMouseEnter={()=>setHover(value)} onFocus={()=>setHover(value)} onBlur={()=>setHover(0)} onClick={()=>setRating(value)} aria-label={`${value} ${value===1?"estrela":"estrelas"}`}><Star fill={value<=(hover||rating)?"currentColor":"none"}/></button>)}</div><label>Conte como foi sua experiência<textarea value={comment} onChange={event=>setComment(event.target.value)} maxLength={600} placeholder={target==="store"?"Atendimento, entrega, embalagem...":"Fixação, projeção, fragrância..."}/></label><div className="review-form-footer"><small>{comment.length}/600</small><button type="submit" disabled={pending||rating===0||comment.trim().length<5}>{pending?"Publicando...":"Publicar avaliação"}</button></div></fieldset>{message&&<p className="review-message" role="status">{message}</p>}</form>;
}

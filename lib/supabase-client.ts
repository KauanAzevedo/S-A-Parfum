import { createClient } from "@supabase/supabase-js";

let browserClient:ReturnType<typeof createClient>|undefined;

export function getSupabaseBrowserClient(){
  if(browserClient)return browserClient;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Configuração do Supabase indisponível.");
  browserClient=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return browserClient;
}

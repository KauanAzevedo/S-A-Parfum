import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function authenticatedCustomer(request:Request){
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!token)return null;
  const url=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!url||!key)return null;
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await supabase.auth.getUser(token);
  if(error||!data.user?.email)return null;
  const metadata=data.user.user_metadata||{};
  return prisma.user.upsert({
    where:{email:data.user.email},
    create:{id:data.user.id,email:data.user.email,name:String(metadata.name||data.user.email.split("@")[0]),cpf:metadata.cpf?String(metadata.cpf):null,phone:metadata.phone?String(metadata.phone):null},
    update:{},
  });
}

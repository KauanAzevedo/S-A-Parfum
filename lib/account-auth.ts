import { Prisma } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

type AuthProfile = {
  id: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
};

async function synchronizeCustomer(profile: AuthProfile) {
  const existingById = await prisma.user.findUnique({ where: { id: profile.id } });

  if (existingById) {
    const emailOwner = existingById.email === profile.email
      ? existingById
      : await prisma.user.findUnique({ where: { email: profile.email } });

    return prisma.user.update({
      where: { id: existingById.id },
      data: {
        ...(emailOwner && emailOwner.id !== existingById.id ? {} : { email: profile.email }),
        name: existingById.name || profile.name,
        cpf: existingById.cpf || profile.cpf,
        phone: existingById.phone || profile.phone,
      },
    });
  }

  const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingByEmail) return existingByEmail;

  try {
    return await prisma.user.create({ data: profile });
  } catch (error) {
    // Duas solicitações de autenticação podem chegar juntas. Se outra já criou
    // o cliente, a operação continua normalmente em vez de exibir um falso erro.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const synchronized = await prisma.user.findFirst({
        where: { OR: [{ id: profile.id }, { email: profile.email }] },
      });
      if (synchronized) return synchronized;
    }
    throw error;
  }
}

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
  return synchronizeCustomer({
    id:data.user.id,
    email:data.user.email,
    name:String(metadata.name||data.user.email.split("@")[0]),
    cpf:metadata.cpf?String(metadata.cpf):null,
    phone:metadata.phone?String(metadata.phone):null,
  });
}

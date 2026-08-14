import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const b=await request.json();const required=["zipCode","street","number","district","city","state"];
  if(required.some(k=>!String(b[k]||"").trim()))return NextResponse.json({error:"Preencha o endereço completo."},{status:400});
  const address=await prisma.address.create({data:{userId:user.id,zipCode:String(b.zipCode).replace(/\D/g,""),street:String(b.street),number:String(b.number),complement:b.complement?String(b.complement):null,district:String(b.district),city:String(b.city),state:String(b.state).toUpperCase().slice(0,2)}});
  return NextResponse.json(address);
}

export async function DELETE(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const id=new URL(request.url).searchParams.get("id");if(!id)return NextResponse.json({error:"Endereço inválido."},{status:400});
  await prisma.address.deleteMany({where:{id,userId:user.id}});return NextResponse.json({ok:true});
}

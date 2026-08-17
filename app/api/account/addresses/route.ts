import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";

function addressData(b:Record<string,unknown>){return {zipCode:String(b.zipCode).replace(/\D/g,""),street:String(b.street).trim(),number:String(b.number).trim(),complement:b.complement?String(b.complement).trim():null,district:String(b.district).trim(),city:String(b.city).trim(),state:String(b.state).toUpperCase().slice(0,2)}}
function validAddress(b:Record<string,unknown>){return !["zipCode","street","number","district","city","state"].some(k=>!String(b[k]||"").trim())}

export async function POST(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const b=await request.json();if(!validAddress(b))return NextResponse.json({error:"Preencha o endereço completo."},{status:400});
  const address=await prisma.address.create({data:{userId:user.id,...addressData(b)}});
  return NextResponse.json(address);
}

export async function PATCH(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const b=await request.json();const id=String(b.id||"");if(!id||!validAddress(b))return NextResponse.json({error:"Revise o endereço."},{status:400});
  const owned=await prisma.address.findFirst({where:{id,userId:user.id},select:{id:true}});if(!owned)return NextResponse.json({error:"Endereço não encontrado."},{status:404});
  const address=await prisma.address.update({where:{id},data:addressData(b)});return NextResponse.json(address);
}

export async function DELETE(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const id=new URL(request.url).searchParams.get("id");if(!id)return NextResponse.json({error:"Endereço inválido."},{status:400});
  await prisma.address.deleteMany({where:{id,userId:user.id}});return NextResponse.json({ok:true});
}

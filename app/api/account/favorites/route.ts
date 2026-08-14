import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";

export async function POST(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const {productId}=await request.json();const product=await prisma.product.findFirst({where:{OR:[{id:String(productId)},{slug:String(productId)}]}});if(!product)return NextResponse.json({error:"Produto não encontrado."},{status:404});
  await prisma.favorite.upsert({where:{userId_productId:{userId:user.id,productId:product.id}},create:{userId:user.id,productId:product.id},update:{}});return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const productId=new URL(request.url).searchParams.get("productId");if(!productId)return NextResponse.json({error:"Produto inválido."},{status:400});
  const product=await prisma.product.findFirst({where:{OR:[{id:productId},{slug:productId}]}});if(product)await prisma.favorite.deleteMany({where:{userId:user.id,productId:product.id}});return NextResponse.json({ok:true});
}

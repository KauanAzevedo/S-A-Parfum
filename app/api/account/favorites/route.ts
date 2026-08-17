import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { prisma } from "@/lib/prisma";

async function findProduct(productId:string){return prisma.product.findFirst({where:{OR:[{id:productId},{slug:productId}]},select:{id:true}})}

export async function GET(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const productId=new URL(request.url).searchParams.get("productId");if(!productId)return NextResponse.json({error:"Produto inválido."},{status:400});
  const product=await findProduct(productId);if(!product)return NextResponse.json({favorite:false});
  const favorite=await prisma.favorite.findUnique({where:{userId_productId:{userId:user.id,productId:product.id}},select:{id:true}});
  return NextResponse.json({favorite:Boolean(favorite)});
}

export async function PATCH(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const {productId}=await request.json();const product=await findProduct(String(productId));if(!product)return NextResponse.json({error:"Produto não encontrado."},{status:404});
  const existing=await prisma.favorite.findUnique({where:{userId_productId:{userId:user.id,productId:product.id}},select:{id:true}});
  if(existing){await prisma.favorite.delete({where:{id:existing.id}});return NextResponse.json({ok:true,favorite:false})}
  await prisma.favorite.create({data:{userId:user.id,productId:product.id}});return NextResponse.json({ok:true,favorite:true});
}

export async function POST(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const {productId}=await request.json();const product=await findProduct(String(productId));if(!product)return NextResponse.json({error:"Produto não encontrado."},{status:404});
  await prisma.favorite.upsert({where:{userId_productId:{userId:user.id,productId:product.id}},create:{userId:user.id,productId:product.id},update:{}});return NextResponse.json({ok:true});
}

export async function DELETE(request:Request){
  const user=await authenticatedCustomer(request);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const productId=new URL(request.url).searchParams.get("productId");if(!productId)return NextResponse.json({error:"Produto inválido."},{status:400});
  const product=await findProduct(productId);if(product)await prisma.favorite.deleteMany({where:{userId:user.id,productId:product.id}});return NextResponse.json({ok:true});
}

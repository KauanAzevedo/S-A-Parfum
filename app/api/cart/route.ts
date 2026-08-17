import {NextResponse} from "next/server";
import {authenticatedCustomer} from "@/lib/account-auth";
import {prisma} from "@/lib/prisma";

export async function GET(req:Request){
  const user=await authenticatedCustomer(req);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const cart=await prisma.cart.findFirst({where:{userId:user.id},include:{items:{include:{product:true}}}});
  return NextResponse.json({items:(cart?.items||[]).map(item=>({id:item.id,quantity:item.quantity,unitPrice:Number(item.unitPrice),product:{name:item.product.name,brand:item.product.brand,volume:item.product.volume,image:item.product.imageUrl,slug:item.product.slug,stock:item.product.stock}}))});
}

export async function POST(req:Request){
  const user=await authenticatedCustomer(req);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const body=await req.json().catch(()=>({}));const productId=String(body.productId||"");const quantity=Math.max(1,Math.min(99,Math.floor(Number(body.quantity))||1));
  const product=await prisma.product.findFirst({where:{OR:[{id:productId},{slug:productId}],status:"ACTIVE"}});
  if(!product)return NextResponse.json({error:"Perfume não encontrado."},{status:404});if(product.stock<1)return NextResponse.json({error:"Este perfume está sem estoque."},{status:409});if(quantity>product.stock)return NextResponse.json({error:`Este produto possui ${product.stock} unidade${product.stock===1?"":"s"} em estoque.`},{status:409});
  const cart=await prisma.cart.upsert({where:{sessionId:`user:${user.id}`},update:{userId:user.id},create:{sessionId:`user:${user.id}`,userId:user.id}});
  const existing=await prisma.cartItem.findUnique({where:{cartId_productId:{cartId:cart.id,productId:product.id}}});const nextQuantity=(existing?.quantity||0)+quantity;if(nextQuantity>product.stock)return NextResponse.json({error:`Este produto possui ${product.stock} unidade${product.stock===1?"":"s"} em estoque.`},{status:409});
  await prisma.cartItem.upsert({where:{cartId_productId:{cartId:cart.id,productId:product.id}},update:{quantity:nextQuantity,unitPrice:product.price},create:{cartId:cart.id,productId:product.id,quantity:nextQuantity,unitPrice:product.price}});
  return NextResponse.json({ok:true,quantity:nextQuantity});
}

export async function PATCH(req:Request){
  const user=await authenticatedCustomer(req);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const body=await req.json().catch(()=>({}));const id=String(body.item||"");const quantity=Math.max(1,Math.min(99,Math.floor(Number(body.quantity))||1));
  const item=await prisma.cartItem.findFirst({where:{id,cart:{userId:user.id}},include:{product:true}});if(!item)return NextResponse.json({error:"Item não encontrado."},{status:404});
  if(quantity>item.product.stock)return NextResponse.json({error:`Este produto possui ${item.product.stock} unidade${item.product.stock===1?"":"s"} em estoque.`},{status:409});
  await prisma.cartItem.update({where:{id:item.id},data:{quantity,unitPrice:item.product.price}});return NextResponse.json({ok:true,quantity});
}

export async function DELETE(req:Request){
  const user=await authenticatedCustomer(req);if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const id=new URL(req.url).searchParams.get("item");if(!id)return NextResponse.json({error:"Item não informado."},{status:400});
  const cart=await prisma.cart.findFirst({where:{userId:user.id},select:{id:true}});if(cart)await prisma.cartItem.deleteMany({where:{id,cartId:cart.id}});
  return NextResponse.json({ok:true});
}

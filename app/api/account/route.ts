import { NextResponse } from "next/server";
import { authenticatedCustomer } from "@/lib/account-auth";
import { cancelExpiredPendingOrders } from "@/lib/order-expiration";
import { prisma } from "@/lib/prisma";

export async function GET(request:Request){
  const user=await authenticatedCustomer(request);
  if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  await cancelExpiredPendingOrders();
  const [profile,orders,coupons]=await Promise.all([
    prisma.user.findUnique({where:{id:user.id},include:{addresses:{orderBy:{createdAt:"desc"}},favorites:{orderBy:{createdAt:"desc"},include:{product:true}}}}),
    prisma.order.findMany({where:{OR:[{customerId:user.id},{customerEmail:user.email}]},orderBy:{createdAt:"desc"},include:{items:true,payment:true,shipment:true}}),
    prisma.coupon.findMany({where:{active:true,OR:[{validUntil:null},{validUntil:{gte:new Date()}}]}}),
  ]);
  return NextResponse.json({
    role:user.role,
    profile:{id:user.id,name:profile?.name,email:user.email,cpf:profile?.cpf,phone:profile?.phone},
    addresses:profile?.addresses||[],
    favorites:(profile?.favorites||[]).map(f=>({id:f.id,productId:f.productId,slug:f.product.slug,name:f.product.name,brand:f.product.brand,image:f.product.imageUrl,price:Number(f.product.price)})),
    orders:orders.map(o=>({id:o.id,number:o.number,status:o.status,total:Number(o.total),createdAt:o.createdAt,items:o.items.map(i=>({name:i.name,quantity:i.quantity,price:Number(i.unitPrice)})),trackingCode:o.shipment?.trackingCode||null,paymentStatus:o.payment?.status||null})),
    credits:0,
    coupons:coupons.map(c=>({code:c.code,type:c.type,value:Number(c.value),minimumAmount:c.minimumAmount?Number(c.minimumAmount):null,validUntil:c.validUntil})),
  });
}

export async function PATCH(request:Request){
  const user=await authenticatedCustomer(request);
  if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const body=await request.json();
  const name=String(body.name||"").trim();const phone=String(body.phone||"").replace(/\D/g,"");
  if(name.length<3||phone.length<10)return NextResponse.json({error:"Revise seus dados."},{status:400});
  await prisma.user.update({where:{id:user.id},data:{name,phone}});
  return NextResponse.json({ok:true});
}

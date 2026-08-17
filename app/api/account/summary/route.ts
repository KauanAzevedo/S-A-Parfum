import {NextResponse} from "next/server";
import {authenticatedCustomer} from "@/lib/account-auth";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const user=await authenticatedCustomer(request);
  if(!user)return NextResponse.json({error:"Não autorizado."},{status:401});
  const [favorites,cart]=await Promise.all([
    prisma.favorite.count({where:{userId:user.id}}),
    prisma.cart.findFirst({where:{userId:user.id},include:{items:{select:{quantity:true}}}}),
  ]);
  return NextResponse.json({favorites,cart:(cart?.items||[]).reduce((total,item)=>total+item.quantity,0)});
}

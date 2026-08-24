import {NextResponse} from "next/server";
import type {Prisma} from "@prisma/client";
import {prisma} from "@/lib/prisma";

export async function GET(request:Request){
  const q=new URL(request.url).searchParams.get("q")?.trim()||"";
  if(q.length<2)return NextResponse.json({products:[]});
  const price=Number(q.match(/(?:até|ate|menos de)\s*r?\$?\s*(\d+)/i)?.[1]||0);
  const where:Prisma.ProductWhereInput={status:"ACTIVE",deletedAt:null,stock:{gt:0},...(price?{price:{lte:price}}:{OR:[
    {name:{contains:q,mode:"insensitive"}},{brand:{contains:q,mode:"insensitive"}},{gender:{contains:q,mode:"insensitive"}},
    {family:{contains:q,mode:"insensitive"}},{description:{contains:q,mode:"insensitive"}},{category:{name:{contains:q,mode:"insensitive"}}},
    {notes:{has:q}},{styles:{has:q}},{characteristics:{has:q}},{occasions:{has:q}},
  ]})};
  const products=await prisma.product.findMany({where,select:{slug:true,name:true,brand:true,price:true,imageUrl:true,images:{orderBy:{position:"asc"},take:1}},orderBy:[{featured:"desc"},{name:"asc"}],take:6});
  return NextResponse.json({products:products.map(product=>({...product,price:Number(product.price),image:product.images[0]?.url||product.imageUrl,images:undefined}))});
}

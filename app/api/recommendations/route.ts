import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";

const norm=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
export async function POST(request:Request){
  const body=await request.json() as {gender?:string;styles?:string[];occasion?:string;intensity?:string;budgetMin?:number|null;budgetMax?:number|null};
  const records=await prisma.product.findMany({where:{status:"ACTIVE",deletedAt:null,stock:{gt:0},...(body.gender?{gender:{equals:body.gender,mode:"insensitive"}}:{}),...(body.budgetMin||body.budgetMax?{price:{...(body.budgetMin?{gte:body.budgetMin}:{}),...(body.budgetMax?{lte:body.budgetMax}:{})}}:{})},include:{category:true,images:{orderBy:{position:"asc"},take:1}},take:40});
  const products=records.map(product=>{let score=40;const haystack=[product.family,...product.notes,...product.styles,...product.characteristics].map(norm);for(const style of body.styles||[])if(haystack.some(value=>value.includes(norm(style))))score+=12;if(body.occasion&&product.occasions.some(value=>norm(value).includes(norm(body.occasion!))))score+=15;if(body.intensity&&norm(product.intensity)===norm(body.intensity))score+=18;if(product.featured)score+=3;return{slug:product.slug,name:product.name,brand:product.brand,price:Number(product.price),pixPrice:Number(product.price)*.92,image:product.images[0]?.url||product.imageUrl,compatibility:Math.min(98,score),characteristics:[...product.styles,...product.characteristics,product.intensity].filter(Boolean).slice(0,4)}}).sort((a,b)=>b.compatibility-a.compatibility).slice(0,3);
  return NextResponse.json({products});
}

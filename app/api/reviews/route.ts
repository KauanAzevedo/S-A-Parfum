import {NextResponse} from "next/server";
import {revalidatePath} from "next/cache";
import {authenticatedCustomer} from "@/lib/account-auth";
import {prisma} from "@/lib/prisma";

export async function POST(request:Request){
  const user=await authenticatedCustomer(request);
  if(!user)return NextResponse.json({error:"Entre na sua conta para avaliar."},{status:401});

  const body=await request.json().catch(()=>null) as {target?:string;productId?:string;rating?:number;comment?:string}|null;
  const rating=Number(body?.rating);
  const comment=String(body?.comment||"").trim();
  if(!Number.isInteger(rating)||rating<1||rating>5)return NextResponse.json({error:"Escolha uma nota de 1 a 5 estrelas."},{status:400});
  if(comment.length<5||comment.length>600)return NextResponse.json({error:"Escreva um comentário entre 5 e 600 caracteres."},{status:400});

  let product:{id:string;slug:string}|null=null;
  let targetKey="STORE";
  if(body?.target==="product"){
    product=await prisma.product.findFirst({where:{OR:[{id:String(body.productId||"")},{slug:String(body.productId||"")}],status:"ACTIVE",deletedAt:null},select:{id:true,slug:true}});
    if(!product)return NextResponse.json({error:"Perfume não encontrado."},{status:404});
    targetKey=product.id;
  }else if(body?.target!=="store")return NextResponse.json({error:"Tipo de avaliação inválido."},{status:400});

  const review=await prisma.review.upsert({
    where:{userId_targetKey:{userId:user.id,targetKey}},
    create:{userId:user.id,productId:product?.id||null,targetKey,rating,comment,approved:true},
    update:{rating,comment,approved:true},
    include:{user:{select:{name:true}}},
  });
  revalidatePath("/");
  if(product)revalidatePath(`/produto/${product.slug}`);
  return NextResponse.json({ok:true,review:{id:review.id,rating:review.rating,comment:review.comment,userName:review.user.name,createdAt:review.createdAt.toISOString()}});
}

import {randomUUID} from "crypto";
import {NextResponse} from "next/server";
import {authenticatedAdmin} from "@/lib/admin-auth";
import {prisma} from "@/lib/prisma";

const paymentMethods=["PIX","CASH","CREDIT_CARD","DEBIT_CARD","TRANSFER"];

export async function POST(request:Request){
  const admin=await authenticatedAdmin(request);if(!admin)return NextResponse.json({error:"Não autorizado."},{status:403});
  const body=await request.json().catch(()=>({}));const customerName=String(body.customerName||"").trim();const customerEmail=String(body.customerEmail||"").trim().toLowerCase();const customerPhone=String(body.customerPhone||"").replace(/\D/g,"");const customerCpf=String(body.customerCpf||"").replace(/\D/g,"");
  const method=paymentMethods.includes(String(body.paymentMethod))?String(body.paymentMethod):"PIX";const paid=body.paymentStatus!=="PENDING";const discount=Math.max(0,Number(body.discount)||0);
  const rawItems=Array.isArray(body.items)?body.items:[];const quantities=new Map<string,number>();for(const item of rawItems){const id=String(item.productId||"");const quantity=Math.max(1,Math.floor(Number(item.quantity)||1));if(id)quantities.set(id,(quantities.get(id)||0)+quantity)}
  if(customerName.length<2)return NextResponse.json({error:"Informe o nome do cliente."},{status:400});if(!quantities.size)return NextResponse.json({error:"Adicione pelo menos um perfume à venda."},{status:400});
  const products=await prisma.product.findMany({where:{id:{in:[...quantities.keys()]},status:"ACTIVE"}});if(products.length!==quantities.size)return NextResponse.json({error:"Um dos perfumes não está mais disponível."},{status:409});
  for(const product of products){if(product.stock<(quantities.get(product.id)||0))return NextResponse.json({error:`Estoque insuficiente para ${product.name}.`},{status:409})}
  const subtotal=products.reduce((total,product)=>total+Number(product.price)*(quantities.get(product.id)||0),0);if(discount>subtotal)return NextResponse.json({error:"O desconto não pode superar o valor dos produtos."},{status:400});
  const total=subtotal-discount;const number=`EXT-${Date.now().toString(36)}-${randomUUID().slice(0,4)}`.toUpperCase();const linkedCustomer=customerEmail?await prisma.user.findUnique({where:{email:customerEmail},select:{id:true}}):null;
  try{
    const order=await prisma.$transaction(async tx=>{
      for(const product of products){const quantity=quantities.get(product.id)||0;const updated=await tx.product.updateMany({where:{id:product.id,stock:{gte:quantity}},data:{stock:{decrement:quantity}}});if(!updated.count)throw new Error(`Estoque insuficiente para ${product.name}.`)}
      const created=await tx.order.create({data:{number,customerId:linkedCustomer?.id,customerName,customerEmail:customerEmail||`venda-externa-${number.toLowerCase()}@local`,customerCpf,customerPhone,status:paid?"PAID":"PENDING_PAYMENT",subtotal,discount,total,shippingCost:0,address:{channel:"EXTERNAL",notes:String(body.notes||"").trim(),registeredBy:admin.id},items:{create:products.map(product=>({productId:product.id,sku:product.sku,name:product.name,quantity:quantities.get(product.id)||0,unitPrice:product.price,cost:product.cost}))},payment:{create:{provider:"MANUAL",status:paid?"PAID":"PENDING",amount:total,method,raw:{channel:"EXTERNAL"}}}}});
      await tx.auditLog.create({data:{userId:admin.id,action:"EXTERNAL_SALE_CREATED",entity:"Order",entityId:created.id,metadata:{number,total,method,paid}}});return created;
    });
    return NextResponse.json({ok:true,orderNumber:order.number});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível registrar a venda."},{status:409})}
}

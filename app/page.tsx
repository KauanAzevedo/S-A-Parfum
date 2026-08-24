import { ArrowRight, BadgePercent, CreditCard, Gem, PackageCheck, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { ReviewForm } from "@/components/review-form";
import {PerfumeQuiz} from "@/components/perfume-quiz";
import { toCatalogProduct } from "@/lib/catalog-db";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const [newestRecords,bestCandidates,soldItems,homeReviews]=await Promise.all([
    prisma.product.findMany({where:{status:"ACTIVE",deletedAt:null},include:{category:true,images:{orderBy:{position:"asc"}}},orderBy:{createdAt:"desc"},take:6}),
    prisma.product.findMany({where:{status:"ACTIVE",deletedAt:null},include:{category:true,images:{orderBy:{position:"asc"}}},orderBy:{createdAt:"desc"},take:30}),
    prisma.orderItem.findMany({where:{order:{status:{in:["PAID","PREPARING","SHIPPED","DELIVERED"]}}},select:{productId:true,quantity:true,order:{select:{customerId:true}}}}),
    prisma.review.findMany({where:{approved:true,productId:{not:null}},include:{user:{select:{name:true}},product:{select:{name:true}}},orderBy:{createdAt:"desc"},take:3}),
  ]);
  const totals=new Map<string,number>();soldItems.forEach(item=>totals.set(item.productId,(totals.get(item.productId)||0)+item.quantity));
  const ranked=[...bestCandidates].sort((a,b)=>(totals.get(b.id)||0)-(totals.get(a.id)||0)||b.createdAt.getTime()-a.createdAt.getTime());
  const bestRecords=ranked.slice(0,6);
  const newest=newestRecords.map(product=>toCatalogProduct(product,"Novidade"));const best=bestRecords.map(product=>toCatalogProduct(product,"Mais vendido"));
  const rails=[
    ["Perfumes Árabes em Alta","/perfumes?categoria=arabe",ranked.filter(product=>product.isArabian||product.category.slug==="arabe").slice(0,6)],
    ["Masculinos Mais Vendidos","/perfumes?genero=masculino&ordem=mais-vendidos",ranked.filter(product=>product.gender.toLowerCase()==="masculino").slice(0,6)],
    ["Femininos Mais Vendidos","/perfumes?genero=feminino&ordem=mais-vendidos",ranked.filter(product=>product.gender.toLowerCase()==="feminino").slice(0,6)],
    ["Perfumes até R$ 250","/perfumes?precoMax=250",bestCandidates.filter(product=>Number(product.price)<=250).sort((a,b)=>Number(a.price)-Number(b.price)).slice(0,6)],
  ] as const;
  const verified=new Set(soldItems.filter(item=>item.order.customerId).map(item=>`${item.order.customerId}:${item.productId}`));
  return <><Header/><main>
  <section className="hero commercial-hero"><div className="container-site hero-content"><p className="eyebrow">Perfumaria original</p><h1>Sua presença começa<br/><em>pela fragrância.</em></h1><p className="hero-copy"><b>Perfumes importados e árabes 100% originais.</b></p><strong className="hero-pix">8% OFF no PIX</strong><div className="hero-actions"><a className="btn-primary" href="#catalogo">Explorar perfumes <ArrowRight size={17}/></a></div></div><div className="hero-products" aria-hidden="true">{newestRecords.slice(0,3).map((product,index)=><img key={product.id} className={`hero-product hero-product-${index+1}`} src={product.images[0]?.url||product.imageUrl} alt=""/>)}</div></section>
  <section className="why-section"><div className="container-site"><p className="eyebrow center">Confiança em cada detalhe</p><h2>Por que comprar na S&amp;A?</h2><div className="why-grid">{[[Gem,"100% Originais","Procedência garantida."],[BadgePercent,"8% OFF no PIX","Economize pagando à vista."],[CreditCard,"Compra Segura","Pagamento protegido."],[Truck,"Envio Rastreado","Acompanhe seu pedido até a entrega."]].map(([Icon,title,text],index)=><article className={index===0?"featured":""} key={String(title)}><Icon/><div><b>{String(title)}</b><small>{String(text)}</small></div></article>)}</div></div></section>
  <section id="catalogo" className="section home-products"><div className="container-site"><div className="section-heading"><div><p className="eyebrow">Recém-chegados</p><h2>Novidades</h2></div><a href="/perfumes?ordem=recentes">Ver todos <ArrowRight size={15}/></a></div>{newest.length?<div className="product-grid">{newest.map(product=><ProductCard key={product.slug} product={product}/>)}</div>:<p className="home-products-empty">Os perfumes ativos cadastrados aparecerão aqui.</p>}</div></section>
  {best.length>0&&<section className="section home-products home-products-alt"><div className="container-site"><div className="section-heading"><div><p className="eyebrow">Preferidos dos clientes</p><h2>Mais vendidos</h2></div><a href="/perfumes">Explorar catálogo <ArrowRight size={15}/></a></div><div className="product-grid">{best.map(product=><ProductCard key={product.slug} product={product}/>)}</div></div></section>}
  <PerfumeQuiz/>
  <section className="home-collections section"><div className="container-site">{rails.map(([title,href,records])=>records.length>0&&<div className="home-rail-section" key={title}><div className="section-heading"><h2>{title}</h2><a href={href}>Ver todos <ArrowRight/></a></div><div className="home-product-rail">{records.map(product=><ProductCard key={product.id} product={toCatalogProduct(product)}/>)}</div></div>)}</div></section>
  <section id="conceito" className="editorial"><div className="editorial-image"/><div className="editorial-copy"><p className="eyebrow">A arte da perfumaria</p><h2>Uma assinatura<br/>só sua.</h2><p>Elegância não se anuncia. Ela permanece. Em breve, você encontrará notas que traduzem sua personalidade e deixam uma impressão inesquecível.</p></div></section>
  <section className="category-grid container-site"><a className="cat masculine" href="/perfumes?genero=masculino"><span>Para ele</span><h3>Masculinos</h3><b>Explorar coleção →</b></a><a className="cat feminine" href="/perfumes?genero=feminino"><span>Para ela</span><h3>Femininos</h3><b>Explorar coleção →</b></a><a className="cat arabic" href="/perfumes?categoria=arabe"><span>Intensos e opulentos</span><h3>Árabes</h3><b>Explorar coleção →</b></a></section>
  <section id="avaliacoes" className="reviews section"><div className="container-site"><p className="eyebrow center">Experiências reais</p><h2 className="center">O que nossos clientes dizem</h2>{homeReviews.length>0&&<div className="review-grid">{homeReviews.map(review=><blockquote key={review.id}><div className="stars">{[1,2,3,4,5].map(value=><Star key={value} size={14} fill={value<=review.rating?"currentColor":"none"}/>)}</div><p>“{review.comment}”</p><footer>{review.user.name}<small>{review.product?.name}{review.productId&&verified.has(`${review.userId}:${review.productId}`)?" · ✓ Compra verificada":""}</small></footer></blockquote>)}</div>}<ReviewForm target="store"/></div></section>
  <section className="newsletter"><div><Sparkles size={26}/><p className="eyebrow">Círculo S&amp;A</p><h2>Receba novidades<br/>antes de todos.</h2><p>Curadorias, lançamentos e condições especiais direto no seu e-mail.</p></div><form><label className="sr-only" htmlFor="email">Seu melhor e-mail</label><input id="email" type="email" placeholder="Seu melhor e-mail" required/><button type="submit">Quero fazer parte</button></form></section>
</main><Footer/></>; }

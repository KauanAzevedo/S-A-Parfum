import {CreditCard,PackageCheck,ShieldCheck,Star,Truck} from "lucide-react";
import {notFound} from "next/navigation";
import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import {ProductActions} from "@/components/product-actions";
import {ProductGallery} from "@/components/product-gallery";
import {ReviewForm} from "@/components/review-form";
import {prisma} from "@/lib/prisma";

const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const product=await prisma.product.findFirst({where:{slug,status:"ACTIVE",deletedAt:null},include:{category:true,images:{orderBy:{position:"asc"}},reviews:{where:{approved:true},include:{user:{select:{name:true}}},orderBy:{createdAt:"desc"}}}});
  if(!product)notFound();
  const images=product.images.length?product.images.map(image=>image.url):[product.imageUrl];
  const price=Number(product.price);const oldPrice=product.compareAtPrice?Number(product.compareAtPrice):null;const pix=price*.92;
  const rating=product.reviews.length?product.reviews.reduce((sum,review)=>sum+review.rating,0)/product.reviews.length:0;
  const related=await prisma.product.findMany({where:{status:"ACTIVE",id:{not:product.id},OR:[{categoryId:product.categoryId},{gender:product.gender}]},include:{images:{orderBy:{position:"asc"},take:1}},orderBy:{createdAt:"desc"},take:4});
  return <><Header/><main className={`product-page product-luxury${product.stock<1?" product-sold-out":""}`}><div className="container-site">
    <nav className="product-breadcrumb"><a href="/">Início</a><span>›</span><a href={`/perfumes?genero=${product.gender.toLowerCase()}`}>{product.gender}</a><span>›</span><span>{product.brand}</span><span>›</span><span>{product.name}</span></nav>
    <div className="product-showcase"><ProductGallery images={images} name={product.name}/><section className="product-purchase">
      <div className="product-intro"><p className="eyebrow">{product.brand}</p><h1>{product.name}</h1><a className="product-rating" href="#avaliacoes" aria-label={`Ir para as avaliações de ${product.name}`}><span>{rating?"★".repeat(Math.round(rating))+"☆".repeat(5-Math.round(rating)):"☆☆☆☆☆"}</span><small>{product.reviews.length?`${rating.toFixed(1)} · ${product.reviews.length} avaliações`:"Seja o primeiro a avaliar"}</small></a></div>
      <ul className="product-benefits"><li><ShieldCheck/><span><b>Compra segura</b>Ambiente protegido</span></li><li><CreditCard/><span><b>Pagamento facilitado</b>Até 6x sem juros</span></li><li><PackageCheck/><span><b>Produto original</b>Garantia S&amp;A</span></li></ul>
      <div className="product-order-box"><div className="product-order-details"><div className="product-volume"><span>Volume</span><button>{product.volume}</button></div><div className="product-stock"><span>Disponibilidade</span>{product.stock>0?<p><b>● Em estoque</b></p>:<p><b className="out">Indisponível</b></p>}</div></div>
        <div className="product-order-price"><div className="pix-price-column"><span>No PIX</span>{oldPrice&&<del>De {money(oldPrice)}</del>}<div className="pix-main"><strong>{money(pix)}</strong><small>8% de desconto</small></div><p>Preço do produto <b>{money(price)}</b></p></div><div><span>No cartão</span><strong>{money(price)}</strong><small>Em até 6x de {money(price/6)} sem juros</small></div></div>
        <ProductActions slug={product.slug} stock={product.stock}/>
      </div>
      <div className="product-shipping"><label><Truck/> Calcule o frete</label><div><input inputMode="numeric" placeholder="Digite seu CEP" aria-label="CEP"/><button>Calcular</button></div></div>
      <p className="product-code">Cód. {product.sku} · {product.category.name}</p>
    </section></div>
    <section className="product-information"><div className="product-description-column"><p className="eyebrow">Conheça a fragrância</p><h2>Descrição do produto</h2><p>{product.description||`${product.name} é uma fragrância selecionada pela curadoria S&A Parfum.`}</p><section className="product-notes"><p className="eyebrow">Pirâmide olfativa</p><h2>Notas da fragrância</h2><div>{product.notes.length?product.notes.map(note=><span key={note}>{note}</span>):<p>Notas olfativas em preparação.</p>}</div></section></div><aside><h2>Características</h2><dl><div><dt>Marca</dt><dd>{product.brand}</dd></div><div><dt>Gênero</dt><dd>{product.gender}</dd></div><div><dt>Família olfativa</dt><dd>{product.family||"Não informada"}</dd></div><div><dt>Volume</dt><dd>{product.volume}</dd></div><div><dt>Categoria</dt><dd>{product.category.name}</dd></div></dl></aside></section>
    <section id="avaliacoes" className="product-reviews"><div className="product-reviews-heading"><p className="eyebrow">Opiniões de clientes</p><h2>Avaliações de {product.name}</h2><p>{product.reviews.length?`${rating.toFixed(1)} de 5 · ${product.reviews.length} ${product.reviews.length===1?"avaliação":"avaliações"}`:"Seja a primeira pessoa a avaliar esta fragrância."}</p></div>{product.reviews.length>0&&<div className="product-review-list">{product.reviews.map(review=><article key={review.id}><div className="stars">{[1,2,3,4,5].map(value=><Star key={value} size={15} fill={value<=review.rating?"currentColor":"none"}/>)}</div><p>“{review.comment}”</p><footer><b>{review.user.name}</b><small>Cliente S&amp;A</small></footer></article>)}</div>}<ReviewForm target="product" productId={product.slug}/></section>
    {related.length>0&&<section className="related-products"><div><p className="eyebrow">Continue descobrindo</p><h2>Perfumes relacionados</h2></div><div className="related-grid">{related.map(item=><a className={item.stock<1?"out-of-stock":""} href={`/produto/${item.slug}`} key={item.id}><img src={item.images[0]?.url||item.imageUrl} alt={item.name}/>{item.stock<1&&<span>Esgotado</span>}<small>{item.brand}</small><h3>{item.name}</h3><b>{money(Number(item.price))}</b></a>)}</div></section>}
  </div></main><Footer/></>;
}

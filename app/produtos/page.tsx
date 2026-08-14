import { ShoppingBag } from "lucide-react";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { products, whatsappUrl } from "@/lib/site-content";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Products() {
  return <><Header /><main className="container-site pb-24 pt-36">
    <p className="eyebrow">Produtos Conceito</p>
    <h1 className="display mt-3 text-6xl md:text-7xl">Seu cuidado continua em casa.</h1>
    <p className="mt-5 max-w-2xl leading-relaxed text-white/50">Conheça os produtos disponíveis na barbearia. Para consultar uma opção, fale conosco pelo WhatsApp.</p>
    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{products.map((product, index) =>
      <article className="card flex min-h-64 flex-col p-7" key={product.name}>
        <img src={product.image} alt={`Foto de ${product.name}`} className="mb-6 aspect-[4/3] w-full rounded-md border border-white/10 object-cover" />
        <div className="flex items-center justify-between"><span className="display text-3xl text-gold/50">{String(index + 1).padStart(2, "0")}</span><ShoppingBag className="text-gold" size={21} /></div>
        <h2 className="display mt-7 text-3xl">{product.name}</h2>
        <p className="mt-3 grow text-sm leading-relaxed text-white/50">{product.description}</p>
        <div className="mt-6 flex justify-between gap-3 border-t border-white/10 pt-4"><b className="text-gold">{money(product.price)}</b><span className="text-sm text-green-300">Disponível</span></div>
        <a className="btn-secondary mt-5 w-full" href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre o produto ${product.name}.`)}`}>Consultar pelo WhatsApp</a>
      </article>)}</div>
  </main><Footer /></>;
}

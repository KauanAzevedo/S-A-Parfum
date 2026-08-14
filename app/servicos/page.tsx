import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { services, whatsappUrl } from "@/lib/site-content";

export default function Services() {
  return <><Header /><main className="container-site pb-24 pt-36">
    <p className="eyebrow">Menu de serviços</p>
    <h1 className="display mt-3 text-6xl md:text-7xl">Cuidado em cada detalhe.</h1>
    <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{services.map((service, index) =>
      <article className="card p-7" key={service.name}>
        <span className="eyebrow">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="display mt-4 text-3xl">{service.name}</h2>
        <p className="mt-3 min-h-12 text-sm text-white/45">{service.description}</p>
        <div className="mt-6 flex justify-between border-t border-white/10 pt-4"><b>R$ {service.price.toFixed(2).replace(".", ",")}</b><span className="text-white/40">{service.duration} min</span></div>
        <a className="btn-primary mt-6 w-full" href={`${whatsappUrl}?text=${encodeURIComponent(`Olá! Gostaria de saber mais sobre o serviço ${service.name}.`)}`}>Consultar pelo WhatsApp</a>
      </article>)}</div>
  </main><Footer /></>;
}

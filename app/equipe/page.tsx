import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { professionals } from "@/lib/site-content";

export default function Team() {
  return <><Header /><main className="container-site pb-24 pt-36">
    <p className="eyebrow">Profissionais</p><h1 className="display mt-3 text-7xl">Conheça quem faz.</h1>
    <div className="mt-12 grid gap-5 md:grid-cols-2">{professionals.map((professional) =>
      <article className="card flex h-full flex-col overflow-hidden" key={professional.name}>
        <div className="h-80 bg-[url('https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center" />
        <div className="flex grow flex-col p-6"><h2 className="display text-3xl">{professional.name}</h2><p className="mt-2 text-white/45">{professional.description}</p><p className="mt-4 text-sm text-gold">{professional.specialties.join(" • ")}</p></div>
      </article>)}</div>
  </main><Footer /></>;
}

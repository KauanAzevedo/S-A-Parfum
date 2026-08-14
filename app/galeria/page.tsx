import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

const images = ["photo-1503951914875-452162b0f3f1", "photo-1599351431202-1e0f0137899a", "photo-1621605815971-fbc98d665033", "photo-1585747860715-2ba37e788b70", "photo-1622296089863-eb7fc530daa8", "photo-1605497788044-5a32c7078486"];

export default function Gallery() {
  return <><Header /><main className="container-site pb-24 pt-36">
    <p className="eyebrow">Nosso trabalho</p><h1 className="display mt-3 text-7xl">Detalhes que falam.</h1>
    <div className="mt-6 flex gap-3 text-sm text-white/45"><span>Cortes</span><span>•</span><span>Ambiente</span><span>•</span><span>Equipe</span></div>
    <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3">{images.map((image, index) =>
      <div key={image} className={`${index === 0 || index === 4 ? "row-span-2 min-h-[620px]" : "min-h-[300px]"} bg-cover bg-center`} style={{ backgroundImage: `url(https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=80)` }} role="img" aria-label={`Galeria Conceito Barber ${index + 1}`} />)}</div>
  </main><Footer /></>;
}

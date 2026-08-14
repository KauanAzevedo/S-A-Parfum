import { BrandLogo } from "@/components/brand-logo";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function Sobre() {
  return <>
    <Header />
    <main>
      <section className="min-h-[70vh] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(193,155,82,.14),transparent_48%),linear-gradient(180deg,#11130f,#070807)]">
        <div className="container-site flex min-h-[70vh] flex-col items-center gap-8 pb-16 pt-32 md:gap-12 md:pt-36">
          <div className="shrink-0" aria-hidden="true">
            <BrandLogo hero />
          </div>
          <div className="w-full">
            <p className="eyebrow">Nossa história</p>
            <h1 className="display mt-3 max-w-3xl text-5xl md:text-7xl">Tradição no gesto. Modernidade no olhar.</h1>
          </div>
        </div>
      </section>
      <section className="container-site grid gap-10 py-24 md:grid-cols-3">
        <div>
          <p className="eyebrow">Propósito</p>
          <h2 className="display mt-3 text-4xl">Elevar autoestima e confiança.</h2>
        </div>
        <p className="text-white/55 leading-relaxed">A Conceito nasceu para transformar o cuidado masculino em uma experiência. Unimos técnica apurada, escuta e um ambiente feito para desacelerar.</p>
        <div className="space-y-4">
          <b>Excelência</b><hr className="border-white/10" />
          <b>Respeito</b><hr className="border-white/10" />
          <b>Pontualidade</b><hr className="border-white/10" />
          <b>Evolução constante</b>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}

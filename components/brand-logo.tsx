export function BrandLogo({ compact = false, hero = false }: { compact?: boolean; hero?: boolean }) {
  const frame = hero ? "h-52 w-64 md:h-72 md:w-96" : compact ? "h-16 w-24" : "h-24 w-36";
  const image = hero ? "-top-5 h-72 w-72 md:-top-8 md:h-96 md:w-96" : compact ? "-top-2 h-24 w-24" : "-top-3 h-36 w-36";
  return <span className={`relative block shrink-0 overflow-hidden ${frame}`}>
    <img
      src="/logo-conceito.png"
      alt="Conceito Barber Shop"
      className={`absolute left-1/2 -translate-x-1/2 object-contain ${image}`}
    />
  </span>;
}

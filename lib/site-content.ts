export const services = [
  { name: "Acabamento", description: "Contornos e acabamento para manter o visual.", price: 20, duration: 20 },
  { name: "Barba", description: "Toalha quente, desenho e finalização.", price: 35, duration: 30 },
  { name: "Corte de cabelo", description: "Corte personalizado com consultoria de estilo e acabamento.", price: 40, duration: 30 },
  { name: "Corte e barba", description: "Experiência completa de corte e barba.", price: 75, duration: 75 },
  { name: "Corte infantil", description: "Atendimento cuidadoso para os pequenos.", price: 40, duration: 40 },
  { name: "Hidratação", description: "Tratamento capilar profissional.", price: 30, duration: 30 },
  { name: "Pigmentação", description: "Correção de falhas com resultado natural.", price: 40, duration: 40 },
  { name: "Sobrancelha", description: "Design masculino discreto.", price: 15, duration: 15 },
] as const;

export const professionals = [
  { name: "Paulo Cesar", description: "Especialista em visagismo e atendimento premium.", specialties: ["Degradê", "Visagismo", "Barba"] },
  { name: "Yuri Siqueira", description: "Especialista em visagismo e atendimento premium.", specialties: ["Degradê", "Visagismo", "Barba"] },
] as const;

export const products = [
  { name: "Hidratante capilar", description: "Hidratação e cuidado diário para cabelos ressecados.", price: 30, image: "/produtos/hidratante-capilar.jpg" },
  { name: "Óleo para barba", description: "Nutrição, maciez e fragrância para barba e pele.", price: 40, image: "/produtos/oleo-para-barba.jpg" },
  { name: "Pomada modeladora", description: "Fixação e acabamento para manter o penteado durante o dia.", price: 35, image: "/produtos/pomada-modeladora.jpg" },
  { name: "Shampoo masculino", description: "Limpeza equilibrada para cabelo e couro cabeludo.", price: 35, image: "/produtos/shampoo-masculino.jpg" },
] as const;

export const whatsappUrl = "https://wa.me/5548991882976";

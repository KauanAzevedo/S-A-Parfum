"use client";

import { whatsappUrl } from "@/lib/site-content";

export function ContactForm() {
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const message = [
      "Olá! Entrei em contato pelo site da Conceito Barber Shop.",
      `Nome: ${fields.get("name")}`,
      `Telefone: ${fields.get("phone")}`,
      `Mensagem: ${fields.get("message")}`,
    ].join("\n");
    window.open(`${whatsappUrl}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }
  const field = "w-full border border-white/15 bg-white/5 p-3 outline-none focus:border-gold";
  return <form onSubmit={submit} className="space-y-4">
    <input required name="name" className={field} placeholder="Seu nome" aria-label="Nome" />
    <input required name="phone" className={field} placeholder="Telefone" aria-label="Telefone" />
    <textarea required minLength={10} name="message" className={`${field} min-h-36`} placeholder="Como podemos ajudar?" aria-label="Mensagem" />
    <button className="btn-primary">Enviar pelo WhatsApp</button>
  </form>;
}

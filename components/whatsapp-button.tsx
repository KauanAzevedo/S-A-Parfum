import { FaWhatsapp } from "react-icons/fa";

export function WhatsAppButton() {
  return (
    <a
      aria-label="Falar no WhatsApp"
      className="fixed z-30 right-5 bottom-5 w-14 h-14 rounded-full grid place-items-center bg-[#25d366] text-white shadow-xl hover:scale-105 transition"
      href="https://wa.me/5548991882976?text=Ol%C3%A1!%20Conheci%20a%20Conceito%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
    >
      <FaWhatsapp aria-hidden="true" size={30} />
    </a>
  );
}

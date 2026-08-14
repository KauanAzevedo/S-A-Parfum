import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return ["", "/servicos", "/produtos", "/sobre", "/equipe", "/galeria", "/contato", "/politica-de-privacidade", "/politica-de-cookies", "/termos-de-uso"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : .7,
  }));
}

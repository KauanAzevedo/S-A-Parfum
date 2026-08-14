import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("menu contém somente as páginas institucionais", async () => {
  const header = await read("components/header.tsx");
  for (const route of ["/sobre", "/equipe", "/servicos", "/produtos", "/galeria", "/contato"]) {
    assert.match(header, new RegExp(`"${route}"`));
  }
  assert.doesNotMatch(header, /agendar|login|minha-conta|admin|supabase/i);
});

test("conteúdo institucional não depende de banco de dados", async () => {
  const [home, services, products, team, gallery, content] = await Promise.all([
    read("app/page.tsx"), read("app/servicos/page.tsx"), read("app/produtos/page.tsx"),
    read("app/equipe/page.tsx"), read("app/galeria/page.tsx"), read("lib/site-content.ts"),
  ]);
  const source = [home, services, products, team, gallery, content].join("\n");
  assert.doesNotMatch(source, /supabase|createClient|\/agendar/i);
  for (const marker of ["Paulo Cesar", "Yuri Siqueira", "Hidratante capilar", "Corte de cabelo"]) {
    assert.match(source, new RegExp(marker));
  }
});

test("formulário de contato direciona para o WhatsApp", async () => {
  const form = await read("components/contact-form.tsx");
  assert.match(form, /window\.open/);
  assert.match(form, /Enviar pelo WhatsApp/);
  assert.doesNotMatch(form, /\/api\/contact|fetch\(/);
});

test("rotas e arquivos do sistema foram removidos", async () => {
  for (const path of ["app/agendar", "app/login", "app/cadastro", "app/admin", "app/minha-conta", "app/api", "lib/supabase", "supabase", "proxy.ts"]) {
    await assert.rejects(access(new URL(`../${path}`, import.meta.url)), undefined, path);
  }
});

test("sitemap publica apenas páginas institucionais", async () => {
  const sitemap = await read("app/sitemap.ts");
  assert.doesNotMatch(sitemap, /agendar|login|admin|minha-conta/);
  assert.match(sitemap, /\/servicos/);
  assert.match(sitemap, /\/contato/);
});

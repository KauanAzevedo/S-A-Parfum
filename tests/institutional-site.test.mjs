import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";
import test from "node:test";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("navegação principal expõe o catálogo atual",async()=>{
  const header=await read("components/header.tsx");
  for(const route of ["/perfumes?ordem=recentes","/perfumes?genero=feminino","/perfumes?genero=masculino","/perfumes?categoria=arabe","/carrinho","/conta?secao=favoritos"]){
    assert.match(header,new RegExp(route.replace(/[?]/g,"\\?")));
  }
});

test("contadores do comércio persistem por usuário sem exibir zero falso",async()=>{
  const [header,counts]=await Promise.all([read("components/header.tsx"),read("lib/commerce-counts.ts")]);
  assert.match(header,/useState<CommerceCounts\|null>\(null\)/);
  assert.match(header,/readCommerceCounts\(session\.user\.id\)/);
  assert.match(header,/writeCommerceCounts/);
  assert.match(header,/counts!==null&&<i>/);
  assert.match(counts,/localStorage\.getItem/);
  assert.match(counts,/localStorage\.setItem/);
});

test("carrinho exige sessão, atualiza rápido e permite excluir itens",async()=>{
  const [actions,cartPage,cartApi]=await Promise.all([read("components/product-actions.tsx"),read("components/cart-page-client.tsx"),read("app/api/cart/route.ts")]);
  assert.match(actions,/sa:commerce-optimistic/);
  assert.match(actions,/Adicionado ao carrinho/);
  assert.match(actions,/loginUrl\(action\)/);
  assert.match(cartPage,/method:"DELETE"/);
  assert.match(cartPage,/setItems\(current=>current\.filter/);
  assert.match(cartApi,/authenticatedCustomer/);
  assert.match(cartApi,/deleteMany/);
});

test("favoritos usam atualização otimista com reversão em caso de erro",async()=>{
  const [card,account]=await Promise.all([read("components/product-card.tsx"),read("components/account-dashboard.tsx")]);
  assert.match(card,/const optimistic=!previous/);
  assert.match(card,/setFavorite\(previous\)/);
  assert.match(account,/favorites:current\.favorites\.filter/);
  assert.match(account,/favorites:\[removed,\.\.\.current\.favorites\]/);
});

test("cards deixam produtos sem estoque visualmente indisponíveis",async()=>{
  const [card,styles]=await Promise.all([read("components/product-card.tsx"),read("app/actions.css")]);
  assert.match(card,/product-card-sold-out/);
  assert.match(card,/Produto indisponível/);
  assert.match(card,/product\.stock<1/);
  assert.match(styles,/grayscale\(1\)/);
  assert.match(styles,/product-card-sold-out \.add/);
});

test("áreas de cliente e administração continuam presentes e protegidas",async()=>{
  for(const path of ["app/conta/page.tsx","app/admin/page.tsx","app/api/account/route.ts","app/api/admin/route.ts","components/session-timeout.tsx"])await access(new URL(`../${path}`,import.meta.url));
  const [account,admin]=await Promise.all([read("components/account-dashboard.tsx"),read("components/admin-dashboard.tsx")]);
  assert.match(account,/window\.location\.href="\/entrar"/);
  assert.match(admin,/window\.location\.href="\/entrar"/);
  assert.match(admin,/response\.status===403/);
});

test("checkout usa InfinitePay e confirma pagamentos antes de aprovar pedidos",async()=>{
  const [checkout,infinitepay,webhook,form]=await Promise.all([
    read("app/api/checkout/route.ts"),read("lib/infinitepay.ts"),
    read("app/api/payments/infinitepay/webhook/route.ts"),read("components/checkout-form.tsx")
  ]);
  assert.match(checkout,/createInfinitePayLink/);
  assert.match(checkout,/provider: "INFINITEPAY"/);
  assert.match(infinitepay,/payment_check/);
  assert.match(infinitepay,/checkout\.infinitepay\.io/);
  assert.match(infinitepay,/O valor confirmado não corresponde ao pedido/);
  assert.match(webhook,/confirmInfinitePayOrder/);
  assert.match(form,/window\.location\.href = body\.paymentUrl/);
  assert.match(form,/Em até 4x sem juros/);
});

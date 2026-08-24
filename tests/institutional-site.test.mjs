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
  assert.match(admin,/window\.location\.href\s*=\s*"\/entrar"/);
  assert.match(admin,/response\.status\s*===\s*403/);
});

test("cadastro não exibe erro depois de criar a conta",async()=>{
  const [form,accountAuth]=await Promise.all([read("components/auth-form.tsx"),read("lib/account-auth.ts")]);
  assert.match(form,/if\(!result\.session\)/);
  assert.match(form,/Conta criada com sucesso/);
  assert.doesNotMatch(form,/if\(!result\.session\)[\s\S]{0,200}signInWithPassword/);
  assert.match(accountAuth,/findUnique\(\{ where: \{ id: profile\.id \} \}\)/);
  assert.match(accountAuth,/error\.code === "P2002"/);
  assert.doesNotMatch(accountAuth,/prisma\.user\.upsert/);
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

test("venda externa usa preço presencial e preserva histórico financeiro",async()=>{
  const [schema,admin,route,styles]=await Promise.all([
    read("prisma/schema.prisma"),read("components/admin-dashboard.tsx"),
    read("app/api/admin/external-sales/route.ts"),read("app/globals.css")
  ]);
  assert.match(schema,/inPersonPrice\s+Decimal/);
  assert.match(admin,/unitPrice: product\.inPersonPrice/);
  assert.match(admin,/Preço no site:/);
  assert.match(admin,/Buscar cliente por nome, telefone ou CPF/);
  assert.match(admin,/Adicionar outra forma de pagamento/);
  assert.match(admin,/Resumo da venda/);
  assert.match(route,/originalInPersonPrice/);
  assert.match(route,/sitePrice/);
  assert.match(route,/changeCents/);
  assert.match(route,/registeredBy: admin\.id/);
  assert.match(styles,/grid-template-columns:minmax\(0,7fr\) minmax\(280px,3fr\)/);
  assert.match(styles,/external-sale-summary\{position:sticky/);
});

test("ações administrativas atualizam a interface sem carregamento global",async()=>{
  const [dashboard,productsRoute,adminRoute,splash,schema]=await Promise.all([
    read("components/admin-dashboard.tsx"),read("app/api/admin/products/route.ts"),
    read("app/api/admin/route.ts"),read("components/splash-screen.tsx"),read("prisma/schema.prisma")
  ]);
  assert.doesNotMatch(dashboard,/load\(true\)/);
  assert.doesNotMatch(dashboard,/await load\(\)/);
  assert.match(dashboard,/optimistic\?: \(current: AdminData\) => AdminData/);
  assert.match(dashboard,/cachedAdminData/);
  assert.match(dashboard,/setProductFormKey\(\(current\) => current \+ 1\)/);
  assert.match(dashboard,/key=\{`\$\{editingProduct\?\.id \|\| "new"\}:\$\{productFormKey\}`\}/);
  assert.match(dashboard,/URL\.revokeObjectURL/);
  assert.match(dashboard,/result\?\.product/);
  assert.match(dashboard,/orders: current\.orders\.map/);
  assert.match(dashboard,/products: current\.products\.filter/);
  assert.match(dashboard,/coupons: current\.coupons\.filter/);
  assert.match(productsRoute,/prisma\.cartItem\.deleteMany/);
  assert.match(productsRoute,/prisma\.review\.deleteMany/);
  assert.match(productsRoute,/revalidatePath\("\/"\)/);
  assert.match(productsRoute,/deletedAt: new Date\(\)/);
  assert.match(adminRoute,/where: \{ deletedAt: null \}/);
  assert.match(schema,/deletedAt\s+DateTime\?/);
  assert.match(splash,/pathname\.startsWith\("\/admin"\)/);
});

test("avaliações da loja e dos perfumes exigem cliente autenticado",async()=>{
  const [form,route,home,product,schema]=await Promise.all([
    read("components/review-form.tsx"),read("app/api/reviews/route.ts"),
    read("app/page.tsx"),read("app/produto/[slug]/page.tsx"),read("prisma/schema.prisma")
  ]);
  assert.match(form,/Entrar para avaliar/);
  assert.match(form,/authorization:`Bearer \$\{token\}`/);
  assert.match(route,/authenticatedCustomer/);
  assert.match(route,/status:401/);
  assert.match(route,/rating<1\|\|rating>5/);
  assert.match(route,/userId_targetKey/);
  assert.match(home,/<ReviewForm target="store"/);
  assert.match(product,/<ReviewForm target="product"/);
  assert.match(schema,/@@unique\(\[userId, targetKey\]\)/);
});

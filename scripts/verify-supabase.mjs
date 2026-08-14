import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const productCount = await prisma.product.count();
const rls = await prisma.$queryRawUnsafe(`select count(*)::int as enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity`);
console.log(JSON.stringify({ productCount, rlsEnabledTables: rls[0]?.enabled ?? 0 }));
await prisma.$disconnect();

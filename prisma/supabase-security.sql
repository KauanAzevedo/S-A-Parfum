-- A aplicação acessa o banco somente pelo servidor via Prisma.
-- Nenhuma tabela comercial deve ser exposta diretamente pela Data API.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;

alter table public."User" enable row level security;
alter table public."Address" enable row level security;
alter table public."Category" enable row level security;
alter table public."Product" enable row level security;
alter table public."ProductImage" enable row level security;
alter table public."Cart" enable row level security;
alter table public."CartItem" enable row level security;
alter table public."Order" enable row level security;
alter table public."OrderItem" enable row level security;
alter table public."Payment" enable row level security;
alter table public."Shipment" enable row level security;
alter table public."Coupon" enable row level security;
alter table public."Review" enable row level security;
alter table public."ReturnRequest" enable row level security;
alter table public."Refund" enable row level security;
alter table public."AdminSettings" enable row level security;
alter table public."AuditLog" enable row level security;
alter table public."OrderSequence" enable row level security;

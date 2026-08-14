# Plano de implementação

1. Fundação: Next.js App Router, TypeScript, Tailwind, componentes acessíveis e identidade premium.
2. Dados: esquema PostgreSQL, enums, índices, chaves estrangeiras, exclusão lógica, seed e Storage.
3. Segurança: Supabase Auth, cookies seguros, middleware, papéis, RLS, funções transacionais e auditoria.
4. Experiência pública: início, serviços, história, equipe, galeria, contato, SEO e políticas LGPD.
5. Agendamento: seleção múltipla, profissional, data, horário, totais e confirmação transacional.
6. Cliente: próximos horários, histórico, perfil, privacidade, cancelamento e reagendamento.
7. Operação: agenda, clientes, equipe, serviços, mensagens, notificações, cupons e configurações.
8. Gestão: financeiro, comissões, indicadores, relatórios e insights com dados reais.
9. Qualidade: testes de regras, estados de erro, acessibilidade, responsividade e build.
10. Entrega: configuração Supabase, variáveis, cron, Vercel e checklist de produção.

As integrações de e-mail e WhatsApp usam adaptadores configuráveis; sem credenciais, o sistema mantém o fallback `wa.me`.



## Plano: portar a primeira tela do HubVanzak para React e ver seu webapp funcionando

### Objetivo
Substituir o placeholder do template por uma versão React mínima do HubVanzak — login + dashboard vazio — para você finalmente ver "seu" app no preview, e estabelecer o esqueleto onde as próximas páginas serão portadas.

### Escopo desta fase (Fase 1 — MVP visual + Auth)

**1. Ativar Lovable Cloud**
- Cria backend gerenciado (banco + autenticação) sem você precisar de conta Supabase externa.
- Substitui a necessidade do `supabase_migration.sql` por enquanto (criamos só as tabelas conforme cada página é portada).

**2. Criar autenticação (login + signup)**
- Página `/auth` com email + senha (igual ao `src/layout/auth.js` legado).
- Sessão persistente via Supabase Auth.
- Auto-confirmação de email habilitada para acelerar testes.

**3. Layout base do app (Sidebar + Topbar + área principal)**
- Portar `src/layout/nav.js` → componente `<AppSidebar>` usando shadcn `sidebar.tsx`.
- Portar `src/layout/topbar.js` → componente `<Topbar>` (título da página, troca de idioma/moeda).
- Wrapper `<AppLayout>` que envolve as rotas autenticadas.

**4. Dashboard placeholder funcional**
- Portar estrutura básica de `src/pages/dashboard/DashboardPage.js` para `src/pages/Dashboard.tsx`.
- Por enquanto só os cards/skeletons (sem dados reais ainda).

**5. Roteamento e proteção**
- `/` → redireciona para `/dashboard` se logado, senão `/auth`.
- `/auth` → tela de login/signup.
- `/dashboard` → tela principal protegida.
- `<ProtectedRoute>` que verifica sessão Supabase.

**6. i18n mínimo**
- Portar `src/core/i18n.js` (TRANSLATIONS pt-BR / en-US) para `src/lib/i18n.ts` + hook `useTranslation`.

### Fora do escopo desta fase (vem depois, uma a uma)
Companies, Employees, Documents, Billing, OrgChart, Backup, AuditLog, Fiscal, Legal, Personal, Tasks, Tools — cada uma será portada como fase própria, lendo o `.js` legado correspondente.

### Estrutura de arquivos resultante

```text
src/
├── App.tsx                    (atualizado: novas rotas)
├── pages/
│   ├── Auth.tsx               (NOVO — login/signup)
│   ├── Dashboard.tsx          (NOVO — porta DashboardPage.js)
│   ├── Index.tsx              (atualizado: redireciona)
│   └── NotFound.tsx           (mantido)
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx      (NOVO — sidebar+topbar wrapper)
│   │   ├── AppSidebar.tsx     (NOVO — porta nav.js)
│   │   └── Topbar.tsx         (NOVO — porta topbar.js)
│   └── auth/
│       └── ProtectedRoute.tsx (NOVO)
├── lib/
│   ├── i18n.ts                (NOVO — porta core/i18n.js)
│   └── supabase.ts            (auto-criado pelo Cloud)
└── hooks/
    └── useAuth.ts             (NOVO — sessão Supabase)
```

### Detalhes técnicos
- Lovable Cloud precisa ser ativado pelo usuário (1 clique) — sem ele, não dá para fazer Auth.
- `roles` em tabela separada (`user_roles` + `app_role` enum + função `has_role`) seguindo as regras de segurança — preparado já agora mesmo se houver multi-tenant no HubVanzak.
- Arquivos legados (`src/layout/*.js`, `src/pages/**/*.js`, `src/core/*.js`, `app.js`, `main.js`, `style.css`) **continuam intactos como referência** — apago um a um conforme cada página é portada e validada por você.
- Estilo: usar tokens semânticos do `index.css` + `tailwind.config.ts` em vez das CSS vars antigas (`--brand`, `--surface`); mapeio uma para a outra na fase de polish visual.

### O que você verá no preview ao final desta fase
1. Acessa `/` → é redirecionado para `/auth`.
2. Cria conta com email/senha → entra automaticamente.
3. Vê o layout do HubVanzak (sidebar à esquerda com itens do menu, topbar com troca de idioma) e o dashboard com cards vazios.
4. Pode dar logout pela sidebar.

### Próximas fases (resumo)
- **Fase 2**: Companies (CRUD completo + tabela `companies` no Cloud)
- **Fase 3**: Employees (CRUD + relação com companies)
- **Fase 4**: Documents + upload (Storage do Cloud)
- **Fase 5+**: Billing, Finance, Fiscal, Legal, Personal, Tasks, Tools (uma por fase)
- **Fase final**: remover pasta legada, polish visual, testes


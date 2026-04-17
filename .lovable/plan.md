

## Plano: Migrar todas as 16 páginas restantes para React + Lovable Cloud

### Situação atual
- **Portados**: Dashboard, Companies, Employees, Documents, Tasks, OrgChart (6 páginas)
- **Faltam**: 16 páginas referenciadas na sidebar que ainda levam a 404

### Estratégia de banco de dados

As páginas legadas usam IndexedDB (`db.config.get('chave')`) como key-value store. Para migrar sem criar 16 tabelas individuais, vou usar uma **tabela genérica `user_config`** para as páginas que guardam dados em JSON (seguros, imóveis, valuations, personal docs, health plans, assessores, despesas, investimentos), e tabelas dedicadas para fiscal/legal/billing que têm estrutura relacional.

**Migração 1 — tabela `user_config`** (key-value JSONB por usuário):
```sql
CREATE TABLE user_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chave text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, chave)
);
-- RLS: user_id = auth.uid()
```

**Migração 2 — tabela `fiscal_docs`** (para Fiscal Tax, Jurídico, Trademarks, Acordo Gaveta, Tax Planning, CheckBox):
```sql
CREATE TABLE fiscal_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  subcategoria text NOT NULL,
  jurisdicao text DEFAULT 'BR',
  ano text,
  status text DEFAULT 'ativo',
  descricao text,
  file_path text,
  file_size bigint,
  file_type text,
  notas text,
  vencimento date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Migração 3 — tabela `transacoes`** (para Billing):
```sql
CREATE TABLE transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  tipo text NOT NULL DEFAULT 'receita',
  descricao text,
  valor numeric DEFAULT 0,
  moeda text DEFAULT 'BRL',
  data date,
  categoria text,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Páginas a criar (agrupadas em batches)

**Batch 1 — Personal (7 páginas)**
| Rota | Arquivo | Dados via |
|------|---------|-----------|
| `/personal/docs` | `PersonalDocs.tsx` | `user_config` (chaves: pessoas, assessores, proximas_obrigacoes, healthPlan) |
| `/personal/life` | `LifeInsurance.tsx` | `user_config` (chave: lifeInsurance_data) |
| `/personal/car` | `CarInsurance.tsx` | `user_config` (chave: carInsurance_data) |
| `/personal/apt` | `AptInsurance.tsx` | `user_config` (chave: aptInsurance_data) |
| `/personal/investments` | `Investments.tsx` | `user_config` (chave: investments) |
| `/personal/realestate` | `RealEstate.tsx` | `user_config` (chave: imoveis) |
| `/valuations` | `Valuations.tsx` | `user_config` (chave: valuations) |

**Batch 2 — Fiscal + Legal (5 páginas)**
| Rota | Arquivo | Dados via |
|------|---------|-----------|
| `/fiscal/tax` | `FiscalTax.tsx` | `fiscal_docs` |
| `/fiscal/planning` | `TaxPlanning.tsx` | `fiscal_docs` |
| `/fiscal/checkbox` | `CheckBox.tsx` | `fiscal_docs` |
| `/legal/juridico` | `Juridico.tsx` | `fiscal_docs` |
| `/legal/acordo` | `AcordoGaveta.tsx` | `fiscal_docs` |
| `/legal/trademarks` | `Trademarks.tsx` | `fiscal_docs` |

**Batch 3 — Finance + Tools (3 páginas)**
| Rota | Arquivo | Dados via |
|------|---------|-----------|
| `/finance/fixed` | `FixedExpenses.tsx` | `user_config` (chave: despesas_fixas) |
| `/tools/backup` | `Backup.tsx` | export/import via Supabase |
| `/tools/audit` | `AuditLog.tsx` | `user_config` ou tabela dedicada |

### Para cada página
1. Criar `src/features/{domain}/api.ts` com funções CRUD usando Supabase
2. Criar `src/pages/{PageName}.tsx` portando a UI legada para React + shadcn + Tailwind
3. Registrar rota protegida em `App.tsx`

### Padrão de componente
Cada página segue o padrão já estabelecido:
- `AppLayout` wrapper com título
- `useQuery` / `useMutation` do React Query
- Dialog do shadcn para formulários
- Table ou Card grid para listagem
- Toast para feedback

### Ordem de execução
1. Criar as 3 migrações SQL (user_config, fiscal_docs, transacoes)
2. Criar helper genérico `src/features/config/api.ts` para CRUD no user_config
3. Batch 1 — 7 páginas personal
4. Batch 2 — 5 páginas fiscal/legal
5. Batch 3 — 3 páginas finance/tools
6. Atualizar `App.tsx` com todas as 16 rotas

### Nota sobre o build error
O erro `dist upload failed: generate R2 credentials` é um timeout temporário do serviço de deploy (Cloudflare R2), não do código. Se resolver sozinho na próxima build; não requer alteração de código.


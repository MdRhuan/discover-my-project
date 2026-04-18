-- =========================================================
-- HUB EMPRESARIAL - schema completo
-- =========================================================

-- Helper: trigger para updated_at
-- (usa public.update_updated_at_column já existente)

-- ---------- empresas ----------
CREATE TABLE public.empresas (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT 'BR',
  cnpj TEXT,
  ein TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  cidade TEXT,
  estado TEXT,
  website TEXT,
  legal_type TEXT,
  tax_regime TEXT,
  fundacao TEXT,
  setor TEXT,
  notas TEXT,
  inscricao_estadual TEXT,
  obrigacoes_acessorias TEXT,
  ano_calendario TEXT,
  data_encerramento TEXT,
  ctb_election TEXT,
  cfc_class TEXT,
  cfc_flag BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_empresas_select" ON public.empresas FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_empresas_insert" ON public.empresas FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_empresas_update" ON public.empresas FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_empresas_delete" ON public.empresas FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_empresas_owner ON public.empresas(owner_id);

-- ---------- funcionarios ----------
CREATE TABLE public.funcionarios (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  departamento TEXT,
  salario NUMERIC,
  moeda_salario TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  admissao TEXT,
  email TEXT,
  telefone TEXT,
  documento TEXT,
  pais TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_func_select" ON public.funcionarios FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_func_insert" ON public.funcionarios FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_func_update" ON public.funcionarios FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_func_delete" ON public.funcionarios FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_funcionarios_updated BEFORE UPDATE ON public.funcionarios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_func_owner ON public.funcionarios(owner_id);

-- ---------- documentos ----------
CREATE TABLE public.documentos (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  versao TEXT,
  data_upload TEXT,
  tamanho TEXT,
  tipo TEXT,
  descricao TEXT,
  vencimento TEXT,
  tags TEXT[],
  status_doc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_doc_select" ON public.documentos FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_doc_insert" ON public.documentos FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_doc_update" ON public.documentos FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_doc_delete" ON public.documentos FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_documentos_updated BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_doc_owner ON public.documentos(owner_id);

-- ---------- transacoes ----------
CREATE TABLE public.transacoes (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'receita',
  categoria TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'BRL',
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tx_select" ON public.transacoes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_tx_insert" ON public.transacoes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_tx_update" ON public.transacoes FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_tx_delete" ON public.transacoes FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_transacoes_updated BEFORE UPDATE ON public.transacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tx_owner ON public.transacoes(owner_id);

-- ---------- org_nodes ----------
CREATE TABLE public.org_nodes (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE CASCADE,
  parent_id BIGINT,
  nome TEXT NOT NULL,
  cargo TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_org_select" ON public.org_nodes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_org_insert" ON public.org_nodes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_org_update" ON public.org_nodes FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_org_delete" ON public.org_nodes FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_org_nodes_updated BEFORE UPDATE ON public.org_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- org_texts ----------
CREATE TABLE public.org_texts (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT,
  chave TEXT,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.org_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_orgtx_select" ON public.org_texts FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_orgtx_insert" ON public.org_texts FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_orgtx_update" ON public.org_texts FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_orgtx_delete" ON public.org_texts FOR DELETE USING (auth.uid() = owner_id);

-- ---------- tasks ----------
CREATE TABLE public.tasks (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendente',
  responsavel TEXT,
  vencimento TEXT,
  categoria TEXT,
  tipo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_task_select" ON public.tasks FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_task_insert" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_task_update" ON public.tasks FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_task_delete" ON public.tasks FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_task_owner ON public.tasks(owner_id);

-- ---------- alertas ----------
CREATE TABLE public.alertas (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'info',
  lido BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TEXT NOT NULL,
  modulo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_alerta_select" ON public.alertas FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_alerta_insert" ON public.alertas FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_alerta_update" ON public.alertas FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_alerta_delete" ON public.alertas FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_alertas_updated BEFORE UPDATE ON public.alertas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- docs_pessoais ----------
CREATE TABLE public.docs_pessoais (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pessoa TEXT NOT NULL,
  categoria TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT,
  descricao TEXT,
  data_upload TEXT,
  tamanho TEXT,
  status TEXT,
  vencimento TEXT,
  conteudo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.docs_pessoais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_dp_select" ON public.docs_pessoais FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_dp_insert" ON public.docs_pessoais FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_dp_update" ON public.docs_pessoais FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_dp_delete" ON public.docs_pessoais FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_dp_updated BEFORE UPDATE ON public.docs_pessoais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- fiscal_docs ----------
CREATE TABLE public.fiscal_docs (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategoria TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT,
  jurisdicao TEXT,
  ano TEXT,
  descricao TEXT,
  data_upload TEXT,
  tamanho TEXT,
  status TEXT,
  responsavel TEXT,
  vencimento TEXT,
  conteudo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fiscal_docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_fd_select" ON public.fiscal_docs FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_fd_insert" ON public.fiscal_docs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_fd_update" ON public.fiscal_docs FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_fd_delete" ON public.fiscal_docs FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_fd_updated BEFORE UPDATE ON public.fiscal_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- trademarks ----------
CREATE TABLE public.trademarks (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa_id BIGINT REFERENCES public.empresas(id) ON DELETE SET NULL,
  numero TEXT,
  classe TEXT,
  jurisdicao TEXT,
  status TEXT,
  data_deposito TEXT,
  data_vencimento TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trademarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_tm_select" ON public.trademarks FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_tm_insert" ON public.trademarks FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_tm_update" ON public.trademarks FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_tm_delete" ON public.trademarks FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_tm_updated BEFORE UPDATE ON public.trademarks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- audit_log ----------
CREATE TABLE public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  modulo TEXT,
  timestamp TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_audit_select" ON public.audit_log FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_audit_insert" ON public.audit_log FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_audit_delete" ON public.audit_log FOR DELETE USING (auth.uid() = owner_id);
CREATE INDEX idx_audit_owner_ts ON public.audit_log(owner_id, created_at DESC);

-- ---------- config ----------
CREATE TABLE public.config (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chave TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, chave)
);
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_cfg_select" ON public.config FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "own_cfg_insert" ON public.config FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "own_cfg_update" ON public.config FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "own_cfg_delete" ON public.config FOR DELETE USING (auth.uid() = owner_id);
CREATE TRIGGER trg_cfg_updated BEFORE UPDATE ON public.config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
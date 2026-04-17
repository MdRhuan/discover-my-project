
-- =============================================
-- TABLE 1: user_config (key-value JSONB genérico)
-- =============================================
CREATE TABLE public.user_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chave text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, chave)
);

ALTER TABLE public.user_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own config" ON public.user_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own config" ON public.user_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own config" ON public.user_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own config" ON public.user_config FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_config_updated_at BEFORE UPDATE ON public.user_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE 2: fiscal_docs (fiscal, legal, trademarks)
-- =============================================
CREATE TABLE public.fiscal_docs (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fiscal_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fiscal_docs" ON public.fiscal_docs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own fiscal_docs" ON public.fiscal_docs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own fiscal_docs" ON public.fiscal_docs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own fiscal_docs" ON public.fiscal_docs FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_fiscal_docs_updated_at BEFORE UPDATE ON public.fiscal_docs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TABLE 3: transacoes (billing/finance)
-- =============================================
CREATE TABLE public.transacoes (
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transacoes" ON public.transacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transacoes" ON public.transacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transacoes" ON public.transacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transacoes" ON public.transacoes FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_transacoes_updated_at BEFORE UPDATE ON public.transacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

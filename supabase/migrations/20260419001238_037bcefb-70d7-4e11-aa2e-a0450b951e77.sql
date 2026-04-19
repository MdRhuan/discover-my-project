CREATE TABLE public.pessoas (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  label TEXT,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  -- Dados Brasileiros
  cpf TEXT,
  rg TEXT,
  data_nascimento TEXT,
  naturalidade TEXT,
  nacionalidade TEXT,
  estado_civil TEXT,
  conjuge TEXT,
  -- Dados Americanos
  ssn TEXT,
  passaporte_br TEXT,
  passaporte_us TEXT,
  residencia_fiscal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_pessoas_select ON public.pessoas FOR SELECT TO authenticated
  USING (public.is_authorized(auth.uid()));

CREATE POLICY shared_pessoas_insert ON public.pessoas FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized(auth.uid()));

CREATE POLICY shared_pessoas_update ON public.pessoas FOR UPDATE TO authenticated
  USING (public.is_authorized(auth.uid()));

CREATE POLICY shared_pessoas_delete ON public.pessoas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON public.pessoas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pessoas_ordem ON public.pessoas(ordem);
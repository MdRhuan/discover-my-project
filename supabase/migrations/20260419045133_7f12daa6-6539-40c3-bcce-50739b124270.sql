-- Tabela de planos de saúde
CREATE TABLE public.health_plans (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  pessoa TEXT NOT NULL,
  operadora TEXT NOT NULL,
  nome_plano TEXT,
  modalidade TEXT,
  status TEXT DEFAULT 'ativo',
  beneficiario_principal TEXT,
  dependentes TEXT,
  acomodacao TEXT,
  vigencia_inicio TEXT,
  vigencia_fim TEXT,
  mensalidade NUMERIC,
  moeda TEXT DEFAULT 'BRL',
  coparticipacao BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_hp_select" ON public.health_plans FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_hp_insert" ON public.health_plans FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_hp_update" ON public.health_plans FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_hp_delete" ON public.health_plans FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_health_plans_updated
  BEFORE UPDATE ON public.health_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_health_plans_pessoa ON public.health_plans(pessoa);

-- Permite vincular documentos do bucket de seguros a um plano de saúde
ALTER TABLE public.insurance_docs ADD COLUMN IF NOT EXISTS health_plan_id BIGINT REFERENCES public.health_plans(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_insurance_docs_health_plan ON public.insurance_docs(health_plan_id);
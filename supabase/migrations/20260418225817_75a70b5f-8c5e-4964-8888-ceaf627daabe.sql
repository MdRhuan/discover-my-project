-- Adicionar colunas para organograma societário interativo
ALTER TABLE public.org_nodes
  ADD COLUMN IF NOT EXISTS pos_x numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS cor_borda text,
  ADD COLUMN IF NOT EXISTS cor_fundo text,
  ADD COLUMN IF NOT EXISTS espessura_borda integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS estilo_borda text DEFAULT 'solid';

-- Tornar cargo opcional (pode ser usado como descrição livre)
ALTER TABLE public.org_nodes ALTER COLUMN cargo DROP NOT NULL;
ALTER TABLE public.org_nodes ALTER COLUMN cargo SET DEFAULT '';

-- Tabela para arestas/conexões do organograma
CREATE TABLE IF NOT EXISTS public.org_edges (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  empresa_id BIGINT,
  source_id BIGINT NOT NULL REFERENCES public.org_nodes(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL REFERENCES public.org_nodes(id) ON DELETE CASCADE,
  cor TEXT DEFAULT '#94a3b8',
  espessura INTEGER DEFAULT 2,
  estilo TEXT DEFAULT 'solid',
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_orge_select" ON public.org_edges FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orge_insert" ON public.org_edges FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_orge_update" ON public.org_edges FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orge_delete" ON public.org_edges FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_org_edges_updated_at
  BEFORE UPDATE ON public.org_edges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ETAPA 2: Ícones SVG independentes no canvas do organograma
CREATE TABLE IF NOT EXISTS public.org_icons (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  empresa_id BIGINT,
  nome TEXT,
  svg_content TEXT NOT NULL,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  largura NUMERIC NOT NULL DEFAULT 64,
  altura NUMERIC NOT NULL DEFAULT 64,
  cor TEXT DEFAULT '#0f172a',
  rotacao NUMERIC DEFAULT 0,
  z_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_icons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_orgic_select" ON public.org_icons FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgic_insert" ON public.org_icons FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_orgic_update" ON public.org_icons FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgic_delete" ON public.org_icons FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_org_icons_updated_at
  BEFORE UPDATE ON public.org_icons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
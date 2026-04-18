-- =========================
-- ETAPA 1: Elementos livres do canvas (textos soltos, caixas/bordas, blocos sem empresa)
-- =========================

-- Textos soltos no canvas
CREATE TABLE IF NOT EXISTS public.org_texts_canvas (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  empresa_id BIGINT,
  conteudo TEXT NOT NULL DEFAULT 'Novo texto',
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  largura NUMERIC DEFAULT 200,
  fonte TEXT DEFAULT 'inherit',
  tamanho INTEGER DEFAULT 14,
  cor TEXT DEFAULT '#0f172a',
  alinhamento TEXT DEFAULT 'left',
  negrito BOOLEAN DEFAULT false,
  italico BOOLEAN DEFAULT false,
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_texts_canvas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_orgtxc_select" ON public.org_texts_canvas FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgtxc_insert" ON public.org_texts_canvas FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_orgtxc_update" ON public.org_texts_canvas FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgtxc_delete" ON public.org_texts_canvas FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_org_texts_canvas_updated_at
  BEFORE UPDATE ON public.org_texts_canvas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Caixas / bordas visuais (shapes)
CREATE TABLE IF NOT EXISTS public.org_shapes (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  empresa_id BIGINT,
  rotulo TEXT,
  pos_x NUMERIC NOT NULL DEFAULT 0,
  pos_y NUMERIC NOT NULL DEFAULT 0,
  largura NUMERIC NOT NULL DEFAULT 300,
  altura NUMERIC NOT NULL DEFAULT 200,
  cor_borda TEXT DEFAULT '#94a3b8',
  cor_fundo TEXT DEFAULT 'transparent',
  espessura_borda INTEGER DEFAULT 2,
  estilo_borda TEXT DEFAULT 'dashed',
  raio INTEGER DEFAULT 12,
  opacidade NUMERIC DEFAULT 1,
  z_index INTEGER DEFAULT -1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.org_shapes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_orgsh_select" ON public.org_shapes FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgsh_insert" ON public.org_shapes FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_orgsh_update" ON public.org_shapes FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_orgsh_delete" ON public.org_shapes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_org_shapes_updated_at
  BEFORE UPDATE ON public.org_shapes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permitir blocos org_nodes sem empresa vinculada (blocos livres)
ALTER TABLE public.org_nodes ALTER COLUMN empresa_id DROP NOT NULL;
ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS z_index INTEGER DEFAULT 0;
ALTER TABLE public.org_nodes ADD COLUMN IF NOT EXISTS livre BOOLEAN DEFAULT false;
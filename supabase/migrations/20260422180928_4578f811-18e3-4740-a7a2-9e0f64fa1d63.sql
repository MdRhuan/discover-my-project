
-- Bens Móveis table
CREATE TABLE public.bens_moveis (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  codigo_patrimonial TEXT,
  numero_serie TEXT,
  marca TEXT,
  modelo TEXT,
  categoria TEXT,
  fornecedor TEXT,
  data_compra TEXT,
  valor_aquisicao NUMERIC,
  valor_atual NUMERIC,
  moeda TEXT DEFAULT 'BRL',
  setor_responsavel TEXT,
  colaborador_responsavel TEXT,
  localizacao TEXT,
  vida_util INTEGER,
  metodo_depreciacao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  foto_path TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bens_moveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_bm_select ON public.bens_moveis FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bm_insert ON public.bens_moveis FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_bm_update ON public.bens_moveis FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bm_delete ON public.bens_moveis FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bens_moveis_updated_at BEFORE UPDATE ON public.bens_moveis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Files (documents and photos)
CREATE TABLE public.bens_moveis_files (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  bem_id BIGINT NOT NULL REFERENCES public.bens_moveis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  tipo TEXT,
  tamanho TEXT,
  categoria TEXT,
  data_upload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bens_moveis_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_bmf_select ON public.bens_moveis_files FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmf_insert ON public.bens_moveis_files FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_bmf_update ON public.bens_moveis_files FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmf_delete ON public.bens_moveis_files FOR DELETE TO authenticated USING (is_authorized(auth.uid()));

CREATE TRIGGER update_bens_moveis_files_updated_at BEFORE UPDATE ON public.bens_moveis_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Maintenance history
CREATE TABLE public.bens_moveis_manutencoes (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  bem_id BIGINT NOT NULL REFERENCES public.bens_moveis(id) ON DELETE CASCADE,
  data TEXT,
  descricao TEXT,
  custo NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bens_moveis_manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_bmm_select ON public.bens_moveis_manutencoes FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmm_insert ON public.bens_moveis_manutencoes FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_bmm_update ON public.bens_moveis_manutencoes FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmm_delete ON public.bens_moveis_manutencoes FOR DELETE TO authenticated USING (is_authorized(auth.uid()));

CREATE TRIGGER update_bens_moveis_manutencoes_updated_at BEFORE UPDATE ON public.bens_moveis_manutencoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transfer history
CREATE TABLE public.bens_moveis_transferencias (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  bem_id BIGINT NOT NULL REFERENCES public.bens_moveis(id) ON DELETE CASCADE,
  data TEXT,
  setor_origem TEXT,
  setor_destino TEXT,
  responsavel TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bens_moveis_transferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_bmt_select ON public.bens_moveis_transferencias FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmt_insert ON public.bens_moveis_transferencias FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_bmt_update ON public.bens_moveis_transferencias FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_bmt_delete ON public.bens_moveis_transferencias FOR DELETE TO authenticated USING (is_authorized(auth.uid()));

CREATE TRIGGER update_bens_moveis_transferencias_updated_at BEFORE UPDATE ON public.bens_moveis_transferencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for assets
INSERT INTO storage.buckets (id, name, public) VALUES ('bens-moveis', 'bens-moveis', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "bm_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'bens-moveis' AND is_authorized(auth.uid()));
CREATE POLICY "bm_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bens-moveis' AND is_authorized(auth.uid()));
CREATE POLICY "bm_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'bens-moveis' AND is_authorized(auth.uid()));
CREATE POLICY "bm_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'bens-moveis' AND is_authorized(auth.uid()));

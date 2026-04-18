-- Tabela de metadados de documentos de seguros
CREATE TABLE IF NOT EXISTS public.insurance_docs (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  insurance_type TEXT NOT NULL CHECK (insurance_type IN ('life', 'apt', 'car')),
  apolice_id BIGINT,
  apolice_label TEXT,
  nome TEXT NOT NULL,
  categoria TEXT,
  observacoes TEXT,
  arquivo_path TEXT NOT NULL,
  tipo TEXT,
  tamanho TEXT,
  data_upload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurance_docs_type ON public.insurance_docs(insurance_type);
CREATE INDEX IF NOT EXISTS idx_insurance_docs_apolice ON public.insurance_docs(apolice_id);

ALTER TABLE public.insurance_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_insdoc_select" ON public.insurance_docs FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_insdoc_insert" ON public.insurance_docs FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_insdoc_update" ON public.insurance_docs FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_insdoc_delete" ON public.insurance_docs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_insurance_docs_updated_at
  BEFORE UPDATE ON public.insurance_docs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket privado de storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-documents', 'insurance-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: qualquer usuário autorizado pode ler/escrever; só admin apaga
CREATE POLICY "ins_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'insurance-documents' AND is_authorized(auth.uid()));

CREATE POLICY "ins_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'insurance-documents' AND is_authorized(auth.uid()));

CREATE POLICY "ins_docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'insurance-documents' AND is_authorized(auth.uid()));

CREATE POLICY "ins_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'insurance-documents' AND has_role(auth.uid(), 'admin'::app_role));
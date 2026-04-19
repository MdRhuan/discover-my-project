-- Expandir tabela trademarks com novos campos para BR e US
ALTER TABLE public.trademarks
  ADD COLUMN IF NOT EXISTS pais text NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS tipo_marca text,
  ADD COLUMN IF NOT EXISTS num_processo text,
  ADD COLUMN IF NOT EXISTS num_registro text,
  ADD COLUMN IF NOT EXISTS valor numeric,
  ADD COLUMN IF NOT EXISTS data_concessao text,
  ADD COLUMN IF NOT EXISTS next_deadline text,
  ADD COLUMN IF NOT EXISTS us_serial_number text,
  ADD COLUMN IF NOT EXISTS us_registration text,
  ADD COLUMN IF NOT EXISTS filing_date text,
  ADD COLUMN IF NOT EXISTS due_date text,
  ADD COLUMN IF NOT EXISTS proposed_goods text;

-- Tabela de arquivos vinculados às marcas
CREATE TABLE IF NOT EXISTS public.trademark_files (
  id bigserial PRIMARY KEY,
  trademark_id bigint NOT NULL REFERENCES public.trademarks(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  arquivo_path text NOT NULL,
  tipo text,
  tamanho text,
  data_upload text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trademark_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_tmf_select" ON public.trademark_files
  FOR SELECT TO authenticated
  USING (is_authorized(auth.uid()));

CREATE POLICY "shared_tmf_insert" ON public.trademark_files
  FOR INSERT TO authenticated
  WITH CHECK (is_authorized(auth.uid()));

CREATE POLICY "shared_tmf_update" ON public.trademark_files
  FOR UPDATE TO authenticated
  USING (is_authorized(auth.uid()));

CREATE POLICY "shared_tmf_delete" ON public.trademark_files
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_trademark_files_trademark_id ON public.trademark_files(trademark_id);

-- Bucket de storage para documentos de marcas (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trademark-documents', 'trademark-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS no bucket: usuários autorizados podem gerenciar
CREATE POLICY "Authorized users can view trademark documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trademark-documents' AND is_authorized(auth.uid()));

CREATE POLICY "Authorized users can upload trademark documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'trademark-documents' AND is_authorized(auth.uid()));

CREATE POLICY "Authorized users can update trademark documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'trademark-documents' AND is_authorized(auth.uid()));

CREATE POLICY "Admins can delete trademark documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'trademark-documents' AND has_role(auth.uid(), 'admin'::app_role));
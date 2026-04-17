-- documentos table
CREATE TABLE public.documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  status_doc TEXT NOT NULL DEFAULT 'Atual'
    CHECK (status_doc IN ('Atual','Pendente Upload','Desatualizado','Substituído','Arquivado')),
  ano_fiscal TEXT,
  versao TEXT NOT NULL DEFAULT '1',
  data_upload DATE NOT NULL DEFAULT CURRENT_DATE,
  file_path TEXT,
  file_size BIGINT,
  file_type TEXT,
  mime_type TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_user_id ON public.documentos(user_id);
CREATE INDEX idx_documentos_company_id ON public.documentos(company_id);
CREATE INDEX idx_documentos_status ON public.documentos(status_doc);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documentos"
  ON public.documentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documentos"
  ON public.documentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documentos"
  ON public.documentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documentos"
  ON public.documentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policies: files are organized as {user_id}/{filename}
CREATE POLICY "Users can view their own document files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload their own document files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own document files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own document files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
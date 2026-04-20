-- Folders for "Em Construção" (companies under construction)
CREATE TABLE public.construction_folders (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  parent_id BIGINT REFERENCES public.construction_folders(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  empresa_nome TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.construction_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_cf_select" ON public.construction_folders FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cf_insert" ON public.construction_folders FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_cf_update" ON public.construction_folders FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cf_delete" ON public.construction_folders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_construction_folders_updated_at BEFORE UPDATE ON public.construction_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Documents inside folders
CREATE TABLE public.construction_documents (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  folder_id BIGINT REFERENCES public.construction_folders(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  empresa_nome TEXT NOT NULL,
  descricao TEXT,
  data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.construction_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_cd_select" ON public.construction_documents FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cd_insert" ON public.construction_documents FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_cd_update" ON public.construction_documents FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cd_delete" ON public.construction_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_construction_documents_updated_at BEFORE UPDATE ON public.construction_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_construction_documents_folder ON public.construction_documents(folder_id);
CREATE INDEX idx_construction_folders_parent ON public.construction_folders(parent_id);

-- Files attached to documents (multiple files per document)
CREATE TABLE public.construction_files (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  document_id BIGINT NOT NULL REFERENCES public.construction_documents(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  tipo TEXT,
  tamanho TEXT,
  data_upload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.construction_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_cfile_select" ON public.construction_files FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cfile_insert" ON public.construction_files FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY "shared_cfile_update" ON public.construction_files FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY "shared_cfile_delete" ON public.construction_files FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_construction_files_updated_at BEFORE UPDATE ON public.construction_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_construction_files_document ON public.construction_files(document_id);

-- Storage bucket for construction documents
INSERT INTO storage.buckets (id, name, public) VALUES ('construction-documents', 'construction-documents', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "construction_docs_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'construction-documents' AND is_authorized(auth.uid()));
CREATE POLICY "construction_docs_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'construction-documents' AND is_authorized(auth.uid()));
CREATE POLICY "construction_docs_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'construction-documents' AND is_authorized(auth.uid()));
CREATE POLICY "construction_docs_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'construction-documents' AND has_role(auth.uid(), 'admin'::app_role));
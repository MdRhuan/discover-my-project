-- Tabela de contatos
CREATE TABLE public.contatos (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  documento TEXT,
  documento_tipo TEXT, -- 'cpf' | 'cnpj'
  tipo TEXT NOT NULL DEFAULT 'cliente', -- cliente, fornecedor, parceiro, funcionario, consultor, prestador, pessoal, outro
  tipo_customizado TEXT,
  empresa_vinculada TEXT,
  empresa_id BIGINT,
  cargo TEXT,
  telefone_principal TEXT,
  telefone_secundario TEXT,
  email_principal TEXT,
  email_secundario TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  pais TEXT DEFAULT 'BR',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contatos_nome ON public.contatos(nome);
CREATE INDEX idx_contatos_tipo ON public.contatos(tipo);
CREATE INDEX idx_contatos_documento ON public.contatos(documento);
CREATE UNIQUE INDEX idx_contatos_doc_unique ON public.contatos(documento) WHERE documento IS NOT NULL AND documento <> '';

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_contatos_select ON public.contatos FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_contatos_insert ON public.contatos FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_contatos_update ON public.contatos FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_contatos_delete ON public.contatos FOR DELETE TO authenticated USING (is_authorized(auth.uid()));

CREATE TRIGGER trg_contatos_updated_at
BEFORE UPDATE ON public.contatos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de tags
CREATE TABLE public.contato_tags (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contato_tags_nome_unique ON public.contato_tags(LOWER(nome));

ALTER TABLE public.contato_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_contato_tags_select ON public.contato_tags FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_contato_tags_insert ON public.contato_tags FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_contato_tags_update ON public.contato_tags FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_contato_tags_delete ON public.contato_tags FOR DELETE TO authenticated USING (is_authorized(auth.uid()));

CREATE TRIGGER trg_contato_tags_updated_at
BEFORE UPDATE ON public.contato_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de relação N:N
CREATE TABLE public.contato_tag_links (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid(),
  contato_id BIGINT NOT NULL REFERENCES public.contatos(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES public.contato_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contato_id, tag_id)
);

CREATE INDEX idx_ctl_contato ON public.contato_tag_links(contato_id);
CREATE INDEX idx_ctl_tag ON public.contato_tag_links(tag_id);

ALTER TABLE public.contato_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY shared_ctl_select ON public.contato_tag_links FOR SELECT TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_ctl_insert ON public.contato_tag_links FOR INSERT TO authenticated WITH CHECK (is_authorized(auth.uid()));
CREATE POLICY shared_ctl_update ON public.contato_tag_links FOR UPDATE TO authenticated USING (is_authorized(auth.uid()));
CREATE POLICY shared_ctl_delete ON public.contato_tag_links FOR DELETE TO authenticated USING (is_authorized(auth.uid()));
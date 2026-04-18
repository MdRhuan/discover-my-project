-- 1. Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Função has_role (security definer evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Função is_authorized: usuário tem qualquer papel?
CREATE OR REPLACE FUNCTION public.is_authorized(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- 5. RLS para user_roles
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Trigger: novo usuário recebe papel 'user' automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 7. Promover usuários EXISTENTES a admin (todos os atuais viram admin)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Reescrever RLS das tabelas de negócio (compartilhado)
-- Padrão: SELECT/INSERT/UPDATE = qualquer autorizado; DELETE = admin

-- empresas
DROP POLICY IF EXISTS own_empresas_select ON public.empresas;
DROP POLICY IF EXISTS own_empresas_insert ON public.empresas;
DROP POLICY IF EXISTS own_empresas_update ON public.empresas;
DROP POLICY IF EXISTS own_empresas_delete ON public.empresas;
CREATE POLICY shared_empresas_select ON public.empresas FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_empresas_insert ON public.empresas FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_empresas_update ON public.empresas FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_empresas_delete ON public.empresas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- funcionarios
DROP POLICY IF EXISTS own_func_select ON public.funcionarios;
DROP POLICY IF EXISTS own_func_insert ON public.funcionarios;
DROP POLICY IF EXISTS own_func_update ON public.funcionarios;
DROP POLICY IF EXISTS own_func_delete ON public.funcionarios;
CREATE POLICY shared_func_select ON public.funcionarios FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_func_insert ON public.funcionarios FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_func_update ON public.funcionarios FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_func_delete ON public.funcionarios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- documentos
DROP POLICY IF EXISTS own_doc_select ON public.documentos;
DROP POLICY IF EXISTS own_doc_insert ON public.documentos;
DROP POLICY IF EXISTS own_doc_update ON public.documentos;
DROP POLICY IF EXISTS own_doc_delete ON public.documentos;
CREATE POLICY shared_doc_select ON public.documentos FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_doc_insert ON public.documentos FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_doc_update ON public.documentos FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_doc_delete ON public.documentos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transacoes
DROP POLICY IF EXISTS own_tx_select ON public.transacoes;
DROP POLICY IF EXISTS own_tx_insert ON public.transacoes;
DROP POLICY IF EXISTS own_tx_update ON public.transacoes;
DROP POLICY IF EXISTS own_tx_delete ON public.transacoes;
CREATE POLICY shared_tx_select ON public.transacoes FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_tx_insert ON public.transacoes FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_tx_update ON public.transacoes FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_tx_delete ON public.transacoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tasks
DROP POLICY IF EXISTS own_task_select ON public.tasks;
DROP POLICY IF EXISTS own_task_insert ON public.tasks;
DROP POLICY IF EXISTS own_task_update ON public.tasks;
DROP POLICY IF EXISTS own_task_delete ON public.tasks;
CREATE POLICY shared_task_select ON public.tasks FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_task_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_task_update ON public.tasks FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_task_delete ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- org_nodes
DROP POLICY IF EXISTS own_org_select ON public.org_nodes;
DROP POLICY IF EXISTS own_org_insert ON public.org_nodes;
DROP POLICY IF EXISTS own_org_update ON public.org_nodes;
DROP POLICY IF EXISTS own_org_delete ON public.org_nodes;
CREATE POLICY shared_org_select ON public.org_nodes FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_org_insert ON public.org_nodes FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_org_update ON public.org_nodes FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_org_delete ON public.org_nodes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- org_texts
DROP POLICY IF EXISTS own_orgtx_select ON public.org_texts;
DROP POLICY IF EXISTS own_orgtx_insert ON public.org_texts;
DROP POLICY IF EXISTS own_orgtx_update ON public.org_texts;
DROP POLICY IF EXISTS own_orgtx_delete ON public.org_texts;
CREATE POLICY shared_orgtx_select ON public.org_texts FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_orgtx_insert ON public.org_texts FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_orgtx_update ON public.org_texts FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_orgtx_delete ON public.org_texts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- alertas
DROP POLICY IF EXISTS own_alerta_select ON public.alertas;
DROP POLICY IF EXISTS own_alerta_insert ON public.alertas;
DROP POLICY IF EXISTS own_alerta_update ON public.alertas;
DROP POLICY IF EXISTS own_alerta_delete ON public.alertas;
CREATE POLICY shared_alerta_select ON public.alertas FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_alerta_insert ON public.alertas FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_alerta_update ON public.alertas FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_alerta_delete ON public.alertas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- docs_pessoais
DROP POLICY IF EXISTS own_dp_select ON public.docs_pessoais;
DROP POLICY IF EXISTS own_dp_insert ON public.docs_pessoais;
DROP POLICY IF EXISTS own_dp_update ON public.docs_pessoais;
DROP POLICY IF EXISTS own_dp_delete ON public.docs_pessoais;
CREATE POLICY shared_dp_select ON public.docs_pessoais FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_dp_insert ON public.docs_pessoais FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_dp_update ON public.docs_pessoais FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_dp_delete ON public.docs_pessoais FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- fiscal_docs
DROP POLICY IF EXISTS own_fd_select ON public.fiscal_docs;
DROP POLICY IF EXISTS own_fd_insert ON public.fiscal_docs;
DROP POLICY IF EXISTS own_fd_update ON public.fiscal_docs;
DROP POLICY IF EXISTS own_fd_delete ON public.fiscal_docs;
CREATE POLICY shared_fd_select ON public.fiscal_docs FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_fd_insert ON public.fiscal_docs FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_fd_update ON public.fiscal_docs FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_fd_delete ON public.fiscal_docs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- trademarks
DROP POLICY IF EXISTS own_tm_select ON public.trademarks;
DROP POLICY IF EXISTS own_tm_insert ON public.trademarks;
DROP POLICY IF EXISTS own_tm_update ON public.trademarks;
DROP POLICY IF EXISTS own_tm_delete ON public.trademarks;
CREATE POLICY shared_tm_select ON public.trademarks FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_tm_insert ON public.trademarks FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_tm_update ON public.trademarks FOR UPDATE TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_tm_delete ON public.trademarks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- audit_log (sem update por padrão; mantém)
DROP POLICY IF EXISTS own_audit_select ON public.audit_log;
DROP POLICY IF EXISTS own_audit_insert ON public.audit_log;
DROP POLICY IF EXISTS own_audit_delete ON public.audit_log;
CREATE POLICY shared_audit_select ON public.audit_log FOR SELECT TO authenticated USING (public.is_authorized(auth.uid()));
CREATE POLICY shared_audit_insert ON public.audit_log FOR INSERT TO authenticated WITH CHECK (public.is_authorized(auth.uid()));
CREATE POLICY shared_audit_delete ON public.audit_log FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- config: PERMANECE PESSOAL (cada usuário tem suas preferências)
-- Mantém políticas existentes own_cfg_*
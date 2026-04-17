CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  departamento TEXT,
  salario NUMERIC(14,2),
  moeda_salario TEXT NOT NULL DEFAULT 'BRL' CHECK (moeda_salario IN ('BRL','USD')),
  admissao DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  email TEXT,
  telefone TEXT,
  pais TEXT NOT NULL DEFAULT 'BR' CHECK (pais IN ('BR','US')),
  documento TEXT,
  arquivado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_funcionarios_user_id ON public.funcionarios(user_id);
CREATE INDEX idx_funcionarios_company_id ON public.funcionarios(company_id);
CREATE INDEX idx_funcionarios_arquivado ON public.funcionarios(arquivado);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funcionarios"
  ON public.funcionarios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funcionarios"
  ON public.funcionarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funcionarios"
  ON public.funcionarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funcionarios"
  ON public.funcionarios FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_funcionarios_updated_at
  BEFORE UPDATE ON public.funcionarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
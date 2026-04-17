-- ============================================================
-- Hub Empresarial — Supabase Migration (v2 — completo e verificado)
-- Execute no: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════
-- FUNÇÃO UTILITÁRIA: updated_at automático
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


-- ════════════════════════════════════════════════════════════
-- 1. EMPRESAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS empresas (
  id                      BIGSERIAL PRIMARY KEY,
  owner_id                UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome                    TEXT NOT NULL,
  pais                    TEXT NOT NULL DEFAULT 'BR',
  cnpj                    TEXT,
  ein                     TEXT,
  status                  TEXT DEFAULT 'ativa',
  status_reg              TEXT DEFAULT 'ativo',
  legal_type              TEXT,
  estado                  TEXT,
  cidade                  TEXT,
  setor                   TEXT,
  website                 TEXT,
  email                   TEXT,
  telefone                TEXT,
  fundacao                DATE,
  data_encerramento       DATE,
  inscricao_estadual      TEXT,
  tax_regime              TEXT,
  ctb_election            TEXT,
  ano_calendario          TEXT,
  apuracao                TEXT,
  cfc_class               TEXT,
  cfc_flag                BOOLEAN DEFAULT FALSE,
  obrigacoes_acessorias   TEXT,
  tags                    TEXT[]  DEFAULT '{}',
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_empresas_updated BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── SOCIOS (array de empresas.socios normalizado) ─────────────
CREATE TABLE IF NOT EXISTS socios (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  percentual  NUMERIC(5,2),
  documento   TEXT,
  tipo        TEXT DEFAULT 'pessoa-fisica',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── FISCAL OBRIGACOES por empresa ────────────────────────────
CREATE TABLE IF NOT EXISTS fiscal_obrigacoes (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao   TEXT NOT NULL,
  tipo        TEXT,   -- Federal/Estadual/Municipal/IRS/IR Brasil/FBAR/FATCA/ECF/ECD/Outro
  prazo       DATE,
  status      TEXT DEFAULT 'Pendente', -- Pendente/Em Andamento/Entregue/Pago
  assessor    TEXT,
  valor_pago  NUMERIC(15,2),
  moeda       TEXT DEFAULT 'BRL',
  ano_fiscal  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_fiscal_obrig_updated BEFORE UPDATE ON fiscal_obrigacoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── COMPLIANCE CHECKLIST por empresa ─────────────────────────
CREATE TABLE IF NOT EXISTS compliance_items (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  descricao   TEXT NOT NULL,
  recorrencia TEXT,   -- Mensal/Trimestral/Semestral/Anual/Único
  prazo       DATE,
  status      TEXT DEFAULT 'Pendente',  -- Pendente/Concluído
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_compliance_updated BEFORE UPDATE ON compliance_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 2. FUNCIONÁRIOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS funcionarios (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  cargo           TEXT,
  departamento    TEXT,
  email           TEXT,
  telefone        TEXT,
  documento       TEXT,
  pais            TEXT DEFAULT 'BR',
  salario         NUMERIC(15,2),
  moeda_salario   TEXT DEFAULT 'BRL',
  admissao        DATE,
  status          TEXT DEFAULT 'ativo',
  status_reg      TEXT DEFAULT 'ativo',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_func_updated BEFORE UPDATE ON funcionarios FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 3. DOCUMENTOS (empresariais)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS documentos (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id      BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  categoria       TEXT,
  subcategoria    TEXT,
  tipo            TEXT,
  mime_type       TEXT,
  storage_path    TEXT,       -- Supabase Storage (substituiu base64)
  nome_arquivo    TEXT,
  tamanho         TEXT,
  data_upload     DATE DEFAULT CURRENT_DATE,
  ano_fiscal      TEXT,
  versao          TEXT,
  status_doc      TEXT DEFAULT 'Atual',
  descricao       TEXT,
  vencimento      DATE,
  tags            TEXT[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_docs_updated BEFORE UPDATE ON documentos FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 4. TRANSAÇÕES / FATURAMENTO
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transacoes (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  tipo        TEXT NOT NULL,   -- receita/despesa
  categoria   TEXT,
  data        DATE NOT NULL,
  valor       NUMERIC(15,2) NOT NULL,
  moeda       TEXT DEFAULT 'BRL',
  descricao   TEXT,
  status_reg  TEXT DEFAULT 'ativo',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_trans_updated BEFORE UPDATE ON transacoes FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 5. TASKS & DEADLINES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS tasks (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  tipo        TEXT,   -- Fiscal/Contábil/Documental/Jurídico/Imigração/Outro
  status      TEXT DEFAULT 'pendente',
  prioridade  TEXT DEFAULT 'media',
  vencimento  DATE,
  responsavel TEXT,
  status_reg  TEXT DEFAULT 'ativo',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS task_anexos (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id       BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tamanho       TEXT,
  tipo          TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 6. ORGANOGRAMA
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS org_nodes (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  parent_id   BIGINT REFERENCES org_nodes(id) ON DELETE SET NULL,
  nome        TEXT,
  cargo       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_texts (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  conteudo    JSONB DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_org_texts_updated BEFORE UPDATE ON org_texts FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 7. ALERTAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS alertas (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  tipo        TEXT,
  lido        BOOLEAN DEFAULT FALSE,
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 8. FISCAL DOCS (jurídico/fiscal/tax planning)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fiscal_docs (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  subcategoria  TEXT,   -- Jurídico/Fiscal/Tax Planning US/Tax Planning BR/Check-the-Box Elections
  jurisdicao    TEXT,   -- BR/US
  tipo          TEXT,
  status        TEXT DEFAULT 'Atual',
  ano           TEXT,
  data_upload   DATE DEFAULT CURRENT_DATE,
  responsavel   TEXT,
  vencimento    DATE,
  descricao     TEXT,
  storage_path  TEXT,
  tamanho       TEXT,
  mime_type     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_fiscal_docs_updated BEFORE UPDATE ON fiscal_docs FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 9. TRADEMARKS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS trademarks (
  id                BIGSERIAL PRIMARY KEY,
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pais              TEXT,
  nome              TEXT NOT NULL,
  titular           TEXT,
  classe            TEXT,         -- classificação NICE
  status            TEXT,
  tipo              TEXT,         -- nominativa/figurativa/mista/tridimensional (BR)
  numero_processo   TEXT,
  numero_registro   TEXT,
  valor             NUMERIC(15,2),
  data_deposito     DATE,
  data_concessao    DATE,
  data_vencimento   DATE,
  next_deadline     DATE,
  due_date          DATE,
  us_serial         TEXT,
  goods_services    TEXT,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_trademarks_updated BEFORE UPDATE ON trademarks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS trademark_files (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trademark_id  BIGINT NOT NULL REFERENCES trademarks(id) ON DELETE CASCADE,
  nome          TEXT,
  tipo          TEXT,
  tamanho       TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 10. DOCS PESSOAIS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS docs_pessoais (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  numero        TEXT,
  tipo          TEXT,
  data_upload   DATE DEFAULT CURRENT_DATE,
  vencimento    DATE,
  descricao     TEXT,
  subcategoria  TEXT,
  pessoa        TEXT,
  categoria     TEXT,
  storage_path  TEXT,
  tamanho       TEXT,
  nome_arquivo  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_docs_pessoais_updated BEFORE UPDATE ON docs_pessoais FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 11. PESSOAS (contatos pessoais)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pessoas (
  id                BIGSERIAL PRIMARY KEY,
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  relacao           TEXT,
  cor               TEXT,
  bg                TEXT,
  notas             TEXT,
  cpf               TEXT,
  rg                TEXT,
  data_nasc         DATE,
  naturalidade      TEXT,
  nacionalidade     TEXT,
  ssn               TEXT,
  passaporte_br     TEXT,
  passaporte_us     TEXT,
  estado_civil      TEXT,
  conjuge_nome      TEXT,
  email             TEXT,
  telefone          TEXT,
  endereco_br       TEXT,
  endereco_us       TEXT,
  profissao         TEXT,
  residente_fiscal  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_pessoas_updated BEFORE UPDATE ON pessoas FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 12. ASSESSORES
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assessores (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  escritorio      TEXT,
  tipo            TEXT,
  contato_nome    TEXT,
  contato_email   TEXT,
  contato_phone   TEXT,
  escopo          TEXT,
  proxima_reuniao DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_assessores_updated BEFORE UPDATE ON assessores FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessor_docs (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessor_id   BIGINT NOT NULL REFERENCES assessores(id) ON DELETE CASCADE,
  nome          TEXT,
  tipo_doc      TEXT,
  tamanho       TEXT,
  tipo          TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 13. VALUATIONS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS valuations (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id  BIGINT REFERENCES empresas(id) ON DELETE SET NULL,
  data        DATE,
  metodo      TEXT,   -- DCF/Múltiplos de Mercado/Patrimônio Líquido/Book Value/Transações Comparáveis/Outro
  valor       NUMERIC(20,2),
  proposito   TEXT,   -- Gestão/Transação/Fiscal/Planejamento Sucessório/Outro
  responsavel TEXT,
  notas       TEXT,
  historico   JSONB DEFAULT '[]',   -- [{data, valor}]
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_valuations_updated BEFORE UPDATE ON valuations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS valuation_docs (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valuation_id  BIGINT NOT NULL REFERENCES valuations(id) ON DELETE CASCADE,
  nome          TEXT,
  tipo          TEXT,
  tamanho       TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 14. IMÓVEIS (real estate)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS imoveis (
  id                BIGSERIAL PRIMARY KEY,
  owner_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endereco          TEXT,
  proprietario      TEXT,
  pais              TEXT DEFAULT 'BR',
  moeda             TEXT DEFAULT 'BRL',
  vl_aquisicao      NUMERIC(20,2),
  dt_aquisicao      DATE,
  vl_mercado        NUMERIC(20,2),
  credor            TEXT,
  saldo_devedor     NUMERIC(20,2),
  parcela           NUMERIC(15,2),
  venc_mortgage     DATE,
  dt_property_tax   DATE,
  dt_insurance      DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_imoveis_updated BEFORE UPDATE ON imoveis FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS imovel_docs (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imovel_id   BIGINT NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
  nome        TEXT,
  tipo_doc    TEXT,
  tamanho     TEXT,
  tipo        TEXT,
  storage_path TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 15. INVESTIMENTOS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS investments (
  id            BIGSERIAL PRIMARY KEY,
  owner_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  classe        TEXT,   -- Renda Fixa/Variável/FIIs/ETFs/BDRs/Previdência/Criptoativos/Outros
  moeda         TEXT DEFAULT 'BRL',
  pais          TEXT DEFAULT 'BR',
  nome          TEXT NOT NULL,
  ticker        TEXT,
  qtd           NUMERIC(20,8),
  preco_medio   NUMERIC(20,8),
  preco_atual   NUMERIC(20,8),
  vl_investido  NUMERIC(20,2),
  vl_atual      NUMERIC(20,2),
  rentab_pct    NUMERIC(10,4),
  dt_vencimento DATE,
  notas         TEXT,
  corretora     TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_investments_updated BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 16. DESPESAS FIXAS
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  categoria   TEXT,
  pais        TEXT DEFAULT 'BR',
  moeda       TEXT DEFAULT 'BRL',
  valor       NUMERIC(15,2),
  recorrencia TEXT,   -- Mensal/Anual
  ativo       BOOLEAN DEFAULT TRUE,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_fixed_exp_updated BEFORE UPDATE ON fixed_expenses FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 17. SEGUROS (vida, carro, apartamento, saúde)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS seguros (
  id                    BIGSERIAL PRIMARY KEY,
  owner_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_seguro           TEXT NOT NULL,  -- vida/carro/apartamento/saude
  status                TEXT,
  moeda                 TEXT DEFAULT 'BRL',
  pais                  TEXT DEFAULT 'BR',
  seguradora            TEXT,
  produto               TEXT,
  apolice               TEXT,
  segurado              TEXT,
  inicio                DATE,
  vencimento            DATE,
  premio_mensal         NUMERIC(15,2),
  premio_anual          NUMERIC(15,2),
  renovacao_auto        BOOLEAN DEFAULT FALSE,
  seguradora_contato    TEXT,
  obs                   TEXT,
  -- vida
  modalidade            TEXT,
  cobertura_morte       NUMERIC(20,2),
  cobertura_invalidez   NUMERIC(20,2),
  cobertura_doenca      NUMERIC(20,2),
  carencia_meses        INTEGER,
  beneficiarios         TEXT,
  capital               NUMERIC(20,2),
  -- carro
  veiculo               TEXT,
  placa                 TEXT,
  chassi                TEXT,
  ano_fab               TEXT,
  ano_modelo            TEXT,
  cor                   TEXT,
  cobertura_tipo        TEXT,
  cobertura_terceiros   NUMERIC(20,2),
  cobertura_roubo       BOOLEAN,
  cobertura_incendio    BOOLEAN,
  carro_reserva         BOOLEAN,
  assistencia_24h       BOOLEAN,
  rastreador            BOOLEAN,
  franquia              NUMERIC(15,2),
  -- apartamento
  tipo_imovel           TEXT,
  imovel                TEXT,
  cidade                TEXT,
  estado                TEXT,
  area_m2               NUMERIC(10,2),
  valor_imovel          NUMERIC(20,2),
  valor_conteudo        NUMERIC(20,2),
  cobertura_rcf         BOOLEAN,
  cobertura_danos_elet  BOOLEAN,
  cobertura_vidros      BOOLEAN,
  cobertura_vendaval    BOOLEAN,
  -- saude
  operadora             TEXT,
  plano                 TEXT,
  beneficiario          TEXT,
  cpf                   TEXT,
  acomodacao            TEXT,
  coparticipacao        BOOLEAN,
  mensalidade           NUMERIC(15,2),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_seguros_updated BEFORE UPDATE ON seguros FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS seguro_docs (
  id          BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seguro_id   BIGINT NOT NULL REFERENCES seguros(id) ON DELETE CASCADE,
  nome        TEXT,
  tipo        TEXT,
  tamanho     TEXT,
  storage_path TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════
-- 18. ACORDO DE GAVETA (documentos confidenciais)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS acordos_gaveta (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo            TEXT,
  status          TEXT,
  nome            TEXT NOT NULL,
  parte_a         TEXT,
  papel_a         TEXT,
  empresa_a       TEXT,
  parte_b         TEXT,
  papel_b         TEXT,
  empresa_b       TEXT,
  testemunha1     TEXT,
  testemunha2     TEXT,
  advogado        TEXT,
  data_assinatura DATE,
  vencimento      DATE,
  valor           NUMERIC(20,2),
  descricao       TEXT,
  confidencial    BOOLEAN DEFAULT TRUE,
  nome_arquivo    TEXT,
  tamanho         TEXT,
  tipo_arquivo    TEXT,
  storage_path    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_acordos_updated BEFORE UPDATE ON acordos_gaveta FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 19. AUDIT LOG (imutável)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
  id        BIGSERIAL PRIMARY KEY,
  owner_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acao      TEXT NOT NULL,
  modulo    TEXT,
  detalhe   TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
  -- sem UPDATE nem DELETE: imutável por design
);


-- ════════════════════════════════════════════════════════════
-- 20. CONFIG (preferências e dados do sistema)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS config (
  id        BIGSERIAL PRIMARY KEY,
  owner_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chave     TEXT NOT NULL,
  value     JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, chave)
);
CREATE TRIGGER trg_config_updated BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — todas as tabelas
-- ════════════════════════════════════════════════════════════
ALTER TABLE empresas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE socios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_obrigacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_anexos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_nodes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_texts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_docs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trademarks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trademark_files   ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs_pessoais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pessoas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessor_docs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_docs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE imoveis           ENABLE ROW LEVEL SECURITY;
ALTER TABLE imovel_docs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguros           ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguro_docs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE acordos_gaveta    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE config            ENABLE ROW LEVEL SECURITY;


-- ════════════════════════════════════════════════════════════
-- POLICIES — owner_id = auth.uid() em todas
-- ════════════════════════════════════════════════════════════

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'empresas','socios','fiscal_obrigacoes','compliance_items',
    'funcionarios','documentos','transacoes','tasks','task_anexos',
    'alertas','org_nodes','org_texts','fiscal_docs','trademarks',
    'trademark_files','docs_pessoais','pessoas','assessores',
    'assessor_docs','valuations','valuation_docs','imoveis',
    'imovel_docs','investments','fixed_expenses','seguros',
    'seguro_docs','acordos_gaveta','config'
  ]) LOOP
    EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (owner_id = auth.uid())', t, t);
    EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (owner_id = auth.uid())', t, t);
    EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())', t, t);
    EXECUTE format('CREATE POLICY "%s_delete" ON %s FOR DELETE USING (owner_id = auth.uid())', t, t);
  END LOOP;
END $$;

-- audit_log: só SELECT e INSERT (imutável)
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT WITH CHECK (owner_id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- ÍNDICES — performance
-- ════════════════════════════════════════════════════════════
CREATE INDEX ON empresas(owner_id);
CREATE INDEX ON socios(empresa_id);
CREATE INDEX ON fiscal_obrigacoes(empresa_id);
CREATE INDEX ON compliance_items(empresa_id);
CREATE INDEX ON funcionarios(owner_id, empresa_id);
CREATE INDEX ON documentos(owner_id, empresa_id);
CREATE INDEX ON transacoes(owner_id, empresa_id);
CREATE INDEX ON transacoes(data);
CREATE INDEX ON tasks(owner_id, vencimento);
CREATE INDEX ON task_anexos(task_id);
CREATE INDEX ON alertas(owner_id, lido);
CREATE INDEX ON org_nodes(empresa_id);
CREATE INDEX ON fiscal_docs(owner_id);
CREATE INDEX ON trademarks(owner_id, data_vencimento);
CREATE INDEX ON trademark_files(trademark_id);
CREATE INDEX ON docs_pessoais(owner_id);
CREATE INDEX ON pessoas(owner_id);
CREATE INDEX ON assessores(owner_id);
CREATE INDEX ON valuations(owner_id, empresa_id);
CREATE INDEX ON imoveis(owner_id);
CREATE INDEX ON investments(owner_id);
CREATE INDEX ON fixed_expenses(owner_id);
CREATE INDEX ON seguros(owner_id, tipo_seguro);
CREATE INDEX ON acordos_gaveta(owner_id);
CREATE INDEX ON audit_log(owner_id, timestamp DESC);
CREATE INDEX ON config(owner_id, chave);


-- ════════════════════════════════════════════════════════════
-- SUPABASE STORAGE — bucket hub-docs (privado)
-- ════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hub-docs', 'hub-docs', FALSE, 52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp'
  ]
) ON CONFLICT DO NOTHING;

-- Arquivos organizados por pasta do usuário: hub-docs/{user_id}/arquivo.pdf
CREATE POLICY "storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'hub-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hub-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "storage_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'hub-docs' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- Todas as linhas devem ter rowsecurity = true

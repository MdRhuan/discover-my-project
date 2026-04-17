// ── Supabase DB layer — substitui Dexie/IndexedDB ─────────────
// Expõe o mesmo padrão de API que o Dexie usava:
//   db.empresas.toArray()
//   db.empresas.add({...})
//   db.empresas.update(id, data)
//   db.empresas.delete(id)
//   db.empresas.where('campo').equals(valor).toArray()
//   db.config.get('chave')
//   db.config.put({chave, value})

// Aguarda supabase estar disponível (CDN async)
function getSupabase() {
  if (!window._sbClient) {
    window._sbClient = window.supabase.createClient(
      'https://eqleyqzntnzkidnvfvyo.supabase.co',
      'sb_publishable_9PGcT_6dNURFAJ-g3f4JWw_FmKWu5NJ'
    );
  }
  return window._sbClient;
}

// Converte camelCase do frontend para snake_case do Postgres
function toSnake(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const map = {
    empresaId: 'empresa_id', parentId: 'parent_id', taskId: 'task_id',
    statusReg: 'status_reg', legalType: 'legal_type', taxRegime: 'tax_regime',
    ctbElection: 'ctb_election', cfcClass: 'cfc_class', cfcFlag: 'cfc_flag',
    dataEncerramento: 'data_encerramento', inscricaoEstadual: 'inscricao_estadual',
    obrigacoesAcessorias: 'obrigacoes_acessorias', anoCalendario: 'ano_calendario',
    moedaSalario: 'moeda_salario', statusDoc: 'status_doc', anoFiscal: 'ano_fiscal',
    dataUpload: 'data_upload', nomeArq: 'nome_arquivo', mimeType: 'mime_type',
    dataNasc: 'data_nasc', estadoCivil: 'estado_civil', conjugeNome: 'conjuge_nome',
    passaporteBR: 'passaporte_br', passaporteUS: 'passaporte_us',
    residenteFiscal: 'residente_fiscal', enderecoBR: 'endereco_br',
    enderecoUS: 'endereco_us', dataVencimento: 'data_vencimento',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = map[k] || k;
    out[key] = v;
  }
  return out;
}

// Converte snake_case do Postgres para camelCase do frontend
function toCamel(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const map = {
    empresa_id: 'empresaId', parent_id: 'parentId', task_id: 'taskId',
    status_reg: 'statusReg', legal_type: 'legalType', tax_regime: 'taxRegime',
    ctb_election: 'ctbElection', cfc_class: 'cfcClass', cfc_flag: 'cfcFlag',
    data_encerramento: 'dataEncerramento', inscricao_estadual: 'inscricaoEstadual',
    obrigacoes_acessorias: 'obrigacoesAcessorias', ano_calendario: 'anoCalendario',
    moeda_salario: 'moedaSalario', status_doc: 'statusDoc', ano_fiscal: 'anoFiscal',
    data_upload: 'dataUpload', nome_arquivo: 'nomeArq', mime_type: 'mimeType',
    data_nasc: 'dataNasc', estado_civil: 'estadoCivil', conjuge_nome: 'conjugeNome',
    passaporte_br: 'passaporteBR', passaporte_us: 'passaporteUS',
    residente_fiscal: 'residenteFiscal', endereco_br: 'enderecoBR',
    endereco_us: 'enderecoUS', owner_id: 'ownerId', created_at: 'createdAt',
    updated_at: 'updatedAt', data_vencimento: 'dataVencimento',
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = map[k] || k;
    out[key] = v;
  }
  return out;
}

function rowsToCamel(rows) {
  if (!rows) return [];
  return rows.map(toCamel);
}

// ── Tabela genérica ────────────────────────────────────────────
function makeTable(tableName) {
  return {
    // Retorna todos os registros do usuário atual
    async toArray() {
      const sb = getSupabase();
      const { data, error } = await sb.from(tableName).select('*').order('id', { ascending: true });
      if (error) { console.error(tableName + '.toArray()', error); return []; }
      return rowsToCamel(data);
    },

    // Insere e retorna o id gerado
    async add(obj) {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      const row = { ...toSnake(obj), owner_id: user.id };
      // Remove campos undefined e id (auto-gerado)
      delete row.id;
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      const { data, error } = await sb.from(tableName).insert(row).select('id').single();
      if (error) { console.error(tableName + '.add()', error); throw error; }
      return data.id;
    },

    // Atualiza campos de um registro pelo id
    async update(id, obj) {
      const sb = getSupabase();
      const row = toSnake(obj);
      delete row.id;
      delete row.owner_id;
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      const { error } = await sb.from(tableName).update(row).eq('id', id);
      if (error) { console.error(tableName + '.update()', error); throw error; }
      return id;
    },

    // Deleta pelo id
    async delete(id) {
      const sb = getSupabase();
      const { error } = await sb.from(tableName).delete().eq('id', id);
      if (error) { console.error(tableName + '.delete()', error); throw error; }
    },

    // Retorna um registro pelo id
    async get(id) {
      const sb = getSupabase();
      const { data, error } = await sb.from(tableName).select('*').eq('id', id).maybeSingle();
      if (error) { console.error(tableName + '.get()', error); return null; }
      return data ? toCamel(data) : null;
    },

    // Suporte a bulkAdd (usado no backup/restore)
    async bulkAdd(arr) {
      if (!arr || arr.length === 0) return;
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      const rows = arr.map(obj => {
        const row = { ...toSnake(obj), owner_id: user.id };
        delete row.id;
        Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
        return row;
      });
      const { error } = await sb.from(tableName).insert(rows);
      if (error) { console.error(tableName + '.bulkAdd()', error); throw error; }
    },

    // Apaga todos os registros do usuário (usado no backup/restore)
    async clear() {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      const { error } = await sb.from(tableName).delete().eq('owner_id', user.id);
      if (error) { console.error(tableName + '.clear()', error); throw error; }
    },

    // Suporte a .orderBy().reverse().limit().toArray() (auditLog)
    orderBy(field) {
      return {
        reverse() {
          return {
            limit(n) {
              return {
                async toArray() {
                  const sb = getSupabase();
                  const snakeField = Object.keys(toSnake({ [field]: '_' }))[0] || field;
                  const { data, error } = await sb.from(tableName)
                    .select('*').order(snakeField, { ascending: false }).limit(n);
                  if (error) { console.error(tableName + '.orderBy()', error); return []; }
                  return rowsToCamel(data);
                }
              };
            }
          };
        }
      };
    },

    // Suporte a .where('campo').equals(valor).toArray()
    where(field) {
      return {
        equals(val) {
          return {
            async toArray() {
              const sb = getSupabase();
              const col = Object.keys(toSnake({ [field]: null }))[0] || field;
              const snakeField = toSnake({ [field]: '_' });
              const actualCol = Object.keys(snakeField)[0];
              const { data, error } = await sb.from(tableName)
                .select('*').eq(actualCol, val).order('id', { ascending: true });
              if (error) { console.error(tableName + '.where().equals()', error); return []; }
              return rowsToCamel(data);
            },
            async delete() {
              const sb = getSupabase();
              const snakeField = toSnake({ [field]: '_' });
              const actualCol = Object.keys(snakeField)[0];
              const { error } = await sb.from(tableName).delete().eq(actualCol, val);
              if (error) { console.error(tableName + '.where().equals().delete()', error); throw error; }
            }
          };
        }
      };
    },

    // put = upsert (compatibilidade Dexie)
    async put(obj) {
      const sb = getSupabase();
      const { data: { user } } = await sb.auth.getUser();
      const row = { ...toSnake(obj), owner_id: user.id };
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      const { error } = await sb.from(tableName).upsert(row);
      if (error) { console.error(tableName + '.put()', error); throw error; }
    },
  };
}

// ── Tabela config especial (chave/valor) ──────────────────────
const configTable = {
  async get(chave) {
    const sb = getSupabase();
    const { data, error } = await sb.from('config')
      .select('*').eq('chave', chave).maybeSingle();
    if (error) { console.error('config.get()', error); return null; }
    return data ? { chave: data.chave, value: data.value } : null;
  },

  async put({ chave, value }) {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('config')
      .upsert({ owner_id: user.id, chave, value }, { onConflict: 'owner_id,chave' });
    if (error) { console.error('config.put()', error); throw error; }
  },

  async toArray() {
    const sb = getSupabase();
    const { data, error } = await sb.from('config').select('*');
    if (error) { console.error('config.toArray()', error); return []; }
    return (data || []).map(r => ({ chave: r.chave, value: r.value }));
  },

  async clear() {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('config').delete().eq('owner_id', user.id);
    if (error) { console.error('config.clear()', error); throw error; }
  },

  async bulkAdd(arr) {
    if (!arr || arr.length === 0) return;
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    const rows = arr.map(r => ({ owner_id: user.id, chave: r.chave, value: r.value }));
    const { error } = await sb.from('config').insert(rows);
    if (error) { console.error('config.bulkAdd()', error); throw error; }
  },
};

// ── Objeto global db — mesmo nome de antes ────────────────────
var db = {
  empresas:     makeTable('empresas'),
  funcionarios: makeTable('funcionarios'),
  documentos:   makeTable('documentos'),
  transacoes:   makeTable('transacoes'),
  orgNodes:     makeTable('org_nodes'),
  orgTexts:     makeTable('org_texts'),
  auditLog:     makeTable('audit_log'),
  tasks:        makeTable('tasks'),
  alertas:      makeTable('alertas'),
  docsPessoais: makeTable('docs_pessoais'),
  fiscalDocs:   makeTable('fiscal_docs'),
  trademarks:   makeTable('trademarks'),
  config:       configTable,
};

async function seedTasksAndAlerts() {}

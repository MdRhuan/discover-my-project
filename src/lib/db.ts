import { getSupabase } from './supabase'

// camelCase → snake_case map
const CAMEL_TO_SNAKE: Record<string, string> = {
  empresaId: 'empresa_id', parentId: 'parent_id', taskId: 'task_id',
  statusReg: 'status_reg', legalType: 'legal_type', taxRegime: 'tax_regime',
  ctbElection: 'ctb_election', cfcClass: 'cfc_class', cfcFlag: 'cfc_flag',
  dataEncerramento: 'data_encerramento', inscricaoEstadual: 'inscricao_estadual',
  obrigacoesAcessorias: 'obrigacoes_acessorias', anoCalendario: 'ano_calendario',
  moedaSalario: 'moeda_salario', statusDoc: 'status_doc', anoFiscal: 'ano_fiscal',
  dataUpload: 'data_upload', nomeArq: 'nome_arquivo', mimeType: 'mime_type',
  arquivoPath: 'arquivo_path',
  dataNasc: 'data_nasc', estadoCivil: 'estado_civil', conjugeNome: 'conjuge_nome',
  passaporteBR: 'passaporte_br', passaporteUS: 'passaporte_us',
  residenteFiscal: 'residente_fiscal', enderecoBR: 'endereco_br',
  enderecoUS: 'endereco_us', dataVencimento: 'data_vencimento',
  corBorda: 'cor_borda', corFundo: 'cor_fundo', svgIcon: 'svg_icon',
  posX: 'pos_x', posY: 'pos_y', espessuraBorda: 'espessura_borda',
  estiloBorda: 'estilo_borda', sourceId: 'source_id', targetId: 'target_id',
  zIndex: 'z_index', svgContent: 'svg_content',
  // Trademarks
  tipoMarca: 'tipo_marca', numProcesso: 'num_processo', numRegistro: 'num_registro',
  dataConcessao: 'data_concessao', nextDeadline: 'next_deadline',
  usSerialNumber: 'us_serial_number', usRegistration: 'us_registration',
  filingDate: 'filing_date', dueDate: 'due_date', proposedGoods: 'proposed_goods',
  trademarkId: 'trademark_id', tipoPonta: 'tipo_ponta',
  // Construction
  empresaNome: 'empresa_nome', folderId: 'folder_id', documentId: 'document_id',
  // Bens Móveis
  codigoPatrimonial: 'codigo_patrimonial', numeroSerie: 'numero_serie',
  dataCompra: 'data_compra', valorAquisicao: 'valor_aquisicao', valorAtual: 'valor_atual',
  setorResponsavel: 'setor_responsavel', colaboradorResponsavel: 'colaborador_responsavel',
  vidaUtil: 'vida_util', metodoDepreciacao: 'metodo_depreciacao', fotoPath: 'foto_path',
  bemId: 'bem_id', setorOrigem: 'setor_origem', setorDestino: 'setor_destino',
}

const SNAKE_TO_CAMEL: Record<string, string> = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([k, v]) => [v, k])
)
SNAKE_TO_CAMEL['owner_id'] = 'ownerId'
SNAKE_TO_CAMEL['created_at'] = 'createdAt'
SNAKE_TO_CAMEL['updated_at'] = 'updatedAt'

// Fields that are managed automatically by the DB and must never be sent on insert/update
const MANAGED_FIELDS = new Set(['createdAt', 'updatedAt', 'ownerId', 'created_at', 'updated_at', 'owner_id'])

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (MANAGED_FIELDS.has(k)) continue
    out[CAMEL_TO_SNAKE[k] || k] = v
  }
  return out
}

function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[SNAKE_TO_CAMEL[k] || k] = v
  }
  return out
}

function rowsToCamel<T>(rows: Record<string, unknown>[]): T[] {
  return (rows || []).map(r => toCamel(r) as T)
}

function makeTable<T>(tableName: string) {
  return {
    async toArray(): Promise<T[]> {
      const sb = getSupabase()
      const { data, error } = await sb.from(tableName).select('*').order('id', { ascending: true })
      if (error) { console.error(tableName + '.toArray()', error); return [] }
      return rowsToCamel<T>(data || [])
    },

    async add(obj: Partial<T>): Promise<number> {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      const row: Record<string, unknown> = { ...toSnake(obj as Record<string, unknown>), owner_id: user?.id }
      delete row.id
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k])
      const { data, error } = await sb.from(tableName).insert(row).select('id').single()
      if (error) { console.error(tableName + '.add()', error); throw error }
      return (data as { id: number }).id
    },

    async update(id: number, obj: Partial<T>): Promise<number> {
      const sb = getSupabase()
      const row = toSnake(obj as Record<string, unknown>)
      delete row['id']
      delete row['owner_id']
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k])
      const { error } = await sb.from(tableName).update(row).eq('id', id)
      if (error) { console.error(tableName + '.update()', error); throw error }
      return id
    },

    async delete(id: number): Promise<void> {
      const sb = getSupabase()
      const { error } = await sb.from(tableName).delete().eq('id', id)
      if (error) { console.error(tableName + '.delete()', error); throw error }
    },

    async get(id: number): Promise<T | null> {
      const sb = getSupabase()
      const { data, error } = await sb.from(tableName).select('*').eq('id', id).maybeSingle()
      if (error) { console.error(tableName + '.get()', error); return null }
      return data ? toCamel(data) as T : null
    },

    async bulkAdd(arr: Partial<T>[]): Promise<void> {
      if (!arr || arr.length === 0) return
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      const rows = arr.map(obj => {
        const row: Record<string, unknown> = { ...toSnake(obj as Record<string, unknown>), owner_id: user?.id }
        delete row.id
        Object.keys(row).forEach(k => row[k] === undefined && delete row[k])
        return row
      })
      const { error } = await sb.from(tableName).insert(rows)
      if (error) { console.error(tableName + '.bulkAdd()', error); throw error }
    },

    async clear(): Promise<void> {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      const { error } = await sb.from(tableName).delete().eq('owner_id', user?.id)
      if (error) { console.error(tableName + '.clear()', error); throw error }
    },

    orderBy(field: string) {
      return {
        reverse() {
          return {
            limit(n: number) {
              return {
                async toArray(): Promise<T[]> {
                  const sb = getSupabase()
                  const snakeField = CAMEL_TO_SNAKE[field] || field
                  const { data, error } = await sb.from(tableName)
                    .select('*').order(snakeField, { ascending: false }).limit(n)
                  if (error) { console.error(tableName + '.orderBy()', error); return [] }
                  return rowsToCamel<T>(data || [])
                }
              }
            }
          }
        }
      }
    },

    where(field: string) {
      return {
        equals(val: unknown) {
          return {
            async toArray(): Promise<T[]> {
              const sb = getSupabase()
              const col = CAMEL_TO_SNAKE[field] || field
              const { data, error } = await sb.from(tableName)
                .select('*').eq(col, val).order('id', { ascending: true })
              if (error) { console.error(tableName + '.where().equals()', error); return [] }
              return rowsToCamel<T>(data || [])
            },
            async delete(): Promise<void> {
              const sb = getSupabase()
              const col = CAMEL_TO_SNAKE[field] || field
              const { error } = await sb.from(tableName).delete().eq(col, val)
              if (error) { console.error(tableName + '.where().equals().delete()', error); throw error }
            }
          }
        }
      }
    },

    async put(obj: Partial<T> & { chave?: string }): Promise<void> {
      const sb = getSupabase()
      const { data: { user } } = await sb.auth.getUser()
      const row: Record<string, unknown> = { ...toSnake(obj as Record<string, unknown>), owner_id: user?.id }
      delete row.id
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k])
      const { error } = await sb.from(tableName).upsert(row)
      if (error) { console.error(tableName + '.put()', error); throw error }
    },

    async count(): Promise<number> {
      const sb = getSupabase()
      const { count, error } = await sb.from(tableName).select('*', { count: 'exact', head: true })
      if (error) return 0
      return count || 0
    },
  }
}

// Special config table
const configTable = {
  async get(chave: string) {
    const sb = getSupabase()
    const { data, error } = await sb.from('config').select('*').eq('chave', chave).maybeSingle()
    if (error) { console.error('config.get()', error); return null }
    return data ? { chave: data.chave, value: data.value } : null
  },
  async put({ chave, value }: { chave: string; value: unknown }) {
    const sb = getSupabase()
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('config')
      .upsert({ owner_id: user?.id, chave, value }, { onConflict: 'owner_id,chave' })
    if (error) { console.error('config.put()', error); throw error }
  },
  async toArray() {
    const sb = getSupabase()
    const { data, error } = await sb.from('config').select('*')
    if (error) return []
    return (data || []).map((r: { chave: string; value: unknown }) => ({ chave: r.chave, value: r.value }))
  },
  async clear() {
    const sb = getSupabase()
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('config').delete().eq('owner_id', user?.id)
    if (error) { console.error('config.clear()', error); throw error }
  },
  async bulkAdd(arr: { chave: string; value: unknown }[]) {
    if (!arr || arr.length === 0) return
    const sb = getSupabase()
    const { data: { user } } = await sb.auth.getUser()
    const rows = arr.map(r => ({ owner_id: user?.id, chave: r.chave, value: r.value }))
    const { error } = await sb.from('config').insert(rows)
    if (error) { console.error('config.bulkAdd()', error); throw error }
  },
}

import type {
  Empresa, Funcionario, Documento, Transacao, OrgNode, OrgEdge, OrgTextCanvas, OrgShape, OrgIcon, OrgImage,
  Task, Alerta, DocPessoal, FiscalDoc, Trademark, TrademarkFile, AuditLog,
  ConstructionFolder, ConstructionDocument, ConstructionFile,
  BemMovel, BemMovelFile, BemMovelManutencao, BemMovelTransferencia,
} from '@/types'

export const db = {
  empresas: makeTable<Empresa>('empresas'),
  funcionarios: makeTable<Funcionario>('funcionarios'),
  documentos: makeTable<Documento>('documentos'),
  transacoes: makeTable<Transacao>('transacoes'),
  orgNodes: makeTable<OrgNode>('org_nodes'),
  orgEdges: makeTable<OrgEdge>('org_edges'),
  orgTexts: makeTable<{ id?: number; chave?: string; value?: unknown }>('org_texts'),
  orgTextsCanvas: makeTable<OrgTextCanvas>('org_texts_canvas'),
  orgShapes: makeTable<OrgShape>('org_shapes'),
  orgIcons: makeTable<OrgIcon>('org_icons'),
  orgImages: makeTable<OrgImage>('org_images'),
  auditLog: makeTable<AuditLog>('audit_log'),
  tasks: makeTable<Task>('tasks'),
  alertas: makeTable<Alerta>('alertas'),
  docsPessoais: makeTable<DocPessoal>('docs_pessoais'),
  fiscalDocs: makeTable<FiscalDoc>('fiscal_docs'),
  trademarks: makeTable<Trademark>('trademarks'),
  trademarkFiles: makeTable<TrademarkFile>('trademark_files'),
  constructionFolders: makeTable<ConstructionFolder>('construction_folders'),
  constructionDocuments: makeTable<ConstructionDocument>('construction_documents'),
  constructionFiles: makeTable<ConstructionFile>('construction_files'),
  bensMoveis: makeTable<BemMovel>('bens_moveis'),
  bensMoveisFiles: makeTable<BemMovelFile>('bens_moveis_files'),
  bensMoveisManutencoes: makeTable<BemMovelManutencao>('bens_moveis_manutencoes'),
  bensMoveisTransferencias: makeTable<BemMovelTransferencia>('bens_moveis_transferencias'),
  config: configTable,
}

export async function supabaseSignOut() {
  const sb = getSupabase()
  await sb.auth.signOut()
}

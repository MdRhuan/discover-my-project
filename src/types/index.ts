export type Lang = 'pt-BR' | 'en-US'
export type Currency = 'BRL' | 'USD'
export type Theme = 'light' | 'dark'

export interface Empresa {
  id?: number
  nome: string
  pais: 'BR' | 'US'
  cnpj?: string
  ein?: string
  status: string
  cidade?: string
  estado?: string
  website?: string
  legalType?: string
  taxRegime?: string
  fundacao?: string
  setor?: string
  notas?: string
  inscricaoEstadual?: string
  obrigacoesAcessorias?: string
  anoCalendario?: string
  dataEncerramento?: string
  ctbElection?: string
  cfcClass?: string
  cfcFlag?: boolean
}

export interface Funcionario {
  id?: number
  empresaId: number
  nome: string
  cargo: string
  departamento?: string
  salario?: number
  moedaSalario?: string
  status: string
  admissao?: string
  email?: string
  telefone?: string
  documento?: string
  pais?: string
}

export interface Documento {
  id?: number
  empresaId?: number
  nome: string
  categoria: string
  subcategoria?: string
  versao?: string
  dataUpload?: string
  ano?: string
  tamanho?: string
  tipo?: string
  descricao?: string
  vencimento?: string
  tags?: string[]
  statusDoc?: string
  arquivoPath?: string
}

export interface Transacao {
  id?: number
  empresaId: number
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao?: string
  valor: number
  moeda: string
  data: string
}

export interface OrgNode {
  id?: number
  empresaId?: number | null
  parentId?: number | null
  nome: string
  cargo?: string
  posX?: number
  posY?: number
  icon?: string
  corBorda?: string
  corFundo?: string
  espessuraBorda?: number
  estiloBorda?: string
  zIndex?: number
  livre?: boolean
}

export interface OrgEdge {
  id?: number
  empresaId?: number | null
  sourceId: number
  targetId: number
  cor?: string
  espessura?: number
  estilo?: string
  label?: string
  tipoPonta?: 'one' | 'both' | 'none'
}

export interface OrgTextCanvas {
  id?: number
  empresaId?: number | null
  conteudo: string
  posX: number
  posY: number
  largura?: number
  fonte?: string
  tamanho?: number
  cor?: string
  alinhamento?: 'left' | 'center' | 'right'
  negrito?: boolean
  italico?: boolean
  zIndex?: number
}

export interface OrgIcon {
  id?: number
  empresaId?: number | null
  nome?: string
  svgContent: string
  posX: number
  posY: number
  largura: number
  altura: number
  cor?: string
  rotacao?: number
  zIndex?: number
}

export interface OrgShape {
  id?: number
  empresaId?: number | null
  rotulo?: string
  posX: number
  posY: number
  largura: number
  altura: number
  corBorda?: string
  corFundo?: string
  espessuraBorda?: number
  estiloBorda?: string
  raio?: number
  opacidade?: number
  zIndex?: number
}

export interface OrgImage {
  id?: number
  empresaId?: number | null
  nome?: string
  arquivoPath: string
  posX: number
  posY: number
  largura: number
  altura: number
  rotacao?: number
  opacidade?: number
  raio?: number
  zIndex?: number
}

export interface Task {
  id?: number
  empresaId?: number
  titulo: string
  descricao?: string
  prioridade: 'alta' | 'media' | 'baixa'
  status: 'pendente' | 'em-andamento' | 'concluida'
  responsavel?: string
  vencimento?: string
  categoria?: string
  tipo?: string
}

export interface Alerta {
  id?: number
  empresaId?: number
  titulo: string
  mensagem: string
  tipo: 'critico' | 'aviso' | 'info' | 'sucesso'
  lido: boolean
  timestamp: string
  modulo?: string
}

export interface DocPessoal {
  id?: number
  pessoa: string
  categoria: string
  subcategoria: string
  nome: string
  tipo?: string
  descricao?: string
  dataUpload?: string
  tamanho?: string
  status?: string
  vencimento?: string
  conteudo?: string
}

export interface FiscalDoc {
  id?: number
  subcategoria: string
  nome: string
  tipo?: string
  jurisdicao?: string
  ano?: string
  descricao?: string
  dataUpload?: string
  tamanho?: string
  status?: string
  responsavel?: string
  vencimento?: string
  conteudo?: string
}

export interface Trademark {
  id?: number
  nome: string
  empresaId?: number
  pais?: 'BR' | 'US'
  owner?: string
  tipoMarca?: string
  numero?: string
  classe?: string
  jurisdicao?: string
  status?: string
  dataDeposito?: string
  dataVencimento?: string
  dataConcessao?: string
  nextDeadline?: string
  numProcesso?: string
  numRegistro?: string
  valor?: number
  // US-specific
  usSerialNumber?: string
  usRegistration?: string
  filingDate?: string
  dueDate?: string
  proposedGoods?: string
  notas?: string
}

export interface TrademarkFile {
  id?: number
  trademarkId: number
  nome: string
  arquivoPath: string
  tipo?: string
  tamanho?: string
  dataUpload?: string
}

export interface AuditLog {
  id?: number
  acao: string
  modulo?: string
  timestamp: string
}

export interface Config {
  chave: string
  value: unknown
}

export interface Toast {
  id: number
  msg: string
  type: 'success' | 'error' | 'info'
}

export interface ConstructionFolder {
  id?: number
  parentId?: number | null
  nome: string
  empresaNome?: string
  descricao?: string
}

export interface ConstructionDocument {
  id?: number
  folderId?: number | null
  nome: string
  empresaNome: string
  descricao?: string
  data?: string
}

export interface ConstructionFile {
  id?: number
  documentId: number
  nome: string
  arquivoPath: string
  tipo?: string
  tamanho?: string
  dataUpload?: string
}

export type PageKey =
  | 'dashboard'
  | 'tasks'
  | 'companies'
  | 'emConstrucao'
  | 'employees'
  | 'documents'
  | 'billing'
  | 'orgchart'
  | 'valuations'
  | 'personalDocs'
  | 'lifeInsurance'
  | 'carInsurance'
  | 'aptInsurance'
  | 'investments'
  | 'realEstate'
  | 'bensMoveis'
  | 'fixedExpenses'
  | 'fairsEvents'
  | 'juridico'
  | 'acordoGaveta'
  | 'trademarks'
  | 'fiscalTax'
  | 'taxPlanning'
  | 'checkBox'
  | 'backup'
  | 'auditLog'
  | 'users'

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
  tamanho?: string
  tipo?: string
  descricao?: string
  vencimento?: string
  tags?: string[]
  statusDoc?: string
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
  empresaId: number
  parentId?: number | null
  nome: string
  cargo: string
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
  numero?: string
  classe?: string
  jurisdicao?: string
  status?: string
  dataDeposito?: string
  dataVencimento?: string
  notas?: string
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

export type PageKey =
  | 'dashboard'
  | 'tasks'
  | 'companies'
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
  | 'fixedExpenses'
  | 'juridico'
  | 'acordoGaveta'
  | 'trademarks'
  | 'fiscalTax'
  | 'taxPlanning'
  | 'checkBox'
  | 'backup'
  | 'auditLog'
  | 'users'

// ============================================================
// Hub Empresarial — app.js  (Part 1: DB + Auth + i18n + Layout)
// ============================================================

const { useState, useEffect, useRef, useCallback, createContext, useContext } = React;

// ── Theme ─────────────────────────────────────────────────────
// Inicializa o tema antes do primeiro render para evitar flash
(function initTheme() {
  const saved = localStorage.getItem('hub-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function useTheme() {
  const [theme, setTheme] = useState(() => {
    return document.documentElement.getAttribute('data-theme') || 'light';
  });
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('hub-theme', next);
    setTheme(next);
  };
  return { theme, toggle };
}

// ── i18n ────────────────────────────────────────────────────
const TRANSLATIONS = {
  'pt-BR': {
    appName: 'Hub Empresarial', login: 'Entrar', logout: 'Sair',
    password: 'Senha', setupPassword: 'Criar senha de acesso',
    confirmPassword: 'Confirmar senha', wrongPassword: 'Senha incorreta',
    passwordMismatch: 'Senhas não coincidem', passwordTooShort: 'Mínimo 6 caracteres',
    dashboard: 'Dashboard', tasks: 'Tasks & Deadlines', companies: 'Empresas', employees: 'Funcionários',
    documents: 'Documentos', billing: 'Faturamento', orgchart: 'Organograma',
    backup: 'Backup', settings: 'Configurações', auditLog: 'Auditoria',
    personalDocs: 'Documentos Pessoais',
    fiscalTax: 'Fiscal & Tax',
    newCompany: 'Nova Empresa', newEmployee: 'Novo Funcionário',
    newDocument: 'Novo Documento', newTransaction: 'Nova Transação',
    save: 'Salvar', cancel: 'Cancelar', edit: 'Editar', delete: 'Excluir',
    confirm: 'Confirmar', search: 'Buscar...', filter: 'Filtrar',
    export: 'Exportar', import: 'Importar', exportPDF: 'Exportar PDF',
    exportExcel: 'Exportar Excel', exportJSON: 'Exportar JSON',
    importJSON: 'Importar JSON', allCompanies: 'Todas as empresas',
    active: 'Ativo', inactive: 'Inativo', brazil: 'Brasil', usa: 'EUA',
    cnpj: 'CNPJ', ein: 'EIN', name: 'Nome', email: 'E-mail',
    phone: 'Telefone', address: 'Endereço', city: 'Cidade',
    state: 'Estado', country: 'País', website: 'Website',
    legalType: 'Tipo Jurídico', foundedDate: 'Fundação',
    revenue: 'Receita', expense: 'Despesa', balance: 'Saldo',
    salary: 'Salário', position: 'Cargo', department: 'Departamento',
    hireDate: 'Admissão', status: 'Status', category: 'Categoria',
    description: 'Descrição', amount: 'Valor', currency: 'Moeda',
    date: 'Data', type: 'Tipo', version: 'Versão', uploadDate: 'Upload',
    fileSize: 'Tamanho', actions: 'Ações', totalRevenue: 'Receita Total',
    totalExpense: 'Despesa Total', netBalance: 'Saldo Líquido',
    totalCompanies: 'Total de Empresas', totalEmployees: 'Total de Funcionários',
    recentActivity: 'Atividade Recente', financialOverview: 'Visão Financeira',
    byCompany: 'Por Empresa', consolidated: 'Consolidado',
    deleteConfirm: 'Deseja realmente excluir este registro?',
    saved: 'Salvo com sucesso!', deleted: 'Excluído com sucesso!',
    errorSave: 'Erro ao salvar.', noRecords: 'Nenhum registro encontrado.',
    uploadFile: 'Clique ou arraste um arquivo aqui',
    backupExported: 'Backup exportado!', backupImported: 'Dados importados!',
    language: 'Idioma', exchangeRate: 'Cotação USD/BRL',
    cpf: 'CPF', ssn: 'SSN', nationalId: 'Documento',
    stateReg: 'Inscrição Estadual', llcCorp: 'Estrutura',
    taxRegime: 'Regime Tributário', notes: 'Observações',
    totalDocuments: 'Total de Documentos',
  },
  'en-US': {
    appName: 'Business Hub', login: 'Sign In', logout: 'Sign Out',
    password: 'Password', setupPassword: 'Create access password',
    confirmPassword: 'Confirm password', wrongPassword: 'Wrong password',
    passwordMismatch: 'Passwords do not match', passwordTooShort: 'Minimum 6 characters',
    dashboard: 'Dashboard', tasks: 'Tasks & Deadlines', companies: 'Companies', employees: 'Employees',
    documents: 'Documents', billing: 'Billing', orgchart: 'Org Chart',
    backup: 'Backup', settings: 'Settings', auditLog: 'Audit Log',
    personalDocs: 'Personal Documents',
    fiscalTax: 'Fiscal & Tax',
    newCompany: 'New Company', newEmployee: 'New Employee',
    newDocument: 'New Document', newTransaction: 'New Transaction',
    save: 'Save', cancel: 'Cancel', edit: 'Edit', delete: 'Delete',
    confirm: 'Confirm', search: 'Search...', filter: 'Filter',
    export: 'Export', import: 'Import', exportPDF: 'Export PDF',
    exportExcel: 'Export Excel', exportJSON: 'Export JSON',
    importJSON: 'Import JSON', allCompanies: 'All Companies',
    active: 'Active', inactive: 'Inactive', brazil: 'Brazil', usa: 'USA',
    cnpj: 'CNPJ', ein: 'EIN', name: 'Name', email: 'Email',
    phone: 'Phone', address: 'Address', city: 'City',
    state: 'State', country: 'Country', website: 'Website',
    legalType: 'Legal Type', foundedDate: 'Founded',
    revenue: 'Revenue', expense: 'Expense', balance: 'Balance',
    salary: 'Salary', position: 'Position', department: 'Department',
    hireDate: 'Hire Date', status: 'Status', category: 'Category',
    description: 'Description', amount: 'Amount', currency: 'Currency',
    date: 'Date', type: 'Type', version: 'Version', uploadDate: 'Upload Date',
    fileSize: 'File Size', actions: 'Actions', totalRevenue: 'Total Revenue',
    totalExpense: 'Total Expenses', netBalance: 'Net Balance',
    totalCompanies: 'Total Companies', totalEmployees: 'Total Employees',
    recentActivity: 'Recent Activity', financialOverview: 'Financial Overview',
    byCompany: 'By Company', consolidated: 'Consolidated',
    deleteConfirm: 'Are you sure you want to delete this record?',
    saved: 'Saved successfully!', deleted: 'Deleted successfully!',
    errorSave: 'Error saving.', noRecords: 'No records found.',
    uploadFile: 'Click or drag a file here',
    backupExported: 'Backup exported!', backupImported: 'Data imported!',
    language: 'Language', exchangeRate: 'USD/BRL Rate',
    cpf: 'CPF', ssn: 'SSN', nationalId: 'ID Document',
    stateReg: 'State Registration', llcCorp: 'Structure',
    taxRegime: 'Tax Regime', notes: 'Notes',
    totalDocuments: 'Total Documents',
  }
};

// ── IndexedDB Schema ─────────────────────────────────────────
const db = new Dexie('HubEmpresarial');
db.version(1).stores({
  empresas:     '++id, nome, pais, cnpj, ein, status',
  funcionarios: '++id, empresaId, nome, cargo, status',
  documentos:   '++id, empresaId, categoria, nome',
  transacoes:   '++id, empresaId, tipo, categoria, data, moeda',
  orgNodes:     '++id, empresaId, parentId, nome, cargo',
  auditLog:     '++id, acao, modulo, timestamp',
  config:       'chave'
});
db.version(2).stores({
  empresas:     '++id, nome, pais, cnpj, ein, status',
  funcionarios: '++id, empresaId, nome, cargo, status',
  documentos:   '++id, empresaId, categoria, nome',
  transacoes:   '++id, empresaId, tipo, categoria, data, moeda',
  orgNodes:     '++id, empresaId, parentId, nome, cargo',
  orgTexts:     '++id, empresaId',
  auditLog:     '++id, acao, modulo, timestamp',
  config:       'chave'
});
db.version(3).stores({
  empresas:     '++id, nome, pais, cnpj, ein, status',
  funcionarios: '++id, empresaId, nome, cargo, status',
  documentos:   '++id, empresaId, categoria, nome',
  transacoes:   '++id, empresaId, tipo, categoria, data, moeda',
  orgNodes:     '++id, empresaId, parentId, nome, cargo',
  orgTexts:     '++id, empresaId',
  auditLog:     '++id, acao, modulo, timestamp',
  config:       'chave',
  tasks:        '++id, empresaId, status, prioridade, vencimento',
  alertas:      '++id, empresaId, tipo, lido, timestamp',
});
db.version(4).stores({
  empresas:      '++id, nome, pais, cnpj, ein, status',
  funcionarios:  '++id, empresaId, nome, cargo, status',
  documentos:    '++id, empresaId, categoria, nome',
  transacoes:    '++id, empresaId, tipo, categoria, data, moeda',
  orgNodes:      '++id, empresaId, parentId, nome, cargo',
  orgTexts:      '++id, empresaId',
  auditLog:      '++id, acao, modulo, timestamp',
  config:        'chave',
  tasks:         '++id, empresaId, status, prioridade, vencimento',
  alertas:       '++id, empresaId, tipo, lido, timestamp',
  docsPessoais:  '++id, categoria, subcategoria, nome, pessoa',
});
db.version(5).stores({
  empresas:      '++id, nome, pais, cnpj, ein, status',
  funcionarios:  '++id, empresaId, nome, cargo, status',
  documentos:    '++id, empresaId, categoria, nome',
  transacoes:    '++id, empresaId, tipo, categoria, data, moeda',
  orgNodes:      '++id, empresaId, parentId, nome, cargo',
  orgTexts:      '++id, empresaId',
  auditLog:      '++id, acao, modulo, timestamp',
  config:        'chave',
  tasks:         '++id, empresaId, status, prioridade, vencimento',
  alertas:       '++id, empresaId, tipo, lido, timestamp',
  docsPessoais:  '++id, categoria, subcategoria, nome, pessoa',
  fiscalDocs:    '++id, subcategoria, nome, ano, jurisdicao',
});

// ── Seed tasks/alerts para bancos existentes ─────────────────
async function seedTasksAndAlerts() {
  const [taskCount, alertCount, docsPessoaisCount, fiscalDocsCount, empresas] = await Promise.all([
    db.tasks.count(),
    db.alertas.count(),
    db.docsPessoais.count(),
    db.fiscalDocs.count(),
    db.empresas.toArray(),
  ]);
  if (taskCount > 0 && alertCount > 0) return;
  if (empresas.length === 0) return; // wait for main seed

  const emp = empresas;
  const emp1 = emp[0]?.id, emp2 = emp[1]?.id, emp3 = emp[2]?.id, emp4 = emp[3]?.id;
  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0,10); };

  if (taskCount === 0) {
    await db.tasks.bulkAdd([
      { empresaId: emp1, titulo: 'Renovar contrato social', descricao: 'Atualizar dados dos sócios e integralização', prioridade: 'alta', status: 'pendente', responsavel: 'Carlos Henrique Melo', vencimento: addDays(today, 5), categoria: 'Jurídico' },
      { empresaId: emp1, titulo: 'Declaração IRPJ 2024', descricao: 'Entregar declaração à Receita Federal', prioridade: 'alta', status: 'em-andamento', responsavel: 'Juliana Ramos', vencimento: addDays(today, 12), categoria: 'Fiscal' },
      { empresaId: emp2, titulo: 'Annual Report filing', descricao: 'Submit annual report to Florida DoS', prioridade: 'alta', status: 'pendente', responsavel: 'John Mitchell', vencimento: addDays(today, 3), categoria: 'Compliance' },
      { empresaId: emp2, titulo: 'Renew business license', descricao: 'Renew Miami-Dade county license', prioridade: 'media', status: 'pendente', responsavel: 'Sarah Johnson', vencimento: addDays(today, 18), categoria: 'Licenças' },
      { empresaId: emp3, titulo: 'Alvará de obra — Lote 12', descricao: 'Solicitar alvará para nova fase do empreendimento', prioridade: 'alta', status: 'em-andamento', responsavel: 'Marcos Oliveira', vencimento: addDays(today, 7), categoria: 'Licenças' },
      { empresaId: emp3, titulo: 'Auditoria contábil Q1', descricao: 'Revisão dos balanços do primeiro trimestre', prioridade: 'media', status: 'pendente', responsavel: 'Juliana Ramos', vencimento: addDays(today, 21), categoria: 'Financeiro' },
      { empresaId: emp4, titulo: 'Property tax assessment', descricao: 'Review and respond to Orlando tax assessment', prioridade: 'media', status: 'pendente', responsavel: 'Michael Torres', vencimento: addDays(today, 30), categoria: 'Fiscal' },
      { empresaId: emp1, titulo: 'Renovar certificado digital', descricao: 'e-CNPJ vence em breve', prioridade: 'alta', status: 'pendente', responsavel: 'Ana Paula Ferreira', vencimento: addDays(today, 2), categoria: 'TI' },
      { empresaId: emp1, titulo: 'Reunião conselho trimestral', descricao: 'Preparar materiais para reunião do conselho', prioridade: 'media', status: 'concluida', responsavel: 'Carlos Henrique Melo', vencimento: addDays(today, -3), categoria: 'Gestão' },
      { empresaId: emp2, titulo: 'Q2 tax estimated payment', descricao: 'IRS estimated quarterly payment', prioridade: 'media', status: 'concluida', responsavel: 'John Mitchell', vencimento: addDays(today, -5), categoria: 'Fiscal' },
    ]);
  }

  if (alertCount === 0) {
    await db.alertas.bulkAdd([
      { empresaId: emp1, titulo: 'Certificado digital vencendo', mensagem: 'e-CNPJ do Grupo Meridian Ltda vence em 2 dias. Renove imediatamente.', tipo: 'critico', lido: false, timestamp: new Date().toISOString(), modulo: 'Empresas' },
      { empresaId: emp2, titulo: 'Annual Report prazo crítico', mensagem: 'Florida Annual Report vence em 3 dias. Multa de US$ 400 se não entregue.', tipo: 'critico', lido: false, timestamp: new Date().toISOString(), modulo: 'Compliance' },
      { empresaId: emp1, titulo: 'Prazo fiscal se aproxima', mensagem: 'IRPJ 2024 vence em 12 dias. Documentação pendente.', tipo: 'aviso', lido: false, timestamp: new Date(Date.now()-3600000).toISOString(), modulo: 'Fiscal' },
      { empresaId: emp3, titulo: 'Alvará de obra pendente', mensagem: 'Solicitação do alvará para o Lote 12 ainda não foi protocolada.', tipo: 'aviso', lido: false, timestamp: new Date(Date.now()-7200000).toISOString(), modulo: 'Licenças' },
      { empresaId: emp4, titulo: 'Vistoria imóvel agendada', mensagem: 'Vistoria do Orange County agendada para próxima semana.', tipo: 'info', lido: false, timestamp: new Date(Date.now()-10800000).toISOString(), modulo: 'Imóveis' },
      { empresaId: emp2, titulo: 'Novo funcionário onboarding', mensagem: 'Sarah Johnson completou os formulários de admissão.', tipo: 'info', lido: true, timestamp: new Date(Date.now()-86400000).toISOString(), modulo: 'RH' },
      { empresaId: emp3, titulo: 'Relatório financeiro disponível', mensagem: 'Balanço Q1 da Construtora Alvo S.A. foi publicado.', tipo: 'info', lido: true, timestamp: new Date(Date.now()-172800000).toISOString(), modulo: 'Financeiro' },
      { empresaId: emp1, titulo: 'Backup automático realizado', mensagem: 'Backup dos dados completado com sucesso.', tipo: 'sucesso', lido: true, timestamp: new Date(Date.now()-259200000).toISOString(), modulo: 'Sistema' },
    ]);
  }

  if (docsPessoaisCount === 0) {
    await db.docsPessoais.bulkAdd([
      // Eduardo — Docs Pessoais
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Eduardo', nome: 'Passaporte Brasileiro', tipo: 'PDF', descricao: 'Passaporte emitido 2022, válido até 2032', dataUpload: '2024-01-10', tamanho: '2.1 MB', status: 'ativo', vencimento: '2032-03-15' },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Eduardo', nome: 'CPF / RG', tipo: 'PDF', descricao: 'Documentos de identidade brasileiros', dataUpload: '2024-01-10', tamanho: '980 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Eduardo', nome: 'Social Security Card', tipo: 'PDF', descricao: 'SSN emitido pelo SSA', dataUpload: '2023-06-20', tamanho: '310 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Eduardo', nome: 'Driver\'s License — Florida', tipo: 'PDF', descricao: 'CNH Florida emitida 2021', dataUpload: '2023-06-20', tamanho: '450 KB', status: 'ativo', vencimento: '2027-06-20' },
      // Carla — Docs Pessoais
      { pessoa: 'Carla', categoria: 'Documentos Pessoais', subcategoria: 'Carla', nome: 'Passaporte Brasileiro — Carla', tipo: 'PDF', descricao: 'Passaporte emitido 2021, válido até 2031', dataUpload: '2024-01-15', tamanho: '1.8 MB', status: 'ativo', vencimento: '2031-08-10' },
      { pessoa: 'Carla', categoria: 'Documentos Pessoais', subcategoria: 'Carla', nome: 'CPF / RG — Carla', tipo: 'PDF', descricao: 'Documentos de identidade brasileiros', dataUpload: '2024-01-15', tamanho: '760 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Carla', categoria: 'Documentos Pessoais', subcategoria: 'Carla', nome: 'Certidão de Casamento', tipo: 'PDF', descricao: 'Certidão traduzida e apostilada', dataUpload: '2023-09-05', tamanho: '1.2 MB', status: 'ativo', vencimento: null },
      // Rejane / Família
      { pessoa: 'Família', categoria: 'Documentos Pessoais', subcategoria: 'Rejane / Família', nome: 'Certidão de Nascimento — Rejane', tipo: 'PDF', descricao: 'Certidão original e cópia autenticada', dataUpload: '2023-11-20', tamanho: '540 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Família', categoria: 'Documentos Pessoais', subcategoria: 'Rejane / Família', nome: 'Declaração de Dependente', tipo: 'PDF', descricao: 'Para fins fiscais IRS e Receita Federal', dataUpload: '2024-03-01', tamanho: '320 KB', status: 'ativo', vencimento: null },
      // Imóveis & Mortgage
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Imóveis & Mortgage', nome: 'Escritura — Casa Miami', tipo: 'PDF', descricao: 'Deed of Property, Miami-Dade County', dataUpload: '2022-11-30', tamanho: '3.4 MB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Imóveis & Mortgage', nome: 'Mortgage Statement 2024', tipo: 'PDF', descricao: 'Extrato anual do financiamento imobiliário', dataUpload: '2024-02-10', tamanho: '890 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Imóveis & Mortgage', nome: 'Escritura — Apartamento SP', tipo: 'PDF', descricao: 'Matrícula e escritura do imóvel em São Paulo', dataUpload: '2023-07-15', tamanho: '2.6 MB', status: 'ativo', vencimento: null },
      // Greencard & Imigração
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Greencard & Imigração', nome: 'Green Card — Eduardo', tipo: 'PDF', descricao: 'Permanent Resident Card, validade 10 anos', dataUpload: '2023-04-18', tamanho: '560 KB', status: 'ativo', vencimento: '2033-04-18' },
      { pessoa: 'Carla', categoria: 'Documentos Pessoais', subcategoria: 'Greencard & Imigração', nome: 'Green Card — Carla', tipo: 'PDF', descricao: 'Permanent Resident Card, validade 10 anos', dataUpload: '2023-04-18', tamanho: '540 KB', status: 'ativo', vencimento: '2033-04-18' },
      { pessoa: 'Eduardo', categoria: 'Documentos Pessoais', subcategoria: 'Greencard & Imigração', nome: 'I-130 Approval Notice', tipo: 'PDF', descricao: 'Petition for Alien Relative — aprovado', dataUpload: '2022-08-05', tamanho: '780 KB', status: 'ativo', vencimento: null },
      // FBAR / FATCA
      { pessoa: 'Eduardo', categoria: 'Compliance', subcategoria: 'FBAR / FATCA', nome: 'FBAR Filing 2023', tipo: 'PDF', descricao: 'FinCEN 114 — Foreign Bank Account Report', dataUpload: '2024-04-15', tamanho: '420 KB', status: 'ativo', vencimento: '2025-04-15' },
      { pessoa: 'Eduardo', categoria: 'Compliance', subcategoria: 'FBAR / FATCA', nome: 'FATCA Form 8938 — 2023', tipo: 'PDF', descricao: 'Statement of Specified Foreign Financial Assets', dataUpload: '2024-04-15', tamanho: '380 KB', status: 'ativo', vencimento: null },
      // FIRPTA
      { pessoa: 'Eduardo', categoria: 'Compliance', subcategoria: 'FIRPTA', nome: 'FIRPTA Withholding Certificate', tipo: 'PDF', descricao: 'Certificado de isenção de retenção na fonte', dataUpload: '2023-10-01', tamanho: '290 KB', status: 'ativo', vencimento: null },
      // Licenças & Registros
      { pessoa: 'Eduardo', categoria: 'Compliance', subcategoria: 'Licenças & Registros', nome: 'Business License — Eduardo', tipo: 'PDF', descricao: 'Licença de negócios pessoal, Miami-Dade', dataUpload: '2024-01-05', tamanho: '200 KB', status: 'ativo', vencimento: '2025-12-31' },
      // Seguros
      { pessoa: 'Eduardo', categoria: 'Compliance', subcategoria: 'Seguros', nome: 'Apólice Seguro de Vida', tipo: 'PDF', descricao: 'Term Life Insurance — $2M coverage', dataUpload: '2023-05-20', tamanho: '1.1 MB', status: 'ativo', vencimento: '2033-05-20' },
      { pessoa: 'Carla', categoria: 'Compliance', subcategoria: 'Seguros', nome: 'Apólice Seguro Saúde — Carla', tipo: 'PDF', descricao: 'Health insurance policy Florida Blue', dataUpload: '2024-01-15', tamanho: '870 KB', status: 'ativo', vencimento: '2024-12-31' },
      // Investimentos
      { pessoa: 'Eduardo', categoria: 'Patrimônio', subcategoria: 'Investimentos', nome: 'Portfolio Statement — Schwab 2023', tipo: 'PDF', descricao: 'Extrato anual da corretora Charles Schwab', dataUpload: '2024-02-01', tamanho: '1.5 MB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Patrimônio', subcategoria: 'Investimentos', nome: 'Relatório XP Investimentos 2023', tipo: 'PDF', descricao: 'Posição consolidada na XP', dataUpload: '2024-01-30', tamanho: '980 KB', status: 'ativo', vencimento: null },
      // Imóveis (US + BR)
      { pessoa: 'Eduardo', categoria: 'Patrimônio', subcategoria: 'Imóveis (US + BR)', nome: 'Laudo de Avaliação — Miami', tipo: 'PDF', descricao: 'Property appraisal report 2024', dataUpload: '2024-03-10', tamanho: '2.2 MB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Patrimônio', subcategoria: 'Imóveis (US + BR)', nome: 'Laudo de Avaliação — SP', tipo: 'PDF', descricao: 'Laudo CRECI São Paulo 2023', dataUpload: '2023-12-01', tamanho: '1.7 MB', status: 'ativo', vencimento: null },
      // Valuation de Empresas
      { pessoa: 'Eduardo', categoria: 'Patrimônio', subcategoria: 'Valuation de Empresas', nome: 'Valuation Grupo Meridian 2023', tipo: 'PDF', descricao: 'Laudo de avaliação por empresa independente', dataUpload: '2024-01-20', tamanho: '3.1 MB', status: 'ativo', vencimento: null },
      // Assessores & Parceiros
      { pessoa: 'Eduardo', categoria: 'Management', subcategoria: 'Assessores & Parceiros', nome: 'Contrato — Escritório Contábil BR', tipo: 'PDF', descricao: 'Contrato de prestação de serviços contábeis', dataUpload: '2024-01-03', tamanho: '650 KB', status: 'ativo', vencimento: '2025-12-31' },
      { pessoa: 'Eduardo', categoria: 'Management', subcategoria: 'Assessores & Parceiros', nome: 'Contrato — Tax Attorney US', tipo: 'PDF', descricao: 'Engagement letter com escritório americano', dataUpload: '2023-11-10', tamanho: '490 KB', status: 'ativo', vencimento: '2024-12-31' },
      // Procurações & Autoridades
      { pessoa: 'Eduardo', categoria: 'Management', subcategoria: 'Procurações & Autoridades', nome: 'Procuração Geral — Brasil', tipo: 'PDF', descricao: 'Procuração pública para representação no Brasil', dataUpload: '2023-08-22', tamanho: '730 KB', status: 'ativo', vencimento: null },
      { pessoa: 'Eduardo', categoria: 'Management', subcategoria: 'Procurações & Autoridades', nome: 'Power of Attorney — USA', tipo: 'PDF', descricao: 'Durable POA para representação nos EUA', dataUpload: '2023-09-14', tamanho: '580 KB', status: 'ativo', vencimento: null },
      // Data Room
      { pessoa: 'Eduardo', categoria: 'Management', subcategoria: 'Data Room', nome: 'Índice Geral do Data Room', tipo: 'PDF', descricao: 'Mapa completo de documentos do portfólio', dataUpload: '2024-04-01', tamanho: '210 KB', status: 'ativo', vencimento: null },
    ]);
  }

  if (fiscalDocsCount === 0) {
    await db.fiscalDocs.bulkAdd([
      // Tax Planning (US)
      { subcategoria: 'Tax Planning (US)', nome: 'Tax Strategy Memo 2024', tipo: 'PDF', jurisdicao: 'US', ano: '2024', descricao: 'Planejamento tributário federal e estadual para 2024', dataUpload: '2024-01-15', tamanho: '1.2 MB', status: 'ativo', responsavel: 'Tax Attorney', vencimento: null },
      { subcategoria: 'Tax Planning (US)', nome: 'Estimated Tax Payments Schedule', tipo: 'XLSX', jurisdicao: 'US', ano: '2024', descricao: 'Calendário de pagamentos estimados IRS 2024', dataUpload: '2024-01-20', tamanho: '340 KB', status: 'ativo', responsavel: 'CPA', vencimento: '2025-01-15' },
      { subcategoria: 'Tax Planning (US)', nome: 'State Tax Nexus Analysis', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Análise de nexo fiscal nos estados FL, TX, NY', dataUpload: '2023-11-10', tamanho: '890 KB', status: 'ativo', responsavel: 'Tax Attorney', vencimento: null },
      // Tax Planning (BR)
      { subcategoria: 'Tax Planning (BR)', nome: 'Planejamento Tributário 2024 — Grupo Meridian', tipo: 'PDF', jurisdicao: 'BR', ano: '2024', descricao: 'Estratégia fiscal consolidada para o grupo no Brasil', dataUpload: '2024-02-01', tamanho: '1.5 MB', status: 'ativo', responsavel: 'Contador', vencimento: null },
      { subcategoria: 'Tax Planning (BR)', nome: 'Opção pelo Lucro Real — Análise', tipo: 'PDF', jurisdicao: 'BR', ano: '2024', descricao: 'Comparativo Lucro Real vs Lucro Presumido', dataUpload: '2023-12-20', tamanho: '760 KB', status: 'ativo', responsavel: 'Contador', vencimento: null },
      { subcategoria: 'Tax Planning (BR)', nome: 'Benefícios Fiscais Zona Franca', tipo: 'PDF', jurisdicao: 'BR', ano: '2023', descricao: 'Estudo de viabilidade de operação em ZFM', dataUpload: '2023-09-05', tamanho: '620 KB', status: 'ativo', responsavel: 'Advogado Tributário', vencimento: null },
      // IRS Filings
      { subcategoria: 'IRS Filings', nome: 'Form 1040 — 2023', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Declaração de imposto de renda federal 2023', dataUpload: '2024-04-15', tamanho: '980 KB', status: 'entregue', responsavel: 'CPA', vencimento: '2025-04-15' },
      { subcategoria: 'IRS Filings', nome: 'Form 1120 — Meridian USA 2023', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Corporate tax return Meridian USA Inc.', dataUpload: '2024-03-15', tamanho: '1.1 MB', status: 'entregue', responsavel: 'CPA', vencimento: '2025-03-15' },
      { subcategoria: 'IRS Filings', nome: 'Form 5471 — 2023', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Information Return for Foreign Corporations', dataUpload: '2024-04-15', tamanho: '540 KB', status: 'entregue', responsavel: 'CPA', vencimento: null },
      { subcategoria: 'IRS Filings', nome: 'Form 926 — 2023', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Return by US Transferor of Property to Foreign Corp', dataUpload: '2024-04-15', tamanho: '280 KB', status: 'entregue', responsavel: 'CPA', vencimento: null },
      // IR Brasil
      { subcategoria: 'IR Brasil', nome: 'DIRPF 2024 (ano-base 2023)', tipo: 'PDF', jurisdicao: 'BR', ano: '2023', descricao: 'Declaração IRPF entregue à Receita Federal', dataUpload: '2024-04-28', tamanho: '870 KB', status: 'entregue', responsavel: 'Contador', vencimento: '2025-05-31' },
      { subcategoria: 'IR Brasil', nome: 'IRPJ Grupo Meridian 2023', tipo: 'PDF', jurisdicao: 'BR', ano: '2023', descricao: 'ECF — Escrituração Contábil Fiscal', dataUpload: '2024-07-31', tamanho: '2.1 MB', status: 'entregue', responsavel: 'Contador', vencimento: '2025-07-31' },
      { subcategoria: 'IR Brasil', nome: 'DCTF Mensal — Consolidado 2024', tipo: 'XLSX', jurisdicao: 'BR', ano: '2024', descricao: 'Planilha de acompanhamento das DTCFs mensais', dataUpload: '2024-03-10', tamanho: '450 KB', status: 'ativo', responsavel: 'Contador', vencimento: null },
      // Check-the-Box Elections
      { subcategoria: 'Check-the-Box Elections', nome: 'Form 8832 — Alvo Properties LLC', tipo: 'PDF', jurisdicao: 'US', ano: '2022', descricao: 'Entity Classification Election — disregarded entity', dataUpload: '2022-05-20', tamanho: '310 KB', status: 'ativo', responsavel: 'Tax Attorney', vencimento: null },
      { subcategoria: 'Check-the-Box Elections', nome: 'CTB Analysis Memo — Estrutura Holding', tipo: 'PDF', jurisdicao: 'US', ano: '2023', descricao: 'Análise das eleições check-the-box para cada entidade', dataUpload: '2023-08-14', tamanho: '740 KB', status: 'ativo', responsavel: 'Tax Attorney', vencimento: null },
      // Mútuo / Intercompany
      { subcategoria: 'Mútuo / Intercompany', nome: 'Contrato de Mútuo — Meridian BR → USA', tipo: 'PDF', jurisdicao: 'BR/US', ano: '2023', descricao: 'Empréstimo intercompany com taxa SOFR + 2%', dataUpload: '2023-06-01', tamanho: '680 KB', status: 'ativo', responsavel: 'Advogado', vencimento: '2026-06-01' },
      { subcategoria: 'Mútuo / Intercompany', nome: 'Transfer Pricing Study 2023', tipo: 'PDF', jurisdicao: 'BR/US', ano: '2023', descricao: 'Estudo de preços de transferência conforme IN RFB 1.312', dataUpload: '2024-01-30', tamanho: '1.8 MB', status: 'ativo', responsavel: 'Consultor TP', vencimento: null },
      { subcategoria: 'Mútuo / Intercompany', nome: 'Intercompany Agreement — Serviços TI', tipo: 'PDF', jurisdicao: 'BR/US', ano: '2024', descricao: 'Acordo de prestação de serviços entre entidades do grupo', dataUpload: '2024-02-15', tamanho: '920 KB', status: 'ativo', responsavel: 'Advogado', vencimento: '2025-02-15' },
    ]);
  }
}

// ── Seed de dados mockados ───────────────────────────────────
async function seedIfEmpty() {
  const count = await db.empresas.count();
  if (count > 0) return;

  const emp1 = await db.empresas.add({ nome: 'Grupo Meridian Ltda', pais: 'BR', cnpj: '12.345.678/0001-90', ein: '', status: 'ativo', cidade: 'São Paulo', estado: 'SP', website: 'meridian.com.br', legalType: 'Ltda', taxRegime: 'Lucro Real', fundacao: '2012-03-15', setor: 'Tecnologia', notas: '' });
  const emp2 = await db.empresas.add({ nome: 'Meridian USA Inc.', pais: 'US', cnpj: '', ein: '82-1234567', status: 'ativo', cidade: 'Miami', estado: 'FL', website: 'meridianusa.com', legalType: 'Corporation', taxRegime: 'C-Corp', fundacao: '2018-07-20', setor: 'Tecnologia', notas: '' });
  const emp3 = await db.empresas.add({ nome: 'Construtora Alvo S.A.', pais: 'BR', cnpj: '98.765.432/0001-10', ein: '', status: 'ativo', cidade: 'Belo Horizonte', estado: 'MG', website: '', legalType: 'S.A.', taxRegime: 'Lucro Presumido', fundacao: '2005-11-08', setor: 'Construção', notas: '' });
  const emp4 = await db.empresas.add({ nome: 'Alvo Properties LLC', pais: 'US', cnpj: '', ein: '75-9876543', status: 'ativo', cidade: 'Orlando', estado: 'FL', website: '', legalType: 'LLC', taxRegime: 'Pass-Through', fundacao: '2020-01-10', setor: 'Imóveis', notas: '' });

  await db.funcionarios.bulkAdd([
    { empresaId: emp1, nome: 'Carlos Henrique Melo', cargo: 'CEO', departamento: 'Diretoria', salario: 35000, moedaSalario: 'BRL', status: 'ativo', admissao: '2012-03-15', email: 'carlos@meridian.com.br', telefone: '(11) 99999-0001', documento: '111.222.333-44', pais: 'BR' },
    { empresaId: emp1, nome: 'Ana Paula Ferreira', cargo: 'CTO', departamento: 'Tecnologia', salario: 28000, moedaSalario: 'BRL', status: 'ativo', admissao: '2013-06-01', email: 'ana@meridian.com.br', telefone: '(11) 99999-0002', documento: '222.333.444-55', pais: 'BR' },
    { empresaId: emp1, nome: 'Ricardo Souza', cargo: 'Dev Senior', departamento: 'Tecnologia', salario: 18000, moedaSalario: 'BRL', status: 'ativo', admissao: '2019-02-10', email: 'ricardo@meridian.com.br', telefone: '(11) 99999-0003', documento: '333.444.555-66', pais: 'BR' },
    { empresaId: emp2, nome: 'John Mitchell', cargo: 'Country Manager', departamento: 'Management', salario: 12000, moedaSalario: 'USD', status: 'ativo', admissao: '2018-08-01', email: 'john@meridianusa.com', telefone: '+1 305 555-0101', documento: '987-65-4321', pais: 'US' },
    { empresaId: emp2, nome: 'Sarah Johnson', cargo: 'Sales Director', departamento: 'Sales', salario: 9500, moedaSalario: 'USD', status: 'ativo', admissao: '2019-03-15', email: 'sarah@meridianusa.com', telefone: '+1 305 555-0102', documento: '876-54-3210', pais: 'US' },
    { empresaId: emp3, nome: 'Marcos Oliveira', cargo: 'Diretor de Obras', departamento: 'Engenharia', salario: 22000, moedaSalario: 'BRL', status: 'ativo', admissao: '2006-01-20', email: 'marcos@alvo.com.br', telefone: '(31) 99888-0001', documento: '444.555.666-77', pais: 'BR' },
    { empresaId: emp3, nome: 'Juliana Ramos', cargo: 'Gerente Financeiro', departamento: 'Financeiro', salario: 16000, moedaSalario: 'BRL', status: 'ativo', admissao: '2010-05-12', email: 'juliana@alvo.com.br', telefone: '(31) 99888-0002', documento: '555.666.777-88', pais: 'BR' },
    { empresaId: emp4, nome: 'Michael Torres', cargo: 'Property Manager', departamento: 'Operations', salario: 7500, moedaSalario: 'USD', status: 'ativo', admissao: '2020-02-01', email: 'michael@alvoproperties.com', telefone: '+1 407 555-0201', documento: '765-43-2109', pais: 'US' },
  ]);

  const now = new Date();
  const mo = (offset) => { const d = new Date(now); d.setMonth(d.getMonth() - offset); return d.toISOString().slice(0,7); };
  const tx = [];
  for (let i = 5; i >= 0; i--) {
    tx.push({ empresaId: emp1, tipo: 'receita', categoria: 'Serviços', descricao: 'Contratos SaaS', valor: 180000 + Math.random()*20000|0, moeda: 'BRL', data: mo(i)+'-01' });
    tx.push({ empresaId: emp1, tipo: 'despesa', categoria: 'Pessoal', descricao: 'Folha de pagamento', valor: 95000 + Math.random()*5000|0, moeda: 'BRL', data: mo(i)+'-05' });
    tx.push({ empresaId: emp1, tipo: 'despesa', categoria: 'Infraestrutura', descricao: 'Cloud AWS', valor: 12000 + Math.random()*2000|0, moeda: 'BRL', data: mo(i)+'-10' });
    tx.push({ empresaId: emp2, tipo: 'receita', categoria: 'Sales', descricao: 'Enterprise contracts', valor: 45000 + Math.random()*8000|0, moeda: 'USD', data: mo(i)+'-01' });
    tx.push({ empresaId: emp2, tipo: 'despesa', categoria: 'Payroll', descricao: 'Salaries', valor: 28000 + Math.random()*2000|0, moeda: 'USD', data: mo(i)+'-05' });
    tx.push({ empresaId: emp3, tipo: 'receita', categoria: 'Obras', descricao: 'Contratos de construção', valor: 320000 + Math.random()*50000|0, moeda: 'BRL', data: mo(i)+'-01' });
    tx.push({ empresaId: emp3, tipo: 'despesa', categoria: 'Materiais', descricao: 'Insumos de obra', valor: 180000 + Math.random()*30000|0, moeda: 'BRL', data: mo(i)+'-08' });
    tx.push({ empresaId: emp4, tipo: 'receita', categoria: 'Rent', descricao: 'Rental income', valor: 28000 + Math.random()*3000|0, moeda: 'USD', data: mo(i)+'-01' });
    tx.push({ empresaId: emp4, tipo: 'despesa', categoria: 'Maintenance', descricao: 'Property expenses', valor: 8000 + Math.random()*2000|0, moeda: 'USD', data: mo(i)+'-10' });
  }
  await db.transacoes.bulkAdd(tx);

  await db.documentos.bulkAdd([
    { empresaId: emp1, nome: 'Contrato Social', categoria: 'Constituição', versao: '3', dataUpload: '2024-01-10', tamanho: '1.2 MB', tipo: 'PDF', descricao: 'Contrato social consolidado' },
    { empresaId: emp1, nome: 'Balanço 2023', categoria: 'Financeiro', versao: '1', dataUpload: '2024-02-28', tamanho: '845 KB', tipo: 'PDF', descricao: 'Balanço patrimonial 2023' },
    { empresaId: emp2, nome: 'Articles of Incorporation', categoria: 'Legal', versao: '2', dataUpload: '2023-09-15', tamanho: '980 KB', tipo: 'PDF', descricao: 'Original incorporation documents' },
    { empresaId: emp2, nome: 'W-9 Form', categoria: 'Tax', versao: '1', dataUpload: '2024-01-05', tamanho: '120 KB', tipo: 'PDF', descricao: 'Federal tax identification' },
    { empresaId: emp3, nome: 'Alvará de Funcionamento', categoria: 'Licenças', versao: '1', dataUpload: '2024-03-01', tamanho: '560 KB', tipo: 'PDF', descricao: 'Alvará municipal vigente' },
    { empresaId: emp4, nome: 'LLC Operating Agreement', categoria: 'Legal', versao: '1', dataUpload: '2020-01-15', tamanho: '1.5 MB', tipo: 'PDF', descricao: 'Operating agreement document' },
  ]);

  await db.orgNodes.bulkAdd([
    { empresaId: emp1, parentId: null, nome: 'Carlos Henrique', cargo: 'CEO' },
    { empresaId: emp1, parentId: 1, nome: 'Ana Paula', cargo: 'CTO' },
    { empresaId: emp1, parentId: 1, nome: 'Juliana Costa', cargo: 'CFO' },
    { empresaId: emp1, parentId: 2, nome: 'Ricardo Souza', cargo: 'Dev Senior' },
    { empresaId: emp1, parentId: 2, nome: 'Fernanda Lima', cargo: 'UX Designer' },
    { empresaId: emp1, parentId: 3, nome: 'Paulo Mendes', cargo: 'Controller' },
    { empresaId: emp2, parentId: null, nome: 'John Mitchell', cargo: 'Country Manager' },
    { empresaId: emp2, parentId: 7, nome: 'Sarah Johnson', cargo: 'Sales Director' },
    { empresaId: emp2, parentId: 7, nome: 'Mike Chen', cargo: 'Tech Lead' },
  ]);

  await db.auditLog.bulkAdd([
    { acao: 'Sistema inicializado com dados de demonstração', modulo: 'Sistema', timestamp: new Date().toISOString() },
    { acao: '4 empresas cadastradas automaticamente', modulo: 'Empresas', timestamp: new Date().toISOString() },
    { acao: '8 funcionários registrados', modulo: 'Funcionários', timestamp: new Date().toISOString() },
  ]);

  const today = new Date();
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r.toISOString().slice(0,10); };

  await db.tasks.bulkAdd([
    { empresaId: emp1, titulo: 'Renovar contrato social', descricao: 'Atualizar dados dos sócios e integralização', prioridade: 'alta', status: 'pendente', responsavel: 'Carlos Henrique Melo', vencimento: addDays(today, 5), categoria: 'Jurídico' },
    { empresaId: emp1, titulo: 'Declaração IRPJ 2024', descricao: 'Entregar declaração à Receita Federal', prioridade: 'alta', status: 'em-andamento', responsavel: 'Juliana Ramos', vencimento: addDays(today, 12), categoria: 'Fiscal' },
    { empresaId: emp2, titulo: 'Annual Report filing', descricao: 'Submit annual report to Florida DoS', prioridade: 'alta', status: 'pendente', responsavel: 'John Mitchell', vencimento: addDays(today, 3), categoria: 'Compliance' },
    { empresaId: emp2, titulo: 'Renew business license', descricao: 'Renew Miami-Dade county license', prioridade: 'media', status: 'pendente', responsavel: 'Sarah Johnson', vencimento: addDays(today, 18), categoria: 'Licenças' },
    { empresaId: emp3, titulo: 'Alvará de obra — Lote 12', descricao: 'Solicitar alvará para nova fase do empreendimento', prioridade: 'alta', status: 'em-andamento', responsavel: 'Marcos Oliveira', vencimento: addDays(today, 7), categoria: 'Licenças' },
    { empresaId: emp3, titulo: 'Auditoria contábil Q1', descricao: 'Revisão dos balanços do primeiro trimestre', prioridade: 'media', status: 'pendente', responsavel: 'Juliana Ramos', vencimento: addDays(today, 21), categoria: 'Financeiro' },
    { empresaId: emp4, titulo: 'Property tax assessment', descricao: 'Review and respond to Orlando tax assessment', prioridade: 'media', status: 'pendente', responsavel: 'Michael Torres', vencimento: addDays(today, 30), categoria: 'Fiscal' },
    { empresaId: emp1, titulo: 'Renovar certificado digital', descricao: 'e-CNPJ vence em breve', prioridade: 'alta', status: 'pendente', responsavel: 'Ana Paula Ferreira', vencimento: addDays(today, 2), categoria: 'TI' },
    { empresaId: emp1, titulo: 'Reunião conselho trimestral', descricao: 'Preparar materiais para reunião do conselho', prioridade: 'media', status: 'concluida', responsavel: 'Carlos Henrique Melo', vencimento: addDays(today, -3), categoria: 'Gestão' },
    { empresaId: emp2, titulo: 'Q2 tax estimated payment', descricao: 'IRS estimated quarterly payment', prioridade: 'media', status: 'concluida', responsavel: 'John Mitchell', vencimento: addDays(today, -5), categoria: 'Fiscal' },
  ]);

  await db.alertas.bulkAdd([
    { empresaId: emp1, titulo: 'Certificado digital vencendo', mensagem: 'e-CNPJ do Grupo Meridian Ltda vence em 2 dias. Renove imediatamente.', tipo: 'critico', lido: false, timestamp: new Date().toISOString(), modulo: 'Empresas' },
    { empresaId: emp2, titulo: 'Annual Report prazo crítico', mensagem: 'Florida Annual Report vence em 3 dias. Multa de US$ 400 se não entregue.', tipo: 'critico', lido: false, timestamp: new Date().toISOString(), modulo: 'Compliance' },
    { empresaId: emp1, titulo: 'Prazo fiscal se aproxima', mensagem: 'IRPJ 2024 vence em 12 dias. Documentação pendente.', tipo: 'aviso', lido: false, timestamp: new Date(Date.now()-3600000).toISOString(), modulo: 'Fiscal' },
    { empresaId: emp3, titulo: 'Alvará de obra pendente', mensagem: 'Solicitação do alvará para o Lote 12 ainda não foi protocolada.', tipo: 'aviso', lido: false, timestamp: new Date(Date.now()-7200000).toISOString(), modulo: 'Licenças' },
    { empresaId: emp4, titulo: 'Vistoria imóvel agendada', mensagem: 'Vistoria do Orange County agendada para próxima semana.', tipo: 'info', lido: false, timestamp: new Date(Date.now()-10800000).toISOString(), modulo: 'Imóveis' },
    { empresaId: emp2, titulo: 'Novo funcionário onboarding', mensagem: 'Sarah Johnson completou os formulários de admissão.', tipo: 'info', lido: true, timestamp: new Date(Date.now()-86400000).toISOString(), modulo: 'RH' },
    { empresaId: emp3, titulo: 'Relatório financeiro disponível', mensagem: 'Balanço Q1 da Construtora Alvo S.A. foi publicado.', tipo: 'info', lido: true, timestamp: new Date(Date.now()-172800000).toISOString(), modulo: 'Financeiro' },
    { empresaId: emp1, titulo: 'Backup automático realizado', mensagem: 'Backup dos dados completado com sucesso.', tipo: 'sucesso', lido: true, timestamp: new Date(Date.now()-259200000).toISOString(), modulo: 'Sistema' },
  ]);
}

// ── Web Crypto: SHA-256 ──────────────────────────────────────
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Formatters ───────────────────────────────────────────────
const fmt = {
  currency(val, moeda = 'BRL', lang = 'pt-BR') {
    return new Intl.NumberFormat(lang, { style: 'currency', currency: moeda, maximumFractionDigits: 0 }).format(val);
  },
  date(str, lang = 'pt-BR') {
    if (!str) return '—';
    return new Date(str + 'T12:00:00').toLocaleDateString(lang);
  },
  number(val) {
    return new Intl.NumberFormat('pt-BR').format(val);
  },
  initials(nome) {
    return (nome || '').split(' ').slice(0,2).map(p => p[0]).join('').toUpperCase();
  },
  avatarColor(nome) {
    const colors = ['#6470f1','#22c55e','#f59e0b','#3b82f6','#ef4444','#8b5cf6','#14b8a6'];
    let h = 0;
    for (let c of (nome||'')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
    return colors[Math.abs(h) % colors.length];
  }
};

// ── Context ──────────────────────────────────────────────────
const AppContext = createContext(null);
function useApp() { return useContext(AppContext); }

// ── Toast component ──────────────────────────────────────────
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={t.type === 'success' ? 'fas fa-check-circle' : 'fas fa-times-circle'} />
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Confirm Dialog ───────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel, t: tProp }) {
  const ctx = useApp();
  const t = tProp || ctx?.t || { cancel: 'Cancelar', confirm: 'Confirmar' };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{maxWidth:400}} onClick={e=>e.stopPropagation()}>
        <div className="modal-title" style={{fontSize:16}}><i className="fas fa-exclamation-triangle" style={{color:'var(--yellow)',marginRight:8}}/>Confirmar</div>
        <p style={{color:'var(--text-secondary)',marginBottom:20,fontSize:14}}>{msg}</p>
        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>{t.cancel}</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>{t.confirm}</button>
        </div>
      </div>
    </div>
  );
}

// ── Auth Screen ──────────────────────────────────────────────
function AuthScreen({ onLogin, lang, setLang }) {
  const t = TRANSLATIONS[lang];
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [isSetup, setIsSetup] = useState(null); // null=loading

  useEffect(() => {
    db.config.get('passwordHash').then(rec => setIsSetup(!!rec?.value));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    if (!isSetup) {
      if (pw.length < 6) { setErr(t.passwordTooShort); return; }
      if (pw !== pw2)    { setErr(t.passwordMismatch); return; }
      const hash = await sha256(pw);
      await db.config.put({ chave: 'passwordHash', value: hash });
      await db.auditLog.add({ acao: 'Senha configurada', modulo: 'Auth', timestamp: new Date().toISOString() });
      onLogin();
    } else {
      const rec = await db.config.get('passwordHash');
      const hash = await sha256(pw);
      if (hash === rec.value) {
        await db.auditLog.add({ acao: 'Login realizado', modulo: 'Auth', timestamp: new Date().toISOString() });
        onLogin();
      } else {
        setErr(t.wrongPassword);
      }
    }
  }

  if (isSetup === null) return <div className="auth-bg"><div style={{color:'var(--text-muted)'}}>Carregando...</div></div>;

  return (
    <div className="auth-bg">
      <div style={{position:'absolute',top:20,right:24,display:'flex',gap:8}}>
        <button className={`topbar-pill ${lang==='pt-BR'?'active':''}`} onClick={()=>setLang('pt-BR')}>PT</button>
        <button className={`topbar-pill ${lang==='en-US'?'active':''}`} onClick={()=>setLang('en-US')}>EN</button>
      </div>
      <div className="auth-card">
        <div className="auth-logo" style={{marginBottom:6}}>{t.appName.split(' ')[0]}<span>{t.appName.includes(' ') ? ' '+t.appName.split(' ').slice(1).join(' ') : ''}</span></div>
        <p style={{color:'var(--text-muted)',fontSize:13,marginBottom:28}}>{isSetup ? t.login : t.setupPassword}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.password}</label>
            <input className="form-input" type="password" value={pw} onChange={e=>setPw(e.target.value)} autoFocus placeholder="••••••••" />
          </div>
          {!isSetup && (
            <div className="form-group">
              <label className="form-label">{t.confirmPassword}</label>
              <input className="form-input" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="••••••••" />
            </div>
          )}
          {err && <div className="alert alert-error" style={{marginBottom:16,padding:'8px 12px',fontSize:13}}><i className="fas fa-circle-exclamation"/>{err}</div>}
          <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:'10px'}} type="submit">
            <i className="fas fa-arrow-right-to-bracket"/>{t.login}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
const NAV_STRUCTURE = [
  // Top-level items (no section)
  { key: 'dashboard', icon: 'fa-gauge-high',    label: { pt: 'Dashboard',         en: 'Dashboard'         }, section: null },
  { key: 'tasks',     icon: 'fa-list-check',    label: { pt: 'Tasks & Deadlines', en: 'Tasks & Deadlines' }, section: null },

  // ── EMPRESAS ──────────────────────────────────────────────
  {
    key: 'sec-empresas', type: 'section', label: { pt: 'Empresas', en: 'Companies' },
    children: [
      { key: 'companies', icon: 'fa-building', label: { pt: 'Empresas', en: 'Companies' } },
      { key: 'orgchart',   icon: 'fa-sitemap',    label: { pt: 'Organograma',  en: 'Org Chart'   } },
      { key: 'valuations', icon: 'fa-chart-line', label: { pt: 'Valuations',   en: 'Valuations'  } },
    ],
  },

  // ── PESSOAL ───────────────────────────────────────────────
  {
    key: 'sec-pessoal', type: 'section', label: { pt: 'Pessoal', en: 'Personal' },
    children: [
      {
        key: 'baseIdentidade', icon: 'fa-id-card', label: { pt: 'Base & Identidade', en: 'Base & Identity' },
        children: [
          { key: 'personalDocs', icon: 'fa-passport', label: { pt: 'Documentos pessoais', en: 'Personal Documents' } },
          { key: 'healthPlan',   icon: 'fa-hospital', label: { pt: 'Plano de saúde',      en: 'Health Plan'        } },
        ],
      },
      {
        key: 'saudeQV', icon: 'fa-heart-pulse', label: { pt: 'Seguros', en: 'Insurance' },
        children: [
          { key: 'lifeInsurance',icon: 'fa-shield-heart',  label: { pt: 'Seguro de vida',        en: 'Life Insurance' } },
          { key: 'carInsurance', icon: 'fa-car',           label: { pt: 'Seguro do carro',       en: 'Car Insurance'  } },
          { key: 'aptInsurance', icon: 'fa-building',      label: { pt: 'Seguro do apartamento', en: 'Apt Insurance'  } },
        ],
      },
      {
        key: 'estruturaPessoal', icon: 'fa-users', label: { pt: 'Estrutura pessoal', en: 'Personal Structure' },
        children: [
          { key: 'employees', icon: 'fa-user-tie', label: { pt: 'Funcionários pessoais', en: 'Personal Employees' } },
        ],
      },
      {
        key: 'financeiroPatrimonio', icon: 'fa-coins', label: { pt: 'Financeiro & Patrimônio', en: 'Finance & Assets' },
        children: [
          { key: 'investments',   icon: 'fa-chart-pie',    label: { pt: 'Investimentos',      en: 'Investments'   } },
          { key: 'realEstate',    icon: 'fa-house',        label: { pt: 'Imóveis & Mortgage', en: 'Real Estate'   } },
          { key: 'fixedExpenses', icon: 'fa-file-invoice', label: { pt: 'Despesas Fixas',     en: 'Fixed Expenses'} },
        ],
      },
      {
        key: 'juridicoLegal', icon: 'fa-scale-balanced', label: { pt: 'Jurídico & Estrutura Legal', en: 'Legal Structure' },
        children: [
          { key: 'juridico',       icon: 'fa-gavel',       label: { pt: 'Jurídico',         en: 'Legal'              } },
          { key: 'acordoGaveta',   icon: 'fa-handshake',   label: { pt: 'Acordo de gaveta', en: 'Side Agreement'     } },
        ],
      },
      {
        key: 'fiscalBRUS', icon: 'fa-receipt', label: { pt: 'Fiscal BR vs US', en: 'Fiscal BR vs US' },
        children: [
          { key: 'fiscalTax',     icon: 'fa-file-invoice-dollar', label: { pt: 'Tax Return – IRS', en: 'Tax Return – IRS' } },
          { key: 'irBrasil',      icon: 'fa-file-invoice',        label: { pt: 'IR Brasil',        en: 'IR Brazil'       } },
          { key: 'taxPlanning',   icon: 'fa-chess',               label: { pt: 'Tax planning',     en: 'Tax Planning'    } },
        ],
      },
      {
        key: 'rotinasControles', icon: 'fa-rotate', label: { pt: 'Rotinas & Controles', en: 'Routines & Controls' },
        children: [
          { key: 'checkBox', icon: 'fa-square-check', label: { pt: 'Check-the-box', en: 'Check-the-box' } },
        ],
      },
    ],
  },

  // ── FERRAMENTAS ───────────────────────────────────────────
  {
    key: 'sec-tools', type: 'section', label: { pt: 'Ferramentas', en: 'Tools' },
    children: [
      { key: 'backup',   icon: 'fa-database',      label: { pt: 'Backup',    en: 'Backup'    } },
      { key: 'auditLog', icon: 'fa-shield-halved',  label: { pt: 'Auditoria', en: 'Audit Log' } },
    ],
  },
];

function NavItem({ item, page, setPage, onClose, lang, depth = 0 }) {
  const isActive = page === item.key || (item.children && item.children.some(c => c.key === page || (c.children && c.children.some(cc => cc.key === page))));
  const [open, setOpen] = React.useState(isActive);

  if (item.type === 'section') {
    return (
      <div>
        <div className="sidebar-section">{item.label[lang === 'en-US' ? 'en' : 'pt']}</div>
        {item.children.map(child => (
          <NavItem key={child.key} item={child} page={page} setPage={setPage} onClose={onClose} lang={lang} depth={0} />
        ))}
      </div>
    );
  }

  const hasChildren = item.children && item.children.length > 0;
  const isLeafActive = page === item.key;

  if (hasChildren) {
    return (
      <div>
        <button
          className={`nav-item nav-item-parent ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: 14 + depth * 12 }}
          onClick={() => setOpen(v => !v)}
        >
          <i className={`fas ${item.icon}`} style={{ fontSize: 13, width: 16, textAlign: 'center', flexShrink: 0 }}/>
          <span style={{ flex: 1, textAlign: 'left' }}>{item.label[lang === 'en-US' ? 'en' : 'pt']}</span>
          <i className={`fas fa-chevron-${open ? 'down' : 'right'}`} style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}/>
        </button>
        {open && (
          <div className="nav-submenu">
            {item.children.map(child => (
              <NavItem key={child.key} item={child} page={page} setPage={setPage} onClose={onClose} lang={lang} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`nav-item nav-item-leaf ${isLeafActive ? 'active' : ''}`}
      style={{ paddingLeft: 14 + depth * 14 }}
      onClick={() => { setPage(item.key); onClose(); }}
    >
      <i className={`fas ${item.icon}`} style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}/>
      <span>{item.label[lang === 'en-US' ? 'en' : 'pt']}</span>
    </button>
  );
}

function Sidebar({ page, setPage, open, onClose, lang }) {
  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose}/>}
      <nav className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <span>Hub<span style={{color:'var(--brand)'}}>.</span><br/><small>Eduardo Vanzak</small></span>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'8px 0'}}>
          {NAV_STRUCTURE.map(item => (
            <NavItem key={item.key} item={item} page={page} setPage={setPage} onClose={onClose} lang={lang} />
          ))}
        </div>
      </nav>
    </>
  );
}

// ── Topbar ───────────────────────────────────────────────────
function Topbar({ title, lang, setLang, currency, setCurrency, t, onMenuOpen }) {
  const { theme, toggle } = useTheme();
  const now = new Date();
  const tzBR = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const tzUS = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit' });
  const isDark = theme === 'dark';
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenuOpen} title="Menu" aria-label="Abrir menu">
        <i className="fas fa-bars" style={{fontSize:15}}/>
      </button>
      <span className="topbar-title">{title}</span>
      <span className="topbar-tz" style={{fontSize:11,color:'var(--text-muted)',display:'flex',gap:10,alignItems:'center'}}>
        <span><i className="fas fa-circle" style={{color:'var(--green)',fontSize:6,marginRight:4}}/>BR {tzBR}</span>
        <span><i className="fas fa-circle" style={{color:'var(--blue)',fontSize:6,marginRight:4}}/>US {tzUS}</span>
      </span>
      <button className={`topbar-pill ${currency==='BRL'?'active':''}`} onClick={()=>setCurrency('BRL')}>BRL</button>
      <button className={`topbar-pill ${currency==='USD'?'active':''}`} onClick={()=>setCurrency('USD')}>USD</button>
      <button className={`topbar-pill ${lang==='pt-BR'?'active':''}`} onClick={()=>setLang('pt-BR')}>PT</button>
      <button className={`topbar-pill ${lang==='en-US'?'active':''}`} onClick={()=>setLang('en-US')}>EN</button>
      {/* Theme toggle */}
      <button className="theme-toggle" onClick={toggle} title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'} aria-label="Alternar tema">
        <span className="theme-toggle-thumb">
          <i className={`fas ${isDark ? 'fa-moon' : 'fa-sun'}`}/>
        </span>
        {isDark ? 'Escuro' : 'Claro'}
      </button>
    </header>
  );
}

// ── Main App Shell ───────────────────────────────────────────
// (modules loaded below this file in the same script execution)

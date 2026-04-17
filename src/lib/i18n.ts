import { createContext, useContext } from "react";

export type Lang = "pt-BR" | "en-US";
export type Currency = "BRL" | "USD";

// Minimal subset ported from src/core/i18n.js — extend as more pages are migrated.
export const TRANSLATIONS = {
  "pt-BR": {
    appName: "Hub Empresarial",
    login: "Entrar",
    signup: "Criar conta",
    logout: "Sair",
    email: "E-mail",
    password: "Senha",
    confirmPassword: "Confirmar senha",
    passwordMismatch: "As senhas não coincidem",
    passwordTooShort: "Mínimo 6 caracteres",
    haveAccount: "Já tem conta? Entrar",
    noAccount: "Não tem conta? Criar uma",
    loading: "Carregando...",
    welcome: "Bem-vindo",
    openMenu: "Abrir menu",
    lightTheme: "Claro",
    darkTheme: "Escuro",

    // Nav
    dashboard: "Dashboard",
    tasks: "Tasks & Deadlines",
    companies: "Empresas",
    orgchart: "Organograma",
    valuations: "Valuations",
    personal: "Pessoal",
    personalDocs: "Documentos pessoais",
    insurance: "Seguros",
    lifeInsurance: "Seguro de vida",
    carInsurance: "Seguro do carro",
    aptInsurance: "Seguro do apartamento",
    employees: "Funcionários",
    investments: "Investimentos",
    realEstate: "Imóveis",
    legal: "Jurídico",
    acordoGaveta: "Acordo de gaveta",
    trademarks: "Registro de Marca",
    fiscalTax: "Tax Return – IRS",
    taxPlanning: "Tax Planning",
    checkBox: "Check-the-box",
    fixedExpenses: "Despesas Fixas",
    backup: "Backup",
    auditLog: "Auditoria",
    sectionCompanies: "Empresas",
    sectionPersonal: "Pessoal",
    sectionTools: "Ferramentas",

    // Dashboard
    dashboardSub: "Visão consolidada de todas as empresas",
    activeEntities: "Entidades Ativas",
    totalInPortfolio: "total no portfólio",
    docsWithAlert: "Docs com Alerta",
    openTasks: "Tasks Abertas",
    fiscalObligations: "Obrigações Fiscais",
    timelineTitle: "Timeline de Deadlines — próximos 90 dias",
  },
  "en-US": {
    appName: "Business Hub",
    login: "Sign in",
    signup: "Create account",
    logout: "Sign out",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordMismatch: "Passwords don't match",
    passwordTooShort: "Minimum 6 characters",
    haveAccount: "Have an account? Sign in",
    noAccount: "No account? Create one",
    loading: "Loading...",
    welcome: "Welcome",
    openMenu: "Open menu",
    lightTheme: "Light",
    darkTheme: "Dark",

    dashboard: "Dashboard",
    tasks: "Tasks & Deadlines",
    companies: "Companies",
    orgchart: "Org Chart",
    valuations: "Valuations",
    personal: "Personal",
    personalDocs: "Personal Documents",
    insurance: "Insurance",
    lifeInsurance: "Life Insurance",
    carInsurance: "Car Insurance",
    aptInsurance: "Apt Insurance",
    employees: "Personal Employees",
    investments: "Investments",
    realEstate: "Real Estate",
    legal: "Legal",
    acordoGaveta: "Side Agreement",
    trademarks: "Trademark Registration",
    fiscalTax: "Tax Return – IRS",
    taxPlanning: "Tax Planning",
    checkBox: "Check-the-box",
    fixedExpenses: "Fixed Expenses",
    backup: "Backup",
    auditLog: "Audit Log",
    sectionCompanies: "Companies",
    sectionPersonal: "Personal",
    sectionTools: "Tools",

    dashboardSub: "Consolidated view across all companies",
    activeEntities: "Active Entities",
    totalInPortfolio: "in portfolio",
    docsWithAlert: "Docs with Alerts",
    openTasks: "Open Tasks",
    fiscalObligations: "Fiscal Obligations",
    timelineTitle: "Deadline Timeline — next 90 days",
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)["pt-BR"];

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  t: (typeof TRANSLATIONS)["pt-BR"];
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within <I18nProvider>");
  return ctx;
}

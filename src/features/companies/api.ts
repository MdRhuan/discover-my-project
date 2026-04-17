import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type CompanyInsert = Database["public"]["Tables"]["companies"]["Insert"];
export type CompanyUpdate = Database["public"]["Tables"]["companies"]["Update"];

export type Partner = { nome: string; participacao: number };

export const COUNTRY_OPTIONS = [
  { value: "BR", label: "Brasil" },
  { value: "US", label: "EUA" },
] as const;

export const STATUS_OPTIONS = [
  { value: "ativa", label: "Ativa" },
  { value: "em-construcao", label: "Em Desenvolvimento" },
  { value: "encerrada", label: "Encerrada" },
  { value: "holding", label: "Holding" },
  { value: "parada", label: "Parada" },
] as const;

export async function listCompanies(includeArchived = false) {
  const query = supabase.from("companies").select("*").order("nome", { ascending: true });
  const { data, error } = includeArchived ? await query : await query.eq("arquivada", false);
  if (error) throw error;
  return data ?? [];
}

export async function createCompany(input: Omit<CompanyInsert, "user_id">) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("companies")
    .insert({ ...input, user_id: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompany(id: string, input: CompanyUpdate) {
  const { data, error } = await supabase
    .from("companies")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleArchiveCompany(id: string, arquivada: boolean) {
  return updateCompany(id, { arquivada });
}

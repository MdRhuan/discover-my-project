import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Employee = Database["public"]["Tables"]["funcionarios"]["Row"];
export type EmployeeInsert = Database["public"]["Tables"]["funcionarios"]["Insert"];
export type EmployeeUpdate = Database["public"]["Tables"]["funcionarios"]["Update"];

export async function listEmployees(includeArchived = false) {
  const query = supabase
    .from("funcionarios")
    .select("*")
    .order("nome", { ascending: true });
  const { data, error } = includeArchived ? await query : await query.eq("arquivado", false);
  if (error) throw error;
  return data ?? [];
}

export async function createEmployee(input: Omit<EmployeeInsert, "user_id">) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("funcionarios")
    .insert({ ...input, user_id: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(id: string, input: EmployeeUpdate) {
  const { data, error } = await supabase
    .from("funcionarios")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id: string) {
  const { error } = await supabase.from("funcionarios").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleArchiveEmployee(id: string, arquivado: boolean) {
  return updateEmployee(id, { arquivado });
}

export function formatSalary(amount: number | null, currency: string) {
  if (amount == null) return "—";
  const locale = currency === "USD" ? "en-US" : "pt-BR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
  }).format(amount);
}

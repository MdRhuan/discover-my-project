import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export const TASK_TYPES = ["Fiscal", "Contábil", "Documental", "Jurídico", "Imigração", "Outro"] as const;
export const TASK_PRIORITIES = ["alta", "media", "baixa"] as const;
export const TASK_STATUSES = ["pendente", "em-andamento", "concluida", "bloqueada"] as const;

export async function listTasks(includeArchived = false) {
  let query = supabase.from("tasks").select("*").order("vencimento", { ascending: true, nullsFirst: false });
  if (!includeArchived) query = query.eq("arquivada", false);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTask(input: Omit<TaskInsert, "user_id">) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, input: TaskUpdate) {
  const { data, error } = await supabase.from("tasks").update(input).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function archiveTask(id: string) {
  return updateTask(id, { arquivada: true });
}

export async function unarchiveTask(id: string) {
  return updateTask(id, { arquivada: false });
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function cycleTaskStatus(task: Task) {
  const order: Task["status"][] = ["pendente", "em-andamento", "concluida"];
  const idx = order.indexOf(task.status);
  const next = order[(idx + 1) % order.length];
  return updateTask(task.id, { status: next });
}

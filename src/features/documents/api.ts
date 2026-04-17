import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Document = Database["public"]["Tables"]["documentos"]["Row"];
export type DocumentInsert = Database["public"]["Tables"]["documentos"]["Insert"];
export type DocumentUpdate = Database["public"]["Tables"]["documentos"]["Update"];

export const DOC_CATEGORIES = [
  "Constituição",
  "Legal",
  "Financeiro",
  "Tax",
  "Licenças",
  "Contratos",
  "RH",
  "Outros",
] as const;

export const DOC_STATUSES = [
  "Atual",
  "Pendente Upload",
  "Desatualizado",
  "Substituído",
  "Arquivado",
] as const;

export const FISCAL_YEARS = [
  "2020",
  "2021",
  "2022",
  "2023",
  "2024",
  "2025",
  "2026",
] as const;

const BUCKET = "documents";

export async function listDocuments(includeArchived = false) {
  const query = supabase
    .from("documentos")
    .select("*")
    .order("data_upload", { ascending: false });
  const { data, error } = includeArchived
    ? await query.eq("status_doc", "Arquivado")
    : await query.neq("status_doc", "Arquivado");
  if (error) throw error;
  return data ?? [];
}

export async function uploadFile(file: File): Promise<{
  path: string;
  size: number;
  type: string;
  mime: string;
}> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const ext = file.name.split(".").pop()?.toUpperCase() ?? "";
  const path = `${auth.user.id}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return { path, size: file.size, type: ext, mime: file.type };
}

export async function downloadFile(path: string, filename: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function removeFileSilent(path: string | null) {
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

export async function createDocument(input: Omit<DocumentInsert, "user_id">) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("documentos")
    .insert({ ...input, user_id: auth.user.id })
    .select()
    .single();
  if (error) {
    await removeFileSilent(input.file_path ?? null);
    throw error;
  }
  return data;
}

export async function updateDocument(id: string, input: DocumentUpdate) {
  const { data, error } = await supabase
    .from("documentos")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDocument(doc: Document) {
  await removeFileSilent(doc.file_path);
  const { error } = await supabase.from("documentos").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function setDocumentStatus(id: string, status: string) {
  return updateDocument(id, { status_doc: status });
}

export function formatBytes(bytes: number | null) {
  if (!bytes) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

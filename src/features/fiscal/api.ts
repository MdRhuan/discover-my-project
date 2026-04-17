import { supabase } from "@/integrations/supabase/client";

export async function getFiscalDocs(subcategorias?: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  let q = supabase.from("fiscal_docs").select("*").eq("user_id", user.id);
  if (subcategorias?.length) q = q.in("subcategoria", subcategorias);
  const { data } = await q.order("created_at", { ascending: false });
  return data ?? [];
}

export async function upsertFiscalDoc(doc: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (doc.id) {
    const { error } = await supabase.from("fiscal_docs").update(doc).eq("id", doc.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("fiscal_docs").insert({ ...doc, user_id: user.id });
    if (error) throw error;
  }
}

export async function deleteFiscalDoc(id: string) {
  const { error } = await supabase.from("fiscal_docs").delete().eq("id", id);
  if (error) throw error;
}

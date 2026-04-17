import { supabase } from "@/integrations/supabase/client";

export async function getTransacoes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("transacoes").select("*").eq("user_id", user.id).order("data", { ascending: false });
  return data ?? [];
}

export async function upsertTransacao(tx: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (tx.id) {
    const { error } = await supabase.from("transacoes").update(tx).eq("id", tx.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("transacoes").insert({ ...tx, user_id: user.id });
    if (error) throw error;
  }
}

export async function deleteTransacao(id: string) {
  const { error } = await supabase.from("transacoes").delete().eq("id", id);
  if (error) throw error;
}

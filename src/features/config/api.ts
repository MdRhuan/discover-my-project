import { supabase } from "@/integrations/supabase/client";

export async function getConfig<T = any>(chave: string): Promise<T | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("user_config")
    .select("value")
    .eq("user_id", user.id)
    .eq("chave", chave)
    .maybeSingle();
  return (data?.value as T) ?? null;
}

export async function setConfig(chave: string, value: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("user_config")
    .upsert(
      { user_id: user.id, chave, value },
      { onConflict: "user_id,chave" }
    );
  if (error) throw error;
}

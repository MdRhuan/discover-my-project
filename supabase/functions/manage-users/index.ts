import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
  Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return json({ error: "Missing auth" }, 401);
    }

    // Cliente para validar JWT do chamador
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    // Verifica se é admin
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return json({ error: "Forbidden: admin only" }, 403);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body.action ?? "list";

    if (action === "list") {
      const { data: usersData, error: usersErr } =
        await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (usersErr) return json({ error: usersErr.message }, 500);

      const ids = usersData.users.map((u) => u.id);
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids);

      const rolesByUser = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const arr = rolesByUser.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesByUser.set(r.user_id, arr);
      }

      const users = usersData.users.map((u) => {
        const userRoles = rolesByUser.get(u.id) ?? [];
        const role = userRoles.includes("admin")
          ? "admin"
          : userRoles.includes("user")
          ? "user"
          : null;
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          role,
        };
      });

      return json({ users });
    }

    if (action === "set_role") {
      const { user_id, role } = body;
      if (!user_id || !["admin", "user"].includes(role)) {
        return json({ error: "Invalid params" }, 400);
      }
      // Não permitir admin remover o próprio acesso de admin (segurança)
      if (user_id === callerId && role !== "admin") {
        return json(
          { error: "Você não pode remover seu próprio acesso de admin" },
          400,
        );
      }

      // Remove papéis antigos e insere o novo (mantém só um papel ativo)
      await admin.from("user_roles").delete().eq("user_id", user_id);
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id, role });
      if (insErr) return json({ error: insErr.message }, 500);

      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

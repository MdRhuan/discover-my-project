import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle } from "lucide-react";

export default function Backup() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);

  async function exportJSON() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [companies, funcionarios, documentos, tasks] = await Promise.all([
      supabase.from("companies").select("*").eq("user_id", user.id).then(r => r.data ?? []),
      supabase.from("funcionarios").select("*").eq("user_id", user.id).then(r => r.data ?? []),
      supabase.from("documentos").select("*").eq("user_id", user.id).then(r => r.data ?? []),
      supabase.from("tasks").select("*").eq("user_id", user.id).then(r => r.data ?? []),
    ]);
    const payload = { exportedAt: new Date().toISOString(), version: 2, companies, funcionarios, documentos, tasks };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Backup exportado com sucesso!");
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      toast.info(`Backup contém ${data.companies?.length ?? 0} empresas, ${data.funcionarios?.length ?? 0} funcionários, ${data.documentos?.length ?? 0} documentos, ${data.tasks?.length ?? 0} tarefas.`);
      toast.success("Dados lidos do backup. Importação automática disponível em breve.");
    } catch {
      toast.error("Erro ao ler arquivo de backup.");
    }
    setImporting(false);
  }

  return (
    <AppLayout title={t.backup}>
      <div className="mb-6"><h1 className="text-xl font-bold">{t.backup}</h1><p className="text-sm text-muted-foreground">Exportação e importação de dados</p></div>
      <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
        <Card><CardContent className="p-8 text-center">
          <Download className="h-10 w-10 mx-auto mb-4 text-primary" />
          <h3 className="font-semibold mb-2">Exportar JSON</h3>
          <p className="text-sm text-muted-foreground mb-4">Exporta todos os dados em um arquivo JSON.</p>
          <Button className="w-full" onClick={exportJSON}><Download className="h-4 w-4 mr-2" />Exportar Backup</Button>
        </CardContent></Card>
        <Card><CardContent className="p-8 text-center">
          <Upload className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
          <h3 className="font-semibold mb-2">Importar JSON</h3>
          <p className="text-sm text-muted-foreground mb-4">Restaura dados a partir de um backup.</p>
          <Button variant="outline" className="w-full" onClick={() => document.getElementById("backup-input")?.click()} disabled={importing}>
            <Upload className="h-4 w-4 mr-2" />{importing ? "Importando..." : "Importar Backup"}
          </Button>
          <input id="backup-input" type="file" accept=".json" className="hidden" onChange={importJSON} />
        </CardContent></Card>
      </div>
      <Alert className="mt-6 max-w-2xl"><AlertTriangle className="h-4 w-4" /><AlertDescription>Os dados agora são armazenados no servidor. Backups são recomendados para manter uma cópia local.</AlertDescription></Alert>
    </AppLayout>
  );
}

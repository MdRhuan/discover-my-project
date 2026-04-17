import { AppLayout } from "@/components/layout/AppLayout";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function AuditLog() {
  const { t } = useTranslation();

  return (
    <AppLayout title={t.auditLog}>
      <div className="mb-6"><h1 className="text-xl font-bold">{t.auditLog}</h1><p className="text-sm text-muted-foreground">Registro de auditoria do sistema</p></div>
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>O log de auditoria será implementado com rastreamento automático de ações. Por enquanto, todas as operações são registradas no servidor.</p>
      </CardContent></Card>
    </AppLayout>
  );
}

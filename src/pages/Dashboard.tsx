import { useEffect } from "react";
import { Building2, FileWarning, ListChecks, Receipt } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/lib/i18n";

export default function Dashboard() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t.dashboard} — ${t.appName}`;
  }, [t]);

  const stats = [
    { label: t.activeEntities, value: "—", icon: Building2, hint: t.totalInPortfolio },
    { label: t.docsWithAlert, value: "—", icon: FileWarning, hint: "" },
    { label: t.openTasks, value: "—", icon: ListChecks, hint: "" },
    { label: t.fiscalObligations, value: "—", icon: Receipt, hint: "" },
  ];

  return (
    <AppLayout title={t.dashboard}>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold tracking-tight">{t.dashboard}</h2>
          <p className="text-sm text-muted-foreground">{t.dashboardSub}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, hint }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{value}</div>
                {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{t.timelineTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export function Topbar({ title }: { title?: string }) {
  const { lang, setLang, currency, setCurrency, t } = useTranslation();

  return (
    <header className="h-14 flex items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <h1 className="text-base font-semibold flex-1 truncate">{title ?? t.appName}</h1>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={currency === "BRL" ? "default" : "ghost"}
          onClick={() => setCurrency("BRL")}
        >
          BRL
        </Button>
        <Button
          size="sm"
          variant={currency === "USD" ? "default" : "ghost"}
          onClick={() => setCurrency("USD")}
        >
          USD
        </Button>
        <span className="mx-1 h-4 w-px bg-border" />
        <Button
          size="sm"
          variant={lang === "pt-BR" ? "default" : "ghost"}
          onClick={() => setLang("pt-BR")}
        >
          PT
        </Button>
        <Button
          size="sm"
          variant={lang === "en-US" ? "default" : "ghost"}
          onClick={() => setLang("en-US")}
        >
          EN
        </Button>
      </div>
    </header>
  );
}

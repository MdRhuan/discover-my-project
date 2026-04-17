import {
  Gauge,
  ListChecks,
  Building2,
  Network,
  TrendingUp,
  IdCard,
  HeartPulse,
  ShieldCheck,
  Car,
  Home,
  Users,
  Coins,
  PieChart,
  Scale,
  Handshake,
  BadgeCheck,
  Receipt,
  Castle,
  CheckSquare,
  FileText,
  Database,
  ShieldAlert,
  LogOut,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const location = useLocation();

  const top: Item[] = [
    { title: t.dashboard, url: "/dashboard", icon: Gauge },
    { title: t.tasks, url: "/tasks", icon: ListChecks },
    { title: t.documents, url: "/documents", icon: FileText },
  ];

  const companies: Item[] = [
    { title: t.companies, url: "/companies", icon: Building2 },
    { title: t.orgchart, url: "/orgchart", icon: Network },
    { title: t.valuations, url: "/valuations", icon: TrendingUp },
  ];

  const personal: Item[] = [
    { title: t.personalDocs, url: "/personal/docs", icon: IdCard },
    { title: t.lifeInsurance, url: "/personal/life", icon: HeartPulse },
    { title: t.carInsurance, url: "/personal/car", icon: Car },
    { title: t.aptInsurance, url: "/personal/apt", icon: ShieldCheck },
    { title: t.employees, url: "/personal/employees", icon: Users },
    { title: t.investments, url: "/personal/investments", icon: PieChart },
    { title: t.realEstate, url: "/personal/realestate", icon: Home },
    { title: t.legal, url: "/legal/juridico", icon: Scale },
    { title: t.acordoGaveta, url: "/legal/acordo", icon: Handshake },
    { title: t.trademarks, url: "/legal/trademarks", icon: BadgeCheck },
    { title: t.fiscalTax, url: "/fiscal/tax", icon: Receipt },
    { title: t.taxPlanning, url: "/fiscal/planning", icon: Castle },
    { title: t.checkBox, url: "/fiscal/checkbox", icon: CheckSquare },
    { title: t.fixedExpenses, url: "/finance/fixed", icon: FileText },
  ];

  const tools: Item[] = [
    { title: t.backup, url: "/tools/backup", icon: Database },
    { title: t.auditLog, url: "/tools/audit", icon: ShieldAlert },
  ];

  const isActive = (url: string) => location.pathname === url;

  const renderItems = (items: Item[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink to={item.url} end>
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-4">
        {!collapsed ? (
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">
              Hub<span className="text-primary">.</span>
            </span>
            <span className="text-xs text-muted-foreground">Eduardo Vanzak</span>
          </div>
        ) : (
          <span className="text-lg font-semibold text-primary">H.</span>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(top)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionCompanies}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(companies)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionPersonal}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(personal)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t.sectionTools}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(tools)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>{t.logout}</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/providers/I18nProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import AuthPage from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Employees from "./pages/Employees";
import Documents from "./pages/Documents";
import Tasks from "./pages/Tasks";
import OrgChart from "./pages/OrgChart";
import PersonalDocs from "./pages/PersonalDocs";
import LifeInsurance from "./pages/LifeInsurance";
import CarInsurance from "./pages/CarInsurance";
import AptInsurance from "./pages/AptInsurance";
import Investments from "./pages/Investments";
import RealEstate from "./pages/RealEstate";
import Valuations from "./pages/Valuations";
import FiscalTax from "./pages/FiscalTax";
import TaxPlanning from "./pages/TaxPlanning";
import CheckBox from "./pages/CheckBox";
import Juridico from "./pages/Juridico";
import AcordoGaveta from "./pages/AcordoGaveta";
import Trademarks from "./pages/Trademarks";
import FixedExpenses from "./pages/FixedExpenses";
import Billing from "./pages/Billing";
import Backup from "./pages/Backup";
import AuditLog from "./pages/AuditLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const protectedRoutes: Array<[string, React.ComponentType]> = [
  ["/dashboard", Dashboard],
  ["/companies", Companies],
  ["/personal/employees", Employees],
  ["/documents", Documents],
  ["/tasks", Tasks],
  ["/orgchart", OrgChart],
  ["/personal/docs", PersonalDocs],
  ["/personal/life", LifeInsurance],
  ["/personal/car", CarInsurance],
  ["/personal/apt", AptInsurance],
  ["/personal/investments", Investments],
  ["/personal/realestate", RealEstate],
  ["/valuations", Valuations],
  ["/fiscal/tax", FiscalTax],
  ["/fiscal/planning", TaxPlanning],
  ["/fiscal/checkbox", CheckBox],
  ["/legal/juridico", Juridico],
  ["/legal/acordo", AcordoGaveta],
  ["/legal/trademarks", Trademarks],
  ["/finance/fixed", FixedExpenses],
  ["/billing", Billing],
  ["/tools/backup", Backup],
  ["/tools/audit", AuditLog],
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            {protectedRoutes.map(([path, Component]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Component />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;

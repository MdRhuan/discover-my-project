import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, Crown } from "lucide-react";
import { listCompanies, type Company, type Partner } from "@/features/companies/api";
import { useTranslation } from "@/lib/i18n";

const NODE_W = 200;
const NODE_H = 80;
const LEVEL_GAP_Y = 130;
const SIBLING_GAP_X = 32;

type OrgNode = {
  id: string;
  label: string;
  sublabel?: string;
  type: "company" | "partner";
  participacao?: number;
  children: OrgNode[];
};

function buildTree(company: Company): OrgNode {
  const socios = (Array.isArray(company.socios) ? company.socios : []) as unknown as Partner[];
  return {
    id: `company-${company.id}`,
    label: company.nome,
    sublabel: company.tipo_juridico ?? company.setor ?? company.pais,
    type: "company",
    children: socios
      .filter((s) => s && s.nome)
      .map((s, i) => ({
        id: `partner-${company.id}-${i}`,
        label: s.nome,
        sublabel: "Sócio",
        type: "partner" as const,
        participacao: Number(s.participacao) || 0,
        children: [],
      })),
  };
}

function subtreeWidth(node: OrgNode): number {
  if (!node.children.length) return NODE_W;
  const total =
    node.children.reduce((s, c) => s + subtreeWidth(c), 0) +
    SIBLING_GAP_X * (node.children.length - 1);
  return Math.max(NODE_W, total);
}

function layoutTree(
  node: OrgNode,
  left: number,
  depth: number,
  positions: Record<string, { x: number; y: number }>,
) {
  const sw = subtreeWidth(node);
  const cx = left + sw / 2;
  positions[node.id] = { x: cx - NODE_W / 2, y: depth * LEVEL_GAP_Y + 20 };
  let childLeft = left;
  for (const child of node.children) {
    layoutTree(child, childLeft, depth + 1, positions);
    childLeft += subtreeWidth(child) + SIBLING_GAP_X;
  }
}

function edgePath(px: number, py: number, cx: number, cy: number) {
  const my = (py + cy) / 2;
  return `M${px},${py} C${px},${my} ${cx},${my} ${cx},${cy}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function OrgTree({ root }: { root: OrgNode }) {
  const positions = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    layoutTree(root, 0, 0, pos);
    return pos;
  }, [root]);

  const allNodes: OrgNode[] = useMemo(() => {
    const out: OrgNode[] = [];
    const walk = (n: OrgNode) => {
      out.push(n);
      n.children.forEach(walk);
    };
    walk(root);
    return out;
  }, [root]);

  const width = subtreeWidth(root) + 40;
  const height = (Math.max(...Object.values(positions).map((p) => p.y)) || 0) + NODE_H + 40;

  const edges: { from: string; to: string }[] = [];
  const collect = (n: OrgNode) => {
    n.children.forEach((c) => {
      edges.push({ from: n.id, to: c.id });
      collect(c);
    });
  };
  collect(root);

  return (
    <div className="overflow-auto rounded-lg border bg-card p-4">
      <div className="relative" style={{ width, height, minWidth: "100%" }}>
        <svg
          className="pointer-events-none absolute inset-0"
          width={width}
          height={height}
          style={{ overflow: "visible" }}
        >
          {edges.map((e, i) => {
            const from = positions[e.from];
            const to = positions[e.to];
            if (!from || !to) return null;
            const px = from.x + NODE_W / 2;
            const py = from.y + NODE_H;
            const cx = to.x + NODE_W / 2;
            const cy = to.y;
            return (
              <path
                key={i}
                d={edgePath(px, py, cx, cy)}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth={2}
              />
            );
          })}
        </svg>

        {allNodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isCompany = node.type === "company";
          return (
            <div
              key={node.id}
              className={`absolute flex items-center gap-3 rounded-xl border-2 p-3 shadow-md transition-shadow hover:shadow-lg ${
                isCompany
                  ? "border-primary bg-primary/10"
                  : "border-accent bg-accent/10"
              }`}
              style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
            >
              <div
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 ${
                  isCompany ? "border-primary bg-primary/20" : "border-accent bg-accent/20"
                }`}
              >
                {isCompany ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <span className="text-sm font-bold">{initials(node.label)}</span>
                )}
                {isCompany && (
                  <div className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500">
                    <Crown className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{node.label}</div>
                <div className="truncate text-xs text-muted-foreground">{node.sublabel}</div>
                {node.type === "partner" && node.participacao !== undefined && (
                  <Badge variant="secondary" className="mt-1 h-4 px-1.5 text-[10px]">
                    {node.participacao}%
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrgChart() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>("all");

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listCompanies(false),
  });

  const visibleCompanies = useMemo(() => {
    if (selectedId === "all") return companies;
    return companies.filter((c) => c.id === selectedId);
  }, [companies, selectedId]);

  return (
    <AppLayout title={t.orgchart}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.orgchart}</h1>
            <p className="text-sm text-muted-foreground">
              Hierarquia visual de empresas e participações dos sócios
            </p>
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-[260px]">
              <SelectValue placeholder="Filtrar empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : visibleCompanies.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Nenhuma empresa encontrada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cadastre empresas em <strong>/companies</strong> para visualizar a estrutura
                societária.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {visibleCompanies.map((company) => {
              const tree = buildTree(company);
              const partnerCount = tree.children.length;
              return (
                <Card key={company.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        {company.nome}
                      </CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {company.tipo_juridico ?? "—"} · {company.pais}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {partnerCount} {partnerCount === 1 ? "sócio" : "sócios"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    {partnerCount === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum sócio cadastrado para esta empresa.
                      </p>
                    ) : (
                      <OrgTree root={tree} />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

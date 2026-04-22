"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { db } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";

// ── Types ──────────────────────────────────────────────────────────────────

interface Feira {
  id: string;
  nome: string;
  cor: string;
}

interface Tag {
  id: string;
  nome: string;
  cor: string;
}

interface Nota {
  id: string;
  titulo: string;
  descricao: string;
  feiraId: string;
  tagIds: string[];
  criadaEm: string;
}

interface FairnotesData {
  notas: Nota[];
  feiras: Feira[];
  tags: Tag[];
}

// ── Constants ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "fairnotes-data";

const FAIR_COLORS = [
  "#EC4899",
  "#A855F7",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#EF4444",
  "#06B6D4",
  "#F97316",
  "#8B5CF6",
  "#D946EF",
];

const TAG_COLORS: Record<string, string> = {
  Tendência: "#F59E0B",
  Lançamento: "#10B981",
  Skincare: "#3B82F6",
  Maquiagem: "#EC4899",
  Cabelo: "#A855F7",
  "Vegano/Natural": "#22C55E",
  Fornecedor: "#F97316",
  Concorrente: "#EF4444",
  Embalagem: "#06B6D4",
  Fragrância: "#D946EF",
};

const DEFAULT_FEIRAS: Feira[] = [
  { id: "f1", nome: "Beauty Fair 2026", cor: "#EC4899" },
  { id: "f2", nome: "Cosmoprof Latin America", cor: "#A855F7" },
  { id: "f3", nome: "Hair Brasil 2026", cor: "#F59E0B" },
];

const DEFAULT_TAGS: Tag[] = Object.entries(TAG_COLORS).map(([nome, cor], i) => ({
  id: "t" + (i + 1),
  nome,
  cor,
}));

const DEFAULT_NOTAS: Nota[] = [
  {
    id: "n1",
    titulo: "Sérum vitamina C com niacinamida",
    descricao:
      "Fórmula estabilizada com 20% vit C + 5% niacinamida. Textura leve, absorção rápida. Marca: DermaPure. Embalagem airless premium.",
    feiraId: "f1",
    tagIds: ["t3", "t2", "t1"],
    criadaEm: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "n2",
    titulo: "Paleta de sombras com pigmentos minerais",
    descricao: "12 cores matte e shimmer. Vegana e cruelty-free. Empresa: ColorVibe. Preço atacado: R$28/un.",
    feiraId: "f1",
    tagIds: ["t4", "t6", "t2"],
    criadaEm: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "n3",
    titulo: "Embalagem refil para cremes",
    descricao: "Refil em alumínio reciclado, reduz 70% do plástico. Fornecedor: PackGreen Italia. Mín. 5.000 un.",
    feiraId: "f2",
    tagIds: ["t9", "t6", "t1"],
    criadaEm: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "n4",
    titulo: "Linha capilar com ácido hialurônico",
    descricao: "Shampoo + condicionador + máscara com HA de baixo peso molecular. Marca: HydraHair.",
    feiraId: "f3",
    tagIds: ["t5", "t2"],
    criadaEm: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "n5",
    titulo: "Perfumaria nicho com ingredientes brasileiros",
    descricao:
      "Fragrâncias com priprioca, breu branco e cumaru. Frascos artesanais. Marca francesa interessada em matéria-prima BR.",
    feiraId: "f2",
    tagIds: ["t10", "t1"],
    criadaEm: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const EMPTY_FORM: Omit<Nota, "id" | "criadaEm"> = {
  titulo: "",
  descricao: "",
  feiraId: "",
  tagIds: [],
};

// ── Helpers ───────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────

function ColorDot({ cor, size = 10 }: { cor: string; size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: cor,
        flexShrink: 0,
      }}
    />
  );
}

function TagChip({ nome, cor, small }: { nome: string; cor: string; small?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: small ? "2px 7px" : "3px 9px",
        borderRadius: 99,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        background: cor + "22",
        color: cor,
        border: `1px solid ${cor}44`,
        whiteSpace: "nowrap",
      }}
    >
      {nome}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

export function FairsEventsPage() {
  const { toast } = useApp();

  const [data, setData] = useState<FairnotesData>({ notas: [], feiras: [], tags: [] });
  const [loaded, setLoaded] = useState(false);

  // filters
  const [search, setSearch] = useState("");
  const [filterFeira, setFilterFeira] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "lista">("cards");

  // expanded card
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // modal: nova/editar nota
  const [modalNota, setModalNota] = useState(false);
  const [editingNota, setEditingNota] = useState<Nota | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  // modal: gerenciar feiras
  const [modalFeiras, setModalFeiras] = useState(false);
  const [novaFeira, setNovaFeira] = useState("");
  const [novaFeiraCor, setNovaFeiraCor] = useState(FAIR_COLORS[0]);
  const [fairColorIdx, setFairColorIdx] = useState(0);

  // modal: gerenciar tags
  const [modalTags, setModalTags] = useState(false);
  const [novaTag, setNovaTag] = useState("");

  const novaFeiraRef = useRef<HTMLInputElement>(null);
  const novaTagRef = useRef<HTMLInputElement>(null);

  // ── Persistence ──────────────────────────────────────────────────────────

  const save = useCallback(async (next: FairnotesData) => {
    setData(next);
    try {
      await db.config.put({ chave: STORAGE_KEY, value: next });
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    db.config.get(STORAGE_KEY).then((row) => {
      if (row?.value) {
        setData(row.value as FairnotesData);
      } else {
        const initial: FairnotesData = {
          notas: DEFAULT_NOTAS,
          feiras: DEFAULT_FEIRAS,
          tags: DEFAULT_TAGS,
        };
        setData(initial);
        db.config.put({ chave: STORAGE_KEY, value: initial }).catch(() => {
          /* silent */
        });
      }
      setLoaded(true);
    });
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────

  const { notas, feiras, tags } = data;

  const filtered = notas
    .filter((n) => {
      if (filterFeira && n.feiraId !== filterFeira) return false;
      if (filterTag && !n.tagIds.includes(filterTag)) return false;
      if (search) {
        const q = search.toLowerCase();
        return n.titulo.toLowerCase().includes(q) || n.descricao.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime());

  const feiraMap = Object.fromEntries(feiras.map((f) => [f.id, f]));
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

  const feiraCount = new Set(notas.map((n) => n.feiraId).filter(Boolean)).size;
  const hasFilter = !!search || !!filterFeira || !!filterTag;

  // ── Note CRUD ────────────────────────────────────────────────────────────

  function openNew() {
    setEditingNota(null);
    setForm({ ...EMPTY_FORM });
    setModalNota(true);
  }

  function openEdit(n: Nota) {
    setEditingNota(n);
    setForm({ titulo: n.titulo, descricao: n.descricao, feiraId: n.feiraId, tagIds: [...n.tagIds] });
    setModalNota(true);
    setExpandedId(null);
  }

  async function handleSaveNota() {
    if (!form.titulo.trim()) {
      toast("Título obrigatório", "error");
      return;
    }
    const next = { ...data };
    if (editingNota) {
      next.notas = next.notas.map((n) => (n.id === editingNota.id ? { ...editingNota, ...form } : n));
      toast("Anotação atualizada", "success");
    } else {
      next.notas = [{ id: uid(), criadaEm: new Date().toISOString(), ...form }, ...next.notas];
      toast("Anotação adicionada", "success");
    }
    await save(next);
    setModalNota(false);
  }

  async function handleDeleteNota(id: string) {
    const next = { ...data, notas: data.notas.filter((n) => n.id !== id) };
    await save(next);
    setExpandedId(null);
    toast("Anotação excluída", "success");
  }

  // ── Feira CRUD ───────────────────────────────────────────────────────────

  async function handleAddFeira() {
    if (!novaFeira.trim()) return;
    const next = { ...data, feiras: [...data.feiras, { id: uid(), nome: novaFeira.trim(), cor: novaFeiraCor }] };
    await save(next);
    setNovaFeira("");
    const nextIdx = (fairColorIdx + 1) % FAIR_COLORS.length;
    setFairColorIdx(nextIdx);
    setNovaFeiraCor(FAIR_COLORS[nextIdx]);
    novaFeiraRef.current?.focus();
  }

  async function handleRemoveFeira(id: string) {
    const next = {
      ...data,
      feiras: data.feiras.filter((f) => f.id !== id),
      notas: data.notas.map((n) => (n.feiraId === id ? { ...n, feiraId: "" } : n)),
    };
    if (filterFeira === id) setFilterFeira("");
    await save(next);
  }

  // ── Tag CRUD ─────────────────────────────────────────────────────────────

  async function handleAddTag() {
    const nome = novaTag.trim();
    if (!nome) return;
    if (data.tags.some((t) => t.nome.toLowerCase() === nome.toLowerCase())) {
      toast("Tag já existe", "error");
      return;
    }
    const cor = TAG_COLORS[nome] || "#BE4B83";
    const next = { ...data, tags: [...data.tags, { id: uid(), nome, cor }] };
    await save(next);
    setNovaTag("");
    novaTagRef.current?.focus();
  }

  async function handleRemoveTag(id: string) {
    const next = {
      ...data,
      tags: data.tags.filter((t) => t.id !== id),
      notas: data.notas.map((n) => ({ ...n, tagIds: n.tagIds.filter((tid) => tid !== id) })),
    };
    if (filterTag === id) setFilterTag("");
    await save(next);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div
        className="page-content"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}
      >
        <i
          className="fas fa-spinner"
          style={{ fontSize: 24, color: "#BE4B83", animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  return (
    <div className="page-content" style={{ background: "#FAFAF8", minHeight: "100vh" }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-header-info" style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span
              style={{
                background: "linear-gradient(135deg, #EC4899, #BE4B83)",
                borderRadius: 10,
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              ✧
            </span>
            <div className="page-header-title" style={{ fontSize: 22, fontWeight: 800, color: "#1A1714" }}>
              sdfsdfdsfsdfsdf
            </div>
          </div>
          <div className="page-header-sub" style={{ color: "#9C9690", marginLeft: 44 }}>
            Tendências, lançamentos &amp; insights de beleza
          </div>
        </div>
        <button
          className="btn"
          onClick={openNew}
          style={{
            background: "linear-gradient(135deg, #EC4899, #BE4B83)",
            color: "#fff",
            borderRadius: 12,
            padding: "9px 18px",
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 4px 14px rgba(190,75,131,0.35)",
            gap: 7,
          }}
        >
          <i className="fas fa-plus" />
          Nova Anotação
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8E4DD",
            borderRadius: 16,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          }}
        >
          <span
            style={{
              background: "rgba(190,75,131,0.10)",
              borderRadius: 12,
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            💄
          </span>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".7px",
                color: "#9C9690",
              }}
            >
              Total de Anotações
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1714", lineHeight: 1.1, marginTop: 2 }}>
              {notas.length}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E8E4DD",
            borderRadius: 16,
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 1px 4px rgba(0,0,0,.04)",
          }}
        >
          <span
            style={{
              background: "rgba(190,75,131,0.10)",
              borderRadius: 12,
              width: 42,
              height: 42,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            ✨
          </span>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".7px",
                color: "#9C9690",
              }}
            >
              Feiras Visitadas
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1714", lineHeight: 1.1, marginTop: 2 }}>
              {feiraCount}
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #E8E4DD",
          borderRadius: 16,
          padding: "16px 20px",
          marginBottom: 22,
          boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}
      >
        {/* Search + view toggle */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
          <div className="search-bar" style={{ flex: 1, maxWidth: 340 }}>
            <i className="fas fa-search" />
            <input
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produtos, tendências..."
              style={{ paddingLeft: 34 }}
            />
          </div>
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            {(["cards", "lista"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: viewMode === mode ? "#BE4B83" : "#E8E4DD",
                  background: viewMode === mode ? "rgba(190,75,131,0.08)" : "#F5F3EF",
                  color: viewMode === mode ? "#BE4B83" : "#9C9690",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                <i className={mode === "cards" ? "fas fa-th-large" : "fas fa-list"} />
              </button>
            ))}
          </div>
        </div>

        {/* Feira filter */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".7px",
              color: "#9C9690",
              marginBottom: 7,
            }}
          >
            Filtrar por Feira
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setFilterFeira("")}
              style={{
                padding: "4px 12px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: "1px solid",
                cursor: "pointer",
                borderColor: !filterFeira ? "#BE4B83" : "#E8E4DD",
                background: !filterFeira ? "rgba(190,75,131,0.10)" : "#F5F3EF",
                color: !filterFeira ? "#BE4B83" : "#6B6560",
              }}
            >
              Todas
            </button>
            {feiras.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterFeira(filterFeira === f.id ? "" : f.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  borderColor: filterFeira === f.id ? f.cor : "#E8E4DD",
                  background: filterFeira === f.id ? f.cor + "18" : "#F5F3EF",
                  color: filterFeira === f.id ? f.cor : "#6B6560",
                }}
              >
                <ColorDot cor={f.cor} />
                {f.nome}
              </button>
            ))}
            <button
              onClick={() => setModalFeiras(true)}
              style={{
                padding: "4px 12px",
                borderRadius: 99,
                fontSize: 12,
                fontWeight: 600,
                border: "1px dashed #E8E4DD",
                cursor: "pointer",
                background: "transparent",
                color: "#9C9690",
              }}
            >
              + Gerenciar
            </button>
          </div>
        </div>

        {/* Tag filter */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".7px",
              color: "#9C9690",
              marginBottom: 7,
            }}
          >
            Filtrar por Tag
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {tags.map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterTag(filterTag === t.id ? "" : t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 600,
                  border: "1px solid",
                  cursor: "pointer",
                  borderColor: filterTag === t.id ? t.cor : t.cor + "44",
                  background: filterTag === t.id ? t.cor + "22" : t.cor + "11",
                  color: filterTag === t.id ? t.cor : "#6B6560",
                }}
              >
                {t.nome}
              </button>
            ))}
            <button
              onClick={() => setModalTags(true)}
              style={{
                padding: "4px 10px",
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 600,
                border: "1px dashed #E8E4DD",
                cursor: "pointer",
                background: "transparent",
                color: "#9C9690",
              }}
            >
              + Gerenciar
            </button>
          </div>
        </div>

        {/* Clear filters */}
        {hasFilter && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F0EDE8" }}>
            <button
              onClick={() => {
                setSearch("");
                setFilterFeira("");
                setFilterTag("");
              }}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#BE4B83",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <i className="fas fa-times" style={{ marginRight: 5 }} />
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Notes List ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 260,
            gap: 12,
            color: "#9C9690",
          }}
        >
          <span style={{ fontSize: 40, opacity: 0.4 }}>💄</span>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma anotação encontrada</div>
          <div style={{ fontSize: 13, color: "#9C9690" }}>
            {hasFilter ? "Tente limpar os filtros ou " : "Clique em "}
            <strong>+ Nova Anotação</strong> para começar.
          </div>
        </div>
      ) : viewMode === "cards" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((nota) => {
            const feira = feiraMap[nota.feiraId];
            const isExpanded = expandedId === nota.id;
            return (
              <div
                key={nota.id}
                onClick={() => setExpandedId(isExpanded ? null : nota.id)}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E4DD",
                  borderLeft: `4px solid ${feira?.cor || "#E8E4DD"}`,
                  borderRadius: "0 16px 16px 0",
                  padding: "18px 18px 14px",
                  cursor: "pointer",
                  boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,.08)" : "0 1px 4px rgba(0,0,0,.04)",
                  transition: "box-shadow .2s, transform .15s",
                  transform: isExpanded ? "translateY(-2px)" : "none",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: "#1A1714", marginBottom: 6 }}>{nota.titulo}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#6B6560",
                    lineHeight: 1.55,
                    display: isExpanded ? "block" : "-webkit-box",
                    WebkitLineClamp: isExpanded ? undefined : 2,
                    WebkitBoxOrient: "vertical" as const,
                    overflow: isExpanded ? "visible" : "hidden",
                    marginBottom: 10,
                  }}
                >
                  {nota.descricao}
                </div>
                {nota.tagIds.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    {nota.tagIds.map((tid) => {
                      const t = tagMap[tid];
                      return t ? <TagChip key={tid} nome={t.nome} cor={t.cor} small /> : null;
                    })}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: "1px solid #F0EDE8",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9C9690" }}>
                    {feira && (
                      <>
                        <ColorDot cor={feira.cor} />
                        <span style={{ fontWeight: 500 }}>{feira.nome}</span>
                      </>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#9C9690" }}>{fmtDate(nota.criadaEm)}</span>
                </div>
                {isExpanded && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(nota)}>
                      <i className="fas fa-pen" /> Editar
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteNota(nota.id)}>
                      <i className="fas fa-trash" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((nota) => {
            const feira = feiraMap[nota.feiraId];
            return (
              <div
                key={nota.id}
                onClick={() => openEdit(nota)}
                style={{
                  background: "#fff",
                  border: "1px solid #E8E4DD",
                  borderLeft: `4px solid ${feira?.cor || "#E8E4DD"}`,
                  borderRadius: "0 12px 12px 0",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,.04)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#1A1714", marginBottom: 2 }}>{nota.titulo}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#6B6560",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nota.descricao}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                  {nota.tagIds.slice(0, 2).map((tid) => {
                    const t = tagMap[tid];
                    return t ? <TagChip key={tid} nome={t.nome} cor={t.cor} small /> : null;
                  })}
                </div>
                <span style={{ fontSize: 11, color: "#9C9690", flexShrink: 0 }}>{fmtDate(nota.criadaEm)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Nova/Editar Nota ── */}
      {modalNota && (
        <Modal
          title={editingNota ? "Editar Anotação" : "Nova Anotação"}
          onClose={() => setModalNota(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModalNota(false)}>
                Cancelar
              </button>
              <button
                className="btn"
                onClick={handleSaveNota}
                style={{ background: "linear-gradient(135deg, #EC4899, #BE4B83)", color: "#fff" }}
              >
                {editingNota ? "Salvar Alterações" : "Adicionar Anotação"}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Título</label>
            <input
              className="form-input"
              value={form.titulo}
              onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
              placeholder="Ex: Sérum vitamina C com niacinamida"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea
              className="form-textarea"
              value={form.descricao}
              onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
              placeholder="Detalhes do produto, fórmula, preço, contato do fornecedor..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Feira / Evento</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {feiras.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setForm((frm) => ({ ...frm, feiraId: frm.feiraId === f.id ? "" : f.id }))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 13px",
                    borderRadius: 99,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: form.feiraId === f.id ? f.cor : "#E8E4DD",
                    background: form.feiraId === f.id ? f.cor + "20" : "#F5F3EF",
                    color: form.feiraId === f.id ? f.cor : "#6B6560",
                  }}
                >
                  <ColorDot cor={f.cor} />
                  {f.nome}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {tags.map((t) => {
                const sel = form.tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() =>
                      setForm((frm) => ({
                        ...frm,
                        tagIds: sel ? frm.tagIds.filter((id) => id !== t.id) : [...frm.tagIds, t.id],
                      }))
                    }
                    style={{
                      padding: "4px 11px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 600,
                      border: "1px solid",
                      cursor: "pointer",
                      borderColor: sel ? t.cor : t.cor + "44",
                      background: sel ? t.cor + "22" : t.cor + "11",
                      color: sel ? t.cor : "#6B6560",
                    }}
                  >
                    {t.nome}
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Modal: Gerenciar Feiras ── */}
      {modalFeiras && (
        <Modal title="Gerenciar Feiras" onClose={() => setModalFeiras(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              ref={novaFeiraRef}
              className="form-input"
              value={novaFeira}
              onChange={(e) => setNovaFeira(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFeira()}
              placeholder="Nome da feira ou evento..."
              style={{ flex: 1 }}
            />
            <button
              onClick={() => {
                const nextIdx = (fairColorIdx + 1) % FAIR_COLORS.length;
                setFairColorIdx(nextIdx);
                setNovaFeiraCor(FAIR_COLORS[nextIdx]);
              }}
              title="Mudar cor"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "2px solid #E8E4DD",
                background: novaFeiraCor,
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            <button
              className="btn btn-sm"
              onClick={handleAddFeira}
              style={{ background: "linear-gradient(135deg, #EC4899, #BE4B83)", color: "#fff" }}
            >
              Adicionar
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {feiras.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#9C9690", fontSize: 13 }}>
                Nenhuma feira cadastrada
              </div>
            )}
            {feiras.map((f) => (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#F5F3EF",
                  borderRadius: 10,
                }}
              >
                <ColorDot cor={f.cor} size={12} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1A1714" }}>{f.nome}</span>
                <button className="btn-icon danger" onClick={() => handleRemoveFeira(f.id)}>
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Modal: Gerenciar Tags ── */}
      {modalTags && (
        <Modal title="Gerenciar Tags" onClose={() => setModalTags(false)}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              ref={novaTagRef}
              className="form-input"
              value={novaTag}
              onChange={(e) => setNovaTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Nome da tag..."
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-sm"
              onClick={handleAddTag}
              style={{ background: "linear-gradient(135deg, #EC4899, #BE4B83)", color: "#fff" }}
            >
              Adicionar
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tags.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "#9C9690", fontSize: 13 }}>
                Nenhuma tag cadastrada
              </div>
            )}
            {tags.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  background: "#F5F3EF",
                  borderRadius: 10,
                }}
              >
                <ColorDot cor={t.cor} size={12} />
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "#1A1714" }}>{t.nome}</span>
                <button className="btn-icon danger" onClick={() => handleRemoveTag(t.id)}>
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

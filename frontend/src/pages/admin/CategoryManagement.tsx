import { useState, useEffect, useCallback } from "react";
import {
  Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderTree, Tag,
  X, Loader2, AlertCircle, Save, FolderPlus, Package,
} from "lucide-react";
import { getToken, ApiError } from "../../api/client";

// ── Types (mirrors your Pydantic schemas) ──────────────────────────────────

interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: number | null;
  children: CategoryTreeNode[];
}

interface BrandOut {
  id: number;
  name: string;
  logo_url: string | null;
  product_count: number;
}

// ── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    let detail = `Erreur ${res.status}`;
    try {
      const err = await res.json();
      detail = err?.detail ?? detail;
    } catch {
      // response wasn't JSON, keep default message
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

const getCategoryTree = (): Promise<CategoryTreeNode[]> => apiFetch("/api/products/categories/tree");

const createCategory = (data: { name: string; slug?: string | null; icon?: string | null; parent_id?: number | null }) =>
  apiFetch("/api/products/categories", { method: "POST", body: JSON.stringify(data) });

const updateCategory = (id: number, data: { name?: string; icon?: string | null; parent_id?: number | null }) =>
  apiFetch(`/api/products/categories/${id}`, { method: "PATCH", body: JSON.stringify(data) });

const deleteCategory = (id: number) =>
  apiFetch(`/api/products/categories/${id}`, { method: "DELETE" });

const getBrands = (): Promise<BrandOut[]> => apiFetch("/api/products/brands");

const createBrand = (data: { name: string; logo_url?: string | null }) =>
  apiFetch("/api/products/brands", { method: "POST", body: JSON.stringify(data) });

const updateBrand = (id: number, data: { name?: string; logo_url?: string | null }) =>
  apiFetch(`/api/products/brands/${id}`, { method: "PATCH", body: JSON.stringify(data) });

const deleteBrand = (id: number) =>
  apiFetch(`/api/products/brands/${id}`, { method: "DELETE" });

// ── Helpers to keep the parent-picker sane ─────────────────────────────────

function flattenWithDepth(nodes: CategoryTreeNode[], depth = 0): { id: number; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${"— ".repeat(depth)}${n.name}` },
    ...flattenWithDepth(n.children, depth + 1),
  ]);
}

// Excludes a node and all its descendants (can't become its own parent)
function excludeSubtree(nodes: CategoryTreeNode[], excludeId: number): CategoryTreeNode[] {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => ({ ...n, children: excludeSubtree(n.children, excludeId) }));
}

// ── Category form modal ──────────────────────────────────────────────────

interface CategoryFormState {
  mode: "create" | "edit";
  id?: number;
  name: string;
  slug: string;
  icon: string;
  parent_id: number | null;
}

function CategoryFormModal({
  form,
  parentOptions,
  onClose,
  onSaved,
}: {
  form: CategoryFormState;
  parentOptions: { id: number; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(form.name);
  const [slug, setSlug] = useState(form.slug);
  const [icon, setIcon] = useState(form.icon);
  const [parentId, setParentId] = useState<number | null>(form.parent_id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.mode === "create") {
        await createCategory({
          name: name.trim(),
          slug: slug.trim() || null,
          icon: icon.trim() || null,
          parent_id: parentId,
        });
      } else if (form.id) {
        await updateCategory(form.id, {
          name: name.trim(),
          icon: icon.trim() || null,
          parent_id: parentId,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground">
            {form.mode === "create" ? "Nouvelle catégorie" : "Modifier la catégorie"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ordinateurs portables"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          {form.mode === "create" && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
                Slug <span className="normal-case font-normal text-muted-foreground">(optionnel, auto-généré si vide)</span>
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ordinateurs-portables"
                className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
              Icône <span className="normal-case font-normal text-muted-foreground">(nom d'icône lucide, optionnel)</span>
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Ex: laptop"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Catégorie parente</label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              <option value="">— Aucune (catégorie principale) —</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category tree row (recursive) ──────────────────────────────────────────

function CategoryRow({
  node,
  depth,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  onAddChild: (parent: CategoryTreeNode) => void;
  onEdit: (node: CategoryTreeNode) => void;
  onDelete: (node: CategoryTreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-secondary/60 transition-colors"
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`flex-shrink-0 text-muted-foreground ${hasChildren ? "" : "invisible"}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <FolderTree size={14} className={depth === 0 ? "text-primary flex-shrink-0" : "text-muted-foreground flex-shrink-0"} />

        <span className={`text-sm flex-1 truncate ${depth === 0 ? "font-bold text-foreground" : "font-medium text-foreground/90"}`}>
          {node.name}
        </span>
        <span className="text-xs text-muted-foreground hidden sm:block">/{node.slug}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onAddChild(node)}
            title="Ajouter une sous-catégorie"
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => onEdit(node)}
            title="Modifier"
            className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(node)}
            title="Supprimer"
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Categories panel ──────────────────────────────────────────────────────

function CategoriesPanel() {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getCategoryTree()
      .then(setTree)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Impossible de charger les catégories."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function openCreate(parent?: CategoryTreeNode) {
    setForm({ mode: "create", name: "", slug: "", icon: "", parent_id: parent?.id ?? null });
  }

  function openEdit(node: CategoryTreeNode) {
    setForm({ mode: "edit", id: node.id, name: node.name, slug: node.slug, icon: node.icon ?? "", parent_id: node.parent_id });
  }

  async function handleDelete(node: CategoryTreeNode) {
    if (!window.confirm(`Supprimer "${node.name}" ? Cette action est irréversible.`)) return;
    setActionError(null);
    try {
      await deleteCategory(node.id);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de supprimer cette catégorie.");
    }
  }

  const parentOptions = form
    ? flattenWithDepth(form.mode === "edit" && form.id ? excludeSubtree(tree, form.id) : tree)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les catégories et sous-catégories de produits.</p>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Nouvelle catégorie
        </button>
      </div>

      {actionError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" /> {actionError}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-2 shadow-sm">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="py-10 text-center text-sm text-red-600">{loadError}</div>
        ) : tree.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aucune catégorie pour le moment. Créez-en une pour commencer.
          </div>
        ) : (
          <div>
            {tree.map((node) => (
              <CategoryRow key={node.id} node={node} depth={0} onAddChild={openCreate} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {form && (
        <CategoryFormModal
          form={form}
          parentOptions={parentOptions}
          onClose={() => setForm(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

// ── Brand form modal ────────────────────────────────────────────────────────

interface BrandFormState {
  mode: "create" | "edit";
  id?: number;
  name: string;
  logo_url: string;
}

function BrandFormModal({
  form,
  onClose,
  onSaved,
}: {
  form: BrandFormState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(form.name);
  const [logoUrl, setLogoUrl] = useState(form.logo_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("Le nom est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (form.mode === "create") {
        await createBrand({ name: name.trim(), logo_url: logoUrl.trim() || null });
      } else if (form.id) {
        await updateBrand(form.id, { name: name.trim(), logo_url: logoUrl.trim() || null });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-foreground">
            {form.mode === "create" ? "Nouvelle marque" : "Modifier la marque"}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">Nom</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Dell"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
              URL du logo <span className="normal-case font-normal text-muted-foreground">(optionnel)</span>
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-lg hover:bg-secondary transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-lg hover:bg-blue-900 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Brands panel ─────────────────────────────────────────────────────────

function BrandsPanel() {
  const [brands, setBrands] = useState<BrandOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [form, setForm] = useState<BrandFormState | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    getBrands()
      .then(setBrands)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Impossible de charger les marques."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function openCreate() {
    setForm({ mode: "create", name: "", logo_url: "" });
  }

  function openEdit(brand: BrandOut) {
    setForm({ mode: "edit", id: brand.id, name: brand.name, logo_url: brand.logo_url ?? "" });
  }

  async function handleDelete(brand: BrandOut) {
    if (!window.confirm(`Supprimer "${brand.name}" ? Cette action est irréversible.`)) return;
    setActionError(null);
    try {
      await deleteBrand(brand.id);
      refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible de supprimer cette marque.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les marques associées aux produits.</p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} /> Nouvelle marque
        </button>
      </div>

      {actionError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
          <AlertCircle size={14} className="flex-shrink-0" /> {actionError}
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border p-2 shadow-sm">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="py-10 text-center text-sm text-red-600">{loadError}</div>
        ) : brands.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Aucune marque pour le moment. Créez-en une pour commencer.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="group flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Tag size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{brand.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package size={11} /> {brand.product_count} produit{brand.product_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button
                    onClick={() => openEdit(brand)}
                    title="Modifier"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(brand)}
                    title="Supprimer"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {form && (
        <BrandFormModal
          form={form}
          onClose={() => setForm(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

// ── Main page: tabbed Categories / Brands ───────────────────────────────────

export default function CategoryManagement() {
  const [tab, setTab] = useState<"categories" | "brands">("categories");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-foreground text-lg">Catégories et marques</h2>
        <p className="text-sm text-muted-foreground">Structurez votre catalogue de produits.</p>
      </div>

      <div className="inline-flex bg-secondary rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab("categories")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "categories" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderTree size={15} /> Catégories
        </button>
        <button
          onClick={() => setTab("brands")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "brands" ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag size={15} /> Marques
        </button>
      </div>

      {tab === "categories" ? <CategoriesPanel /> : <BrandsPanel />}
    </div>
  );
}
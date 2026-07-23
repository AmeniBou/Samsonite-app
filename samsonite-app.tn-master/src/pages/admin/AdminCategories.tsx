import { useCallback, useEffect, useMemo, useState } from "react";
import { CornerDownRight, Folder, FolderTree, Pencil, PlusCircle, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import {
    createCategory,
    deleteCategory,
    fetchAdminCategories,
    updateCategory,
    type AdminCategory,
} from "@/lib/admin-api";

type CategoryForm = {
    name: string;
    slug: string;
    parentId: number;
};

const emptyForm: CategoryForm = {
    name: "",
    slug: "",
    parentId: 0,
};

const normalizeText = (value?: string | null) => (value || "").trim();

const AdminCategories = () => {
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await fetchAdminCategories();
            setCategories(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur chargement categories");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

    const getCategoryPath = useCallback(
        (category: AdminCategory) => {
            const names = [normalizeText(category.name)];
            let parentId = category.parentId;
            const visited = new Set<number>([category.id]);

            while (parentId && categoryById.has(parentId) && !visited.has(parentId)) {
                visited.add(parentId);
                const parent = categoryById.get(parentId)!;
                names.unshift(normalizeText(parent.name));
                parentId = parent.parentId;
            }

            return names.filter(Boolean).join(" > ");
        },
        [categoryById]
    );

    const getCategoryDepth = useCallback(
        (category: AdminCategory) => {
            let depth = 0;
            let parentId = category.parentId;
            const visited = new Set<number>([category.id]);

            while (parentId && categoryById.has(parentId) && !visited.has(parentId)) {
                depth += 1;
                visited.add(parentId);
                parentId = categoryById.get(parentId)?.parentId || 0;
            }

            return depth;
        },
        [categoryById]
    );

    const filteredCategories = useMemo(() => {
        const query = search.trim().toLowerCase();
        const sorted = [...categories].sort((a, b) =>
            getCategoryPath(a).localeCompare(getCategoryPath(b), "fr", { sensitivity: "base" })
        );

        if (!query) return sorted;
        return sorted.filter((category) => {
            const path = getCategoryPath(category).toLowerCase();
            return (
                path.includes(query) ||
                normalizeText(category.slug).toLowerCase().includes(query) ||
                String(category.id).includes(query)
            );
        });
    }, [categories, getCategoryPath, search]);

    const startCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setSuccess("");
    };

    const startEdit = (category: AdminCategory) => {
        setEditingId(category.id);
        setForm({
            name: normalizeText(category.name),
            slug: normalizeText(category.slug),
            parentId: category.parentId || 0,
        });
        setError("");
        setSuccess("");
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = form.name.trim();
        if (!name) {
            setError("Le nom de la categorie est obligatoire.");
            return;
        }

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                name,
                slug: form.slug.trim(),
                parentId: form.parentId || null,
            };
            const result = editingId ? await updateCategory(editingId, payload) : await createCategory(payload);

            if (!result.success) {
                setError(result.error || "Impossible d'enregistrer la categorie");
                return;
            }

            setSuccess(editingId ? "Categorie modifiee." : "Categorie creee.");
            setEditingId(null);
            setForm(emptyForm);
            await loadCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur enregistrement categorie");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: AdminCategory) => {
        const productCount = category.productCount || 0;
        const childCount = category.childCount || 0;
        if (productCount > 0 || childCount > 0) {
            setError("Cette categorie contient encore des produits ou des sous-categories.");
            return;
        }

        if (!window.confirm(`Supprimer la categorie "${normalizeText(category.name)}" ?`)) return;

        setDeletingId(category.id);
        setError("");
        setSuccess("");
        try {
            const result = await deleteCategory(category.id);
            if (!result.success) {
                setError(result.error || "Impossible de supprimer la categorie");
                return;
            }
            setSuccess("Categorie supprimee.");
            await loadCategories();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur suppression categorie");
        } finally {
            setDeletingId(null);
        }
    };

    const parentOptions = categories.filter((category) => category.id !== editingId && !category.parentId);
    const rootCount = categories.filter((category) => !category.parentId).length;
    const childCount = categories.length - rootCount;

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {categories.length} categories - {rootCount} principales - {childCount} sous-categories
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={loadCategories}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Rafraichir
                    </button>
                    <button
                        onClick={startCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nouvelle categorie
                    </button>
                </div>
            </div>

            {(error || success) && (
                <div
                    className={`border px-4 py-3 text-sm ${error
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}
                >
                    {error || success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FolderTree className="h-5 w-5 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingId ? "Modifier la categorie" : "Ajouter une categorie"}
                        </h2>
                    </div>
                    {editingId && (
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            <X className="h-4 w-4" />
                            Annuler
                        </button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Nom</span>
                        <input
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            placeholder="Valises rigides"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Slug</span>
                        <input
                            value={form.slug}
                            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            placeholder="Automatique si vide"
                        />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Categorie parente</span>
                        <select
                            value={form.parentId}
                            onChange={(event) => setForm((prev) => ({ ...prev, parentId: Number(event.target.value) }))}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                        >
                            <option value={0}>Categorie principale</option>
                            {parentOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {getCategoryPath(category)}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                    <Save className="h-4 w-4" />
                    {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
            </form>

            <div className="bg-white border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            placeholder="Rechercher par nom, slug, parent ou ID..."
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="text-left px-4 py-3 font-bold">Categorie</th>
                                <th className="text-left px-4 py-3 font-bold">Parent</th>
                                <th className="text-left px-4 py-3 font-bold">Slug</th>
                                <th className="text-center px-4 py-3 font-bold">Produits</th>
                                <th className="text-center px-4 py-3 font-bold">Sous-cat.</th>
                                <th className="text-right px-4 py-3 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                        Chargement des categories...
                                    </td>
                                </tr>
                            ) : filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                        Aucune categorie trouvee.
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((category) => {
                                    const canDelete = !(category.productCount || category.childCount);
                                    const depth = getCategoryDepth(category);
                                    const isRoot = depth === 0;
                                    return (
                                        <tr
                                            key={category.id}
                                            className={`hover:bg-gray-50 ${isRoot ? "bg-white" : "bg-slate-50/70"}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-start gap-3" style={{ paddingLeft: `${Math.min(depth, 3) * 28}px` }}>
                                                    <div
                                                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isRoot
                                                            ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                                                            : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                            }`}
                                                    >
                                                        {isRoot ? <Folder className="h-4 w-4" /> : <CornerDownRight className="h-4 w-4" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={`font-semibold ${isRoot ? "text-gray-950" : "text-gray-700"}`}>
                                                                {normalizeText(category.name)}
                                                            </span>
                                                            <span
                                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${isRoot
                                                                    ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                                                                    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                                    }`}
                                                            >
                                                                {isRoot ? "Categorie principale" : "Sous-categorie"}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            ID {category.id}{!isRoot && ` - Niveau ${depth + 1}`}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {isRoot ? (
                                                    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                                        Racine
                                                    </span>
                                                ) : (
                                                    <span className="font-medium text-gray-800">
                                                        {normalizeText(category.parentName) || "Parent introuvable"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{normalizeText(category.slug) || "-"}</td>
                                            <td className="px-4 py-3 text-center text-gray-700">{category.productCount || 0}</td>
                                            <td className="px-4 py-3 text-center text-gray-700">{category.childCount || 0}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(category)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-xs hover:bg-gray-50"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                        Modifier
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(category)}
                                                        disabled={!canDelete || deletingId === category.id}
                                                        title={!canDelete ? "Categorie utilisee" : "Supprimer"}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-red-200 rounded-md text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {deletingId === category.id ? "..." : "Supprimer"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminCategories;






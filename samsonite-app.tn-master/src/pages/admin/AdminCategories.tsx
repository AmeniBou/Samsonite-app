import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, CornerDownRight, Folder, FolderTree, Pencil, PlusCircle, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import {
    createCategory,
    deleteCategory,
    fetchAdminCategories,
    updateCategory,
    type AdminCategory,
} from "@/lib/admin-api";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { toast } from "@/components/ui/sonner";

type CategoryForm = {
    name: string;
    slug: string;
    parentId: number;
    isActive: boolean;
    showInMainMenu: boolean;
};

const MAIN_MENU_LIMIT = 7;

const emptyForm: CategoryForm = {
    name: "",
    slug: "",
    parentId: 0,
    isActive: true,
    showInMainMenu: true,
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
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [expandedRootIds, setExpandedRootIds] = useState<Set<number>>(new Set());
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

    const getRootCategoryId = useCallback(
        (category: AdminCategory) => {
            let rootId = category.id;
            let parentId = category.parentId;
            const visited = new Set<number>([category.id]);

            while (parentId && categoryById.has(parentId) && !visited.has(parentId)) {
                const parent = categoryById.get(parentId)!;
                rootId = parent.id;
                visited.add(parent.id);
                parentId = parent.parentId;
            }

            return rootId;
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

    const displayedCategories = useMemo(() => {
        const query = search.trim();
        if (query) return filteredCategories;

        return filteredCategories.filter((category) => {
            if (!category.parentId) return true;
            return expandedRootIds.has(getRootCategoryId(category));
        });
    }, [expandedRootIds, filteredCategories, getRootCategoryId, search]);

    const totalPages = Math.max(1, Math.ceil(displayedCategories.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginatedCategories = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return displayedCategories.slice(start, start + pageSize);
    }, [displayedCategories, pageSize, safePage]);
    const paginationStart = displayedCategories.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const paginationEnd = Math.min(displayedCategories.length, safePage * pageSize);

    useEffect(() => {
        setPage(1);
    }, [search, expandedRootIds, pageSize]);

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
            isActive: category.isActive,
            showInMainMenu: category.showInMainMenu,
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
            const wantsMainMenu = !form.parentId && form.isActive && form.showInMainMenu;
            const currentCategory = editingId ? categories.find((category) => category.id === editingId) : null;
            const alreadyCounted =
                Boolean(currentCategory) &&
                !currentCategory?.parentId &&
                currentCategory?.isActive &&
                currentCategory?.showInMainMenu;

            if (wantsMainMenu && !alreadyCounted && mainMenuCount >= MAIN_MENU_LIMIT) {
                setError(`Le menu principal peut contenir au maximum ${MAIN_MENU_LIMIT} categories.`);
                return;
            }

            const payload = {
                name,
                slug: form.slug.trim(),
                parentId: form.parentId || null,
                isActive: form.isActive,
                showInMainMenu: form.parentId ? false : form.showInMainMenu,
            };
            const result = editingId ? await updateCategory(editingId, payload) : await createCategory(payload);

            if (!result.success) {
                setError(result.error || "Impossible d'enregistrer la categorie");
                return;
            }

            const successMessage = editingId ? "Cat\u00e9gorie modifi\u00e9e." : "Cat\u00e9gorie ajout\u00e9e avec succ\u00e8s.";
            setSuccess(successMessage);
            if (!editingId) toast.success(successMessage);
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
    const mainMenuCount = categories.filter(
        (category) => !category.parentId && category.isActive && category.showInMainMenu
    ).length;
    const rootCategoryIds = categories.filter((category) => !category.parentId).map((category) => category.id);
    const canAddCurrentFormToMainMenu =
        Boolean(editingId && categories.find((category) => category.id === editingId)?.showInMainMenu) ||
        mainMenuCount < MAIN_MENU_LIMIT;
    const mainMenuLimitReached = mainMenuCount >= MAIN_MENU_LIMIT;
    const toggleRoot = (categoryId: number) => {
        setExpandedRootIds((prev) => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {categories.length} categories - {rootCount} principales - {childCount} sous-categories - {mainMenuCount}/{MAIN_MENU_LIMIT} dans le menu principal
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
                            onChange={(event) => {
                                const parentId = Number(event.target.value);
                                setForm((prev) => ({
                                    ...prev,
                                    parentId,
                                    showInMainMenu: parentId ? false : prev.showInMainMenu,
                                }));
                            }}
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

                <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3">
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span>
                            <span className="block text-sm font-bold text-gray-900">Catégorie active</span>
                            <span className="block text-xs text-gray-500">
                                Active = visible dans Explorer et utilisable sur le site.
                            </span>
                        </span>
                    </label>
                    <label className={`flex items-start gap-3 rounded-md border px-4 py-3 ${form.parentId ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50" : "cursor-pointer border-gray-200 bg-gray-50"}`}>
                        <input
                            type="checkbox"
                            checked={!form.parentId && form.showInMainMenu}
                            disabled={Boolean(form.parentId) || (!form.showInMainMenu && !canAddCurrentFormToMainMenu)}
                            onChange={(event) => {
                                if (event.target.checked && !canAddCurrentFormToMainMenu) {
                                    setError(`Le menu principal peut contenir au maximum ${MAIN_MENU_LIMIT} categories.`);
                                    return;
                                }
                                setForm((prev) => ({ ...prev, showInMainMenu: event.target.checked }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:cursor-not-allowed"
                        />
                        <span>
                            <span className="block text-sm font-bold text-gray-900">Menu principal + Explorer</span>
                            <span className="block text-xs text-gray-500">
                                Réservé aux catégories principales. Maximum {MAIN_MENU_LIMIT} catégories dans le menu principal.
                            </span>
                            {!form.parentId && !form.showInMainMenu && mainMenuLimitReached && (
                                <span className="mt-1 block text-xs font-semibold text-amber-700">
                                    Limite atteinte : retire d'abord une autre catégorie du menu principal.
                                </span>
                            )}
                        </span>
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
                <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            placeholder="Rechercher par nom, slug, parent ou ID..."
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setExpandedRootIds(new Set(rootCategoryIds))}
                            disabled={Boolean(search.trim()) || rootCategoryIds.length === 0}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronDown className="h-4 w-4" />
                            Tout ouvrir
                        </button>
                        <button
                            type="button"
                            onClick={() => setExpandedRootIds(new Set())}
                            disabled={Boolean(search.trim()) || expandedRootIds.size === 0}
                            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <ChevronRight className="h-4 w-4" />
                            Tout fermer
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 text-sm text-gray-500">
                    <span>{paginationStart}-{paginationEnd} sur {displayedCategories.length} categorie(s)</span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                        Par page
                        <select
                            value={pageSize}
                            onChange={(event) => setPageSize(Number(event.target.value))}
                            className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-bold text-gray-900"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </label>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="text-left px-4 py-3 font-bold">Categorie</th>
                                <th className="text-left px-4 py-3 font-bold">Parent</th>
                                <th className="text-left px-4 py-3 font-bold">Slug</th>
                                <th className="text-center px-4 py-3 font-bold">Actif</th>
                                <th className="text-center px-4 py-3 font-bold">Menu</th>
                                <th className="text-center px-4 py-3 font-bold">Produits</th>
                                <th className="text-center px-4 py-3 font-bold">Sous-cat.</th>
                                <th className="text-right px-4 py-3 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                        Chargement des categories...
                                    </td>
                                </tr>
                            ) : displayedCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                        Aucune categorie trouvee.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCategories.map((category) => {
                                    const canDelete = !(category.productCount || category.childCount);
                                    const depth = getCategoryDepth(category);
                                    const isRoot = depth === 0;
                                    const hasChildren = Boolean(category.childCount);
                                    const isExpanded = expandedRootIds.has(category.id);
                                    return (
                                        <tr
                                            key={category.id}
                                            className={`hover:bg-gray-50 ${isRoot ? "bg-white" : "bg-slate-50/70"}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-start gap-3" style={{ paddingLeft: `${Math.min(depth, 3) * 28}px` }}>
                                                    {isRoot && hasChildren && !search.trim() ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleRoot(category.id)}
                                                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200 transition-colors hover:bg-sky-100"
                                                            aria-label={isExpanded ? "Fermer la categorie" : "Ouvrir la categorie"}
                                                        >
                                                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                        </button>
                                                    ) : (
                                                        <div
                                                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isRoot
                                                                ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                                                                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                }`}
                                                        >
                                                            {isRoot ? <Folder className="h-4 w-4" /> : <CornerDownRight className="h-4 w-4" />}
                                                        </div>
                                                    )}
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
                                            <td className="px-4 py-3 text-center">
                                                <ConfirmDeleteDialog
                                                    title={category.isActive ? "Désactiver cette catégorie ?" : "Activer cette catégorie ?"}
                                                    description={
                                                        category.isActive
                                                            ? `La catégorie "${normalizeText(category.name)}" ne sera plus visible dans le menu et les listes publiques. Les produits associés restent conservés.`
                                                            : `La catégorie "${normalizeText(category.name)}" redeviendra visible selon sa configuration de menu.`
                                                    }
                                                    confirmLabel={category.isActive ? "Désactiver" : "Activer"}
                                                    pendingLabel="Mise à jour..."
                                                    tone={category.isActive ? "warning" : "info"}
                                                    onConfirm={() => updateCategory(category.id, { isActive: !category.isActive }).then(loadCategories)}
                                                >
                                                    {(openDialog) => (
                                                        <button
                                                            type="button"
                                                            onClick={openDialog}
                                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${category.isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"}`}
                                                        >
                                                            {category.isActive ? "Actif" : "Masqué"}
                                                        </button>
                                                    )}
                                                </ConfirmDeleteDialog>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isRoot ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!category.showInMainMenu && mainMenuLimitReached) {
                                                                setError(`Le menu principal peut contenir au maximum ${MAIN_MENU_LIMIT} categories.`);
                                                                return;
                                                            }
                                                            updateCategory(category.id, { showInMainMenu: !category.showInMainMenu }).then(loadCategories);
                                                        }}
                                                        disabled={!category.showInMainMenu && mainMenuLimitReached}
                                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${category.showInMainMenu ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}
                                                    >
                                                        {category.showInMainMenu ? "Principal + Explorer" : "Explorer seul"}
                                                    </button>
                                                ) : (
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                                        Sous-cat.
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">{category.productCount || 0}</td>
                                            <td className="px-4 py-3 text-center text-gray-700">{category.childCount || 0}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(category)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        title="Modifier"
                                                        aria-label="Modifier cette categorie"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <ConfirmDeleteDialog
                                                        title="Supprimer cette catégorie ?"
                                                        description={`La catégorie "${normalizeText(category.name)}" sera définitivement supprimée de la base. Cette action est possible uniquement si elle ne contient ni produits ni sous-catégories.`}
                                                        confirmLabel="Supprimer"
                                                        pendingLabel="Suppression..."
                                                        disabled={!canDelete || deletingId === category.id}
                                                        onConfirm={() => handleDelete(category)}
                                                    >
                                                        {(openDialog) => (
                                                            <button
                                                                type="button"
                                                                onClick={openDialog}
                                                                disabled={!canDelete || deletingId === category.id}
                                                                title={!canDelete ? "Categorie utilisee" : "Supprimer"}
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {deletingId === category.id ? (
                                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </ConfirmDeleteDialog>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && displayedCategories.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500">
                            Page {safePage} sur {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={safePage <= 1}
                                className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Précédent
                            </button>
                            {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
                                const pageNumber = index + 1;
                                return (
                                    <button
                                        key={pageNumber}
                                        type="button"
                                        onClick={() => setPage(pageNumber)}
                                        className={`h-9 w-9 rounded-full border text-xs font-bold transition-colors ${safePage === pageNumber ? "border-black bg-black text-white" : "border-gray-200 text-gray-700 hover:border-black"}`}
                                    >
                                        {pageNumber}
                                    </button>
                                );
                            })}
                            {totalPages > 7 && <span className="px-1 text-xs font-bold text-gray-400">...</span>}
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                                disabled={safePage >= totalPages}
                                className="rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCategories;






import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, CornerDownRight, Filter, Folder, FolderTree, Pencil, PlusCircle, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import {
    createCategory,
    deleteCategory,
    fetchAdminCatégories,
    updateCategory,
    type AdminCategory,
} from "@/lib/admin-api";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
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
    showInMainMenu: false,
};

const normalizeText = (value?: string | null) => (value || "").trim();

const normalizeSlug = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const MAIN_MENU_LIMIT_MESSAGE =
    `Limite atteinte : le menu principal affiche déjà ${MAIN_MENU_LIMIT} catégories. Décoche "Menu principal + Explorer" ou retire une autre catégorie du menu principal.`;

const AdminCatégories = () => {
    const [categories, setCatégories] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<CategoryForm>(emptyForm);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [expandedRootIds, setExpandedRootIds] = useState<Set<number>>(new Set());
    const [showForm, setShowForm] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "root" | "child">("all");
    const [menuFilter, setMenuFilter] = useState<"all" | "inMenu" | "notInMenu">("all");
    const [parentFilter, setParentFilter] = useState("all");
    const [productsFilter, setProductsFilter] = useState<"all" | "with" | "without">("all");
    const [childrenFilter, setChildrenFilter] = useState<"all" | "with" | "without">("all");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadCatégories = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await fetchAdminCatégories();
            setCatégories(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement des catégories");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCatégories();
    }, [loadCatégories]);

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

    const filteredCatégories = useMemo(() => {
        const query = search.trim().toLowerCase();
        const sorted = [...categories].sort((a, b) =>
            getCategoryPath(a).localeCompare(getCategoryPath(b), "fr", { sensitivity: "base" })
        );

        const filtered = sorted.filter((category) => {
            const isRoot = !category.parentId;
            const path = getCategoryPath(category).toLowerCase();
            const matchesSearch =
                !query ||
                path.includes(query) ||
                normalizeText(category.slug).toLowerCase().includes(query) ||
                String(category.id).includes(query);

            if (!matchesSearch) return false;
            if (statusFilter === "active" && !category.isActive) return false;
            if (statusFilter === "inactive" && category.isActive) return false;
            if (typeFilter === "root" && !isRoot) return false;
            if (typeFilter === "child" && isRoot) return false;
            if (menuFilter === "inMenu" && !category.showInMainMenu) return false;
            if (menuFilter === "notInMenu" && category.showInMainMenu) return false;
            if (parentFilter !== "all" && String(category.parentId) !== parentFilter) return false;
            const totalProductCount = category.totalProductCount ?? category.productCount ?? 0;
            if (productsFilter === "with" && !(totalProductCount > 0)) return false;
            if (productsFilter === "without" && (totalProductCount > 0)) return false;
            if (childrenFilter === "with" && !(category.childCount > 0)) return false;
            if (childrenFilter === "without" && (category.childCount > 0)) return false;
            return true;
        });

        return filtered;
    }, [categories, getCategoryPath, search, statusFilter, typeFilter, menuFilter, parentFilter, productsFilter, childrenFilter]);

    const displayedCatégories = useMemo(() => {
        const query = search.trim();
        if (query) return filteredCatégories;

        return filteredCatégories.filter((category) => {
            if (!category.parentId) return true;
            return expandedRootIds.has(getRootCategoryId(category));
        });
    }, [expandedRootIds, filteredCatégories, getRootCategoryId, search]);

    const totalPages = Math.max(1, Math.ceil(displayedCatégories.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const paginatedCatégories = useMemo(() => {
        const start = (safePage - 1) * pageSize;
        return displayedCatégories.slice(start, start + pageSize);
    }, [displayedCatégories, pageSize, safePage]);

    const activeFilterCount = [
        search.trim(),
        statusFilter !== "all",
        typeFilter !== "all",
        menuFilter !== "all",
        parentFilter !== "all",
        productsFilter !== "all",
        childrenFilter !== "all",
    ].filter(Boolean).length;

    const hasActiveFilters = activeFilterCount > 0;

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setTypeFilter("all");
        setMenuFilter("all");
        setParentFilter("all");
        setProductsFilter("all");
        setChildrenFilter("all");
    };

    const parentFilterOptions = categories.filter((category) => !category.parentId);

    const filterLabelClass = "space-y-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500";
    const filterControlClass =
        "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm font-medium normal-case text-gray-900 shadow-sm transition-colors hover:border-gray-300 focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10";

    useEffect(() => {
        setPage(1);
    }, [search, expandedRootIds, pageSize, statusFilter, typeFilter, menuFilter, parentFilter, productsFilter, childrenFilter]);

    const startCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setSuccess("");
        setShowForm(true);
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
        setShowForm(true);
        requestAnimationFrame(() => {
            document.getElementById("category-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setError("");
        setShowForm(false);
    };

    const applyCategoryUpdate = async (
        categoryId: number,
        fields: Partial<{ name: string; slug: string; parentId: number | null; isActive: boolean; showInMainMenu: boolean }>
    ): Promise<void> => {
        setError("");
        setSuccess("");
        const result = await updateCategory(categoryId, fields);
        if (!result.success) {
            const message = result.error || "Impossible de mettre à jour la catégorie.";
            setError(message);
            toast.error(message);
            return;
        }

        if (fields.isActive !== undefined) {
            toast.success(fields.isActive ? "Catégorie activée." : "Catégorie désactivée.");
        } else if (fields.showInMainMenu !== undefined) {
            toast.success(fields.showInMainMenu ? "Catégorie ajoutée au menu principal." : "Catégorie retirée du menu principal.");
        } else {
            toast.success("Catégorie mise à jour.");
        }

        await loadCatégories();
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const name = form.name.trim();
        const submittedSlug = form.slug.trim() || normalizeSlug(name);
        if (!name) {
            setError("Le nom de la catégorie est obligatoire.");
            return;
        }
        if (!submittedSlug) {
            setError("Le slug est obligatoire. Il peut être généré automatiquement à partir du nom si tu laisses le champ vide.");
            return;
        }
        const slugConflict = categories.some(
            (category) =>
                category.id !== editingId &&
                normalizeText(category.slug).toLowerCase() === submittedSlug.toLowerCase()
        );
        if (slugConflict) {
            setError(`Le slug "${submittedSlug}" est déjà utilisé. Choisis un slug unique, par exemple "${submittedSlug}-2".`);
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
                setError(MAIN_MENU_LIMIT_MESSAGE);
                return;
            }

            const payload = {
                name,
                slug: submittedSlug,
                parentId: form.parentId || null,
                isActive: form.isActive,
                showInMainMenu: form.parentId ? false : form.showInMainMenu,
            };
            const result = editingId ? await updateCategory(editingId, payload) : await createCategory(payload);

            if (!result.success) {
                setError(result.error || "Impossible d'enregistrer la catégorie");
                return;
            }

            const successMessage = editingId ? "Catégorie modifiée." : "Catégorie ajoutée avec succès.";
            setSuccess(successMessage);
            toast.success(successMessage);
            setEditingId(null);
            setForm(emptyForm);
            setShowForm(false);
            await loadCatégories();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur d'enregistrement de la catégorie");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (category: AdminCategory) => {
        const productCount = category.productCount || 0;
        const childCount = category.childCount || 0;
        if (productCount > 0 || childCount > 0) {
            setError("Cette catégorie contient encore des produits ou des sous-catégories.");
            return;
        }

        setDeletingId(category.id);
        setError("");
        setSuccess("");
        try {
            const result = await deleteCategory(category.id);
            if (!result.success) {
                setError(result.error || "Impossible de supprimer la catégorie");
                return;
            }
            setSuccess("Catégorie supprimée.");
            toast.success("Catégorie supprimée.");
            await loadCatégories();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de suppression de la catégorie");
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
                    <h1 className="text-2xl font-black text-gray-950">Catégories</h1>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>
                            <strong className="text-gray-700">{categories.length}</strong> catégories
                        </span>

                        <span className="text-gray-300">•</span>

                        <span>
                            <strong className="text-gray-700">{rootCount}</strong> principales
                        </span>

                        <span className="text-gray-300">•</span>

                        <span>
                            <strong className="text-gray-700">{childCount}</strong> sous-catégories
                        </span>

                        <span className="text-gray-300">•</span>

                        <span>
                            <strong className="text-gray-700">{mainMenuCount}</strong> / {MAIN_MENU_LIMIT} dans le menu principal
                        </span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={loadCatégories}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Rafraîchir
                    </button>
                    <button
                        onClick={startCreate}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nouvelle catégorie
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

            {showForm && (
            <form id="category-form" onSubmit={handleSubmit} className="bg-white border border-gray-200 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FolderTree className="h-5 w-5 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-900">
                            {editingId ? "Modifier la catégorie" : "Ajouter une catégorie"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        title="Fermer"
                        aria-label="Fermer le formulaire"
                    >
                        <X className="h-4 w-4" />
                        Fermer
                    </button>
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
                            onChange={(event) => setForm((prev) => ({ ...prev, slug: normalizeSlug(event.target.value) }))}
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                            placeholder={normalizeSlug(form.name) || "valises-rigides"}
                        />
                        <span className="block text-xs leading-5 text-gray-500">
                            Le slug est l'identifiant utilisé dans l'URL de la page catégorie. Il doit être unique, sans espaces ni accents. Exemple : <strong>valises-rigides</strong>.
                        </span>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Catégorie parente</span>
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
                            <option value={0}>Catégorie principale</option>
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
                            onChange={(event) =>
                                setForm((prev) => ({
                                    ...prev,
                                    isActive: event.target.checked,
                                }))
                            }
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />

                        <div className="rounded border border-gray-200 bg-gray-50 px-3 py-3">
                            <div className="text-sm font-bold text-gray-900">
                                Catégorie active
                            </div>
                            <div className="text-xs text-gray-500">
                                Active = visible dans Explorer et utilisable sur le site.
                            </div>
                        </div>
                    </label>

                    <label
                        className={`flex items-start gap-3 rounded-md border px-4 py-3 ${form.parentId
                            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-50"
                            : "cursor-pointer border-gray-200 bg-gray-50"
                            }`}
                    >
                        <input
                            type="checkbox"
                            checked={!form.parentId && form.showInMainMenu}
                            disabled={
                                Boolean(form.parentId) ||
                                (!form.showInMainMenu && !canAddCurrentFormToMainMenu)
                            }
                            onChange={(event) => {
                                if (event.target.checked && !canAddCurrentFormToMainMenu) {
                                    setError(MAIN_MENU_LIMIT_MESSAGE);
                                    return;
                                }

                                setForm((prev) => ({
                                    ...prev,
                                    showInMainMenu: event.target.checked,
                                }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:cursor-not-allowed"
                        />

                        <div
                            className={`rounded border px-3 py-3 ${mainMenuLimitReached
                                ? "border-amber-200 bg-amber-50"
                                : "border-gray-200 bg-gray-50"
                                }`}
                        >
                            <div className="text-sm font-bold text-gray-900">
                                Menu principal + Explorer
                            </div>

                            <div className="text-xs text-gray-600">
                                Réservé aux catégories principales. Maximum {MAIN_MENU_LIMIT} catégories dans le menu principal.
                            </div>

                            {mainMenuLimitReached && (
                                <div className="mt-2 border-t border-amber-200 pt-2 text-sm text-amber-800">
                                    <strong>Limite atteinte :</strong> 7 catégories sont déjà présentes dans le menu principal.

                                    <p className="mt-1 text-xs text-amber-700">
                                        Retirez une catégorie existante du menu principal pour pouvoir ajouter celle-ci.
                                    </p>
                                </div>
                            )}
                        </div>
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
            )}

            <div className="mb-5 rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
                            <Filter className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-950">Filtres catégories</h2>
                            <p className="text-xs text-gray-500">
                                {displayedCatégories.length} résultat{displayedCatégories.length > 1 ? "s" : ""} sur {categories.length} catégories
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((prev) => !prev)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-gray-950 px-4 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-gray-800"
                            aria-expanded={filtersOpen}
                        >
                            {filtersOpen ? "Masquer les filtres" : "Afficher les filtres"}
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-gray-950">
                                    {activeFilterCount}
                                </span>
                            )}
                            {filtersOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            disabled={!hasActiveFilters}
                            className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 px-4 text-xs font-bold uppercase tracking-wide text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Nom, slug, parent ou ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 w-full rounded-md border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-900 transition-colors placeholder:text-gray-400 hover:bg-white focus:border-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                    </div>

                    {filtersOpen && (
                        <>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className={filterLabelClass}>
                            Statut
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                                className={filterControlClass}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="active">Actives</option>
                                <option value="inactive">Masquées</option>
                            </select>
                        </label>

                        <label className={filterLabelClass}>
                            Type
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value as "all" | "root" | "child")}
                                className={filterControlClass}
                            >
                                <option value="all">Tous les types</option>
                                <option value="root">Catégories principales</option>
                                <option value="child">Sous-catégories</option>
                            </select>
                        </label>

                        <label className={filterLabelClass}>
                            Menu principal
                            <select
                                value={menuFilter}
                                onChange={(e) => setMenuFilter(e.target.value as "all" | "inMenu" | "notInMenu")}
                                className={filterControlClass}
                            >
                                <option value="all">Tous</option>
                                <option value="inMenu">Dans le menu principal</option>
                                <option value="notInMenu">Hors menu principal</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className={filterLabelClass}>
                            Catégorie parente
                            <select
                                value={parentFilter}
                                onChange={(e) => setParentFilter(e.target.value)}
                                className={filterControlClass}
                            >
                                <option value="all">Toutes les catégories</option>
                                <option value="0">Catégories racines</option>
                                {parentFilterOptions.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {getCategoryPath(category)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className={filterLabelClass}>
                            Produits
                            <select
                                value={productsFilter}
                                onChange={(e) => setProductsFilter(e.target.value as "all" | "with" | "without")}
                                className={filterControlClass}
                            >
                                <option value="all">Tous</option>
                                <option value="with">Avec produits</option>
                                <option value="without">Sans produits</option>
                            </select>
                        </label>

                        <label className={filterLabelClass}>
                            Sous-catégories
                            <select
                                value={childrenFilter}
                                onChange={(e) => setChildrenFilter(e.target.value as "all" | "with" | "without")}
                                className={filterControlClass}
                            >
                                <option value="all">Tous</option>
                                <option value="with">Avec sous-catégories</option>
                                <option value="without">Sans sous-catégories</option>
                            </select>
                        </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-end gap-2">
                        {statusFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Statut: {statusFilter === "active" ? "actives" : "masquées"}
                            </span>
                        )}
                        {typeFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Type: {typeFilter === "root" ? "principales" : "sous-catégories"}
                            </span>
                        )}
                        {menuFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Menu: {menuFilter === "inMenu" ? "dans le menu" : "hors menu"}
                            </span>
                        )}
                        {parentFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Parent: {parentFilter === "0" ? "racine" : getCategoryPath(categories.find((c) => String(c.id) === parentFilter)!)}
                            </span>
                        )}
                        {productsFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Produits: {productsFilter === "with" ? "avec" : "sans"}
                            </span>
                        )}
                        {childrenFilter !== "all" && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                Sous-cat.: {childrenFilter === "with" ? "avec" : "sans"}
                            </span>
                        )}
                        {!hasActiveFilters && (
                            <span className="text-xs font-medium text-gray-400">Aucun filtre actif</span>
                        )}
                    </div>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-white border border-gray-200">
                <div className="flex flex-wrap items-center justify-end gap-2 border-b border-gray-100 px-4 py-3">
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

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="text-left px-4 py-3 font-bold">Catégorie</th>
                                <th className="text-left px-4 py-3 font-bold">Parent</th>
                                <th className="text-left px-4 py-3 font-bold">Slug</th>
                                <th className="text-center px-4 py-3 font-bold">Actif</th>
                                <th className="text-center px-4 py-3 font-bold">Menu</th>
                                <th className="text-center px-4 py-3 font-bold">Produits total</th>
                                <th className="text-center px-4 py-3 font-bold">Sous-cat.</th>
                                <th className="text-right px-4 py-3 font-bold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                        Chargement des catégories...
                                    </td>
                                </tr>
                            ) : displayedCatégories.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                                        Aucune catégorie trouvée.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCatégories.map((category) => {
                                    const directProductCount = category.productCount || 0;
                                    const totalProductCount = category.totalProductCount ?? directProductCount;
                                    const canDelete = !(directProductCount || category.childCount);
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
                                                            aria-label={isExpanded ? "Fermer la catégorie" : "Ouvrir la catégorie"}
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
                                                                {isRoot ? "Catégorie principale" : "Sous-catégorie"}
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
                                                    onConfirm={async () => {
                                                        await applyCategoryUpdate(category.id, { isActive: !category.isActive });
                                                    }}
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
                                                    <ConfirmDeleteDialog
                                                        title={category.showInMainMenu ? "Retirer cette catégorie du menu principal ?" : "Ajouter cette catégorie au menu principal ?"}
                                                        description={
                                                            category.showInMainMenu
                                                                ? `La catégorie "${normalizeText(category.name)}" ne figurera plus dans le menu principal et dans l'explorateur de navigation.`
                                                                : `La catégorie "${normalizeText(category.name)}" sera ajoutée au menu principal et apparaîtra dans l'explorateur de navigation.`
                                                        }
                                                        confirmLabel={category.showInMainMenu ? "Retirer du menu" : "Ajouter au menu"}
                                                        pendingLabel="Mise à jour..."
                                                        tone={category.showInMainMenu ? "warning" : "info"}
                                                        onConfirm={async () => {
                                                            await applyCategoryUpdate(category.id, { showInMainMenu: !category.showInMainMenu });
                                                        }}
                                                    >
                                                        {(openDialog) => (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!category.showInMainMenu && mainMenuLimitReached) {
                                                                        setError(MAIN_MENU_LIMIT_MESSAGE);
                                                                        return;
                                                                    }
                                                                    openDialog();
                                                                }}
                                                                disabled={!category.showInMainMenu && mainMenuLimitReached}
                                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${category.showInMainMenu ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}
                                                            >
                                                                {category.showInMainMenu ? "Principal + Explorer" : "Explorer seul"}
                                                            </button>
                                                        )}
                                                    </ConfirmDeleteDialog>
                                                ) : (
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                                        Sous-cat.
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">
                                                <div className="font-semibold text-gray-900">{totalProductCount}</div>
                                                {totalProductCount !== directProductCount && (
                                                    <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                                                        {directProductCount} direct
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-gray-700">{category.childCount || 0}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(category)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        title="Modifier"
                                                        aria-label="Modifier cette catégorie"
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
                                                                title={!canDelete ? "Catégorie utilisée" : "Supprimer"}
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
                {!loading && displayedCatégories.length > 0 && (
                    <AdminTablePagination page={safePage} pageSize={pageSize} totalItems={displayedCatégories.length} pageSizeOptions={[5, 10, 20, 50]} onPageChange={setPage} onPageSizeChange={(nextPageSize) => { setPageSize(nextPageSize); setPage(1); }} />
                )}
            </div>
        </div>
    );
};

export default AdminCatégories;






import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Package, Pencil, Plus, PlusCircle, RefreshCw, Trash2, X } from "lucide-react";
import {
    createBrand,
    deleteBrand,
    fetchAdminBrands,
    updateBrand,
    type AdminBrand,
} from "@/lib/admin-api";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { toast } from "@/components/ui/sonner";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { AdminFilterSearch, AdminFiltersPanel, adminFilterActionClass, adminFilterLabelClass } from "@/components/admin/AdminFilters";

const normalizeText = (value?: string | null) => (value || "").trim();

const AdminBrands = () => {
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [brandsPage, setBrandsPage] = useState(1);
    const [brandsPageSize, setBrandsPageSize] = useState(10);

    const loadBrands = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            setBrands(await fetchAdminBrands());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement des marques");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBrands();
    }, [loadBrands]);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const filteredBrands = useMemo(() => {
        const query = search.trim().toLowerCase();
        return [...brands]
            .sort((a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name), "fr", { sensitivity: "base" }))
            .filter((brand) => !query || normalizeText(brand.name).toLowerCase().includes(query));
    }, [brands, search]);

    useEffect(() => setBrandsPage(1), [search, brandsPageSize]);
    const safeBrandsPage = Math.min(brandsPage, Math.max(1, Math.ceil(filteredBrands.length / brandsPageSize)));
    const paginatedBrands = filteredBrands.slice((safeBrandsPage - 1) * brandsPageSize, safeBrandsPage * brandsPageSize);

    const resetForm = () => {
        setEditingId(null);
        setName("");
    };

    const startCreate = () => {
        resetForm();
        setError("");
        setShowForm(true);
        requestAnimationFrame(() => document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const closeForm = () => {
        resetForm();
        setError("");
        setShowForm(false);
    };

    const startEdit = (brand: AdminBrand) => {
        setEditingId(brand.id);
        setName(brand.name);
        setShowForm(true);
        requestAnimationFrame(() => document.getElementById("brand-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const cleanName = name.trim();
        if (!cleanName) {
            setError("Le nom de la marque est obligatoire.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            const result = editingId
                ? await updateBrand(editingId, { name: cleanName })
                : await createBrand({ name: cleanName });

            if (!result.success) {
                setError(result.error || "Impossible d'enregistrer la marque");
                return;
            }

            toast.success(editingId ? "Marque modifiée avec succès." : "Marque ajoutée avec succès.");
            resetForm();
            setShowForm(false);
            await loadBrands();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Impossible d'enregistrer la marque");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (brand: AdminBrand) => {
        const result = await deleteBrand(brand.id);
        if (!result.success) {
            setError(result.error || "Impossible de supprimer la marque");
            return;
        }

        toast.success("Marque supprimée avec succès.");
        await loadBrands();
        if (editingId === brand.id) closeForm();
    };

    return (
        <div className="p-4 sm:p-5 lg:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-950">Marques</h1>
                    <p className="mt-1 max-w-2xl text-xs text-gray-600">
                        Les marques servent à classer les produits et à alimenter les filtres du catalogue.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={loadBrands} className="inline-flex h-9 items-center justify-center gap-2 border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 hover:bg-gray-50">
                        <RefreshCw className="h-3.5 w-3.5" /> Actualiser
                    </button>
                    <button type="button" onClick={startCreate} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800">
                        <PlusCircle className="h-4 w-4" /> Nouvelle marque
                    </button>
                </div>
            </div>


            {showForm && <form id="brand-form" onSubmit={handleSubmit} className="mb-4 border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-900">{editingId ? "Modifier la marque" : "Ajouter une marque"}</h2>
                    </div>
                    <button type="button" onClick={closeForm} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50" title="Fermer" aria-label="Fermer le formulaire"><X className="h-4 w-4" /> Fermer</button>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:items-end">
                    <label className="space-y-1">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Nom de la marque</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Ex: Samsonite, American Tourister, Lipault, Disney"
                            className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Ajouter"}
                    </button>
                </div>
            </form>}

            <AdminFiltersPanel
                title="Filtres des marques"
                summary={`${filteredBrands.length} résultat${filteredBrands.length !== 1 ? "s" : ""} sur ${brands.length} marque${brands.length !== 1 ? "s" : ""}`}
                className="mb-4"
                actions={(
                    <button
                        type="button"
                        onClick={() => setSearch("")}
                        disabled={!search.trim()}
                        className={`${adminFilterActionClass} border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                        Réinitialiser
                    </button>
                )}
            >
                <label className={adminFilterLabelClass}>
                    Recherche globale
                    <AdminFilterSearch
                        label="Rechercher dans les marques"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Nom ou ID de la marque..."
                    />
                </label>
            </AdminFiltersPanel>

            <div className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                <div className="grid grid-cols-[1fr_120px_96px] border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-black uppercase tracking-wide text-gray-500">
                    <span>Marque</span>
                    <span>Produits</span>
                    <span className="text-right">Actions</span>
                </div>

                {loading ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">Chargement...</div>
                ) : filteredBrands.length === 0 ? (
                    <AdminEmptyState
                        icon={BadgeCheck}
                        title={brands.length === 0 ? "Aucune marque enregistrée" : "Aucune marque trouvée"}
                        description={brands.length === 0
                            ? "Les marques ajoutées au catalogue apparaîtront ici."
                            : "Aucune marque ne correspond à la recherche saisie."}
                    />
                ) : (
                    paginatedBrands.map((brand) => {
                        const productCount = brand.productCount ?? 0;
                        return (
                            <div
                                key={brand.id}
                                className="grid grid-cols-[1fr_120px_96px] items-center border-b border-gray-100 px-3 py-3 last:border-b-0"
                            >
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                                        <BadgeCheck className="h-4 w-4" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-gray-950">{brand.name}</p>
                                        <p className="text-[11px] text-gray-500">ID {brand.id}</p>
                                    </div>
                                </div>
                                <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                                    <Package className="h-3.5 w-3.5" />
                                    {productCount}
                                </div>
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => startEdit(brand)}
                                        aria-label={`Modifier ${brand.name}`}
                                        title="Modifier"
                                        className="inline-flex h-8 w-8 items-center justify-center border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <ConfirmDeleteDialog
                                        title={productCount > 0 ? "Suppression impossible" : "Supprimer cette marque ?"}
                                        description={
                                            productCount > 0
                                                ? "Cette marque contient encore des produits. La suppression sera refusée pour protéger le catalogue."
                                                : "Cette action supprimera la marque de la base de données."
                                        }
                                        confirmLabel="Supprimer"
                                        cancelLabel={productCount > 0 ? "Fermer" : "Annuler"}
                                        pendingLabel="Suppression..."
                                        disabled={false}
                                        hideConfirm={productCount > 0}
                                        onConfirm={() => handleDelete(brand)}
                                    >
                                        {(openDialog) => (
                                            <button
                                                type="button"
                                                onClick={openDialog}
                                                aria-label={`Supprimer ${brand.name}`}
                                                title="Supprimer"
                                                className="inline-flex h-8 w-8 items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </ConfirmDeleteDialog>
                                </div>
                            </div>
                        );
                    })
                )}
                {!loading && filteredBrands.length > 0 && <AdminTablePagination page={safeBrandsPage} pageSize={brandsPageSize} totalItems={filteredBrands.length} onPageChange={setBrandsPage} onPageSizeChange={(pageSize) => { setBrandsPageSize(pageSize); setBrandsPage(1); }} />}
            </div>
        </div>
    );
};

export default AdminBrands;

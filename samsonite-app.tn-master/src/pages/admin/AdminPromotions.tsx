import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgePercent, Check, Edit2, Percent, PlusCircle, Trash2, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import {
    AdminPromotion,
    AdminPromotionPayload,
    AdminPromotionPreview,
    createAdminPromotion,
    deleteAdminPromotion,
    fetchAdminBrands,
    fetchAdminCategories,
    fetchAdminProducts,
    fetchAdminPromotions,
    previewAdminPromotion,
    updateAdminPromotion,
    AdminBrand,
    AdminCategory,
    AdminProduct,
} from "@/lib/admin-api";

const emptyPayload: AdminPromotionPayload = {
    name: "",
    percentage: 10,
    active: true,
    startsAt: null,
    endsAt: null,
    priority: 0,
    brandIds: [],
    categoryIds: [],
    productIds: [],
};

const formatTnd = (value: number) =>
    new Intl.NumberFormat("fr-TN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value) + " TND";

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

const targetText = (promotion: AdminPromotion) => {
    const parts = [
        promotion.brandNames.length ? `Marques: ${promotion.brandNames.join(", ")}` : "",
        promotion.categoryNames.length ? `Catégories: ${promotion.categoryNames.join(", ")}` : "",
        promotion.productNames.length ? `Produits: ${promotion.productNames.slice(0, 3).join(", ")}${promotion.productNames.length > 3 ? "..." : ""}` : "",
    ].filter(Boolean);
    return parts.length ? parts.join(" | ") : "Tous les produits";
};

const chipClass = (selected: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        selected ? "border-sky-500 bg-sky-50 text-sky-800" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
    }`;

type TargetMode = "filters" | "products";

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [form, setForm] = useState<AdminPromotionPayload>(emptyPayload);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [step, setStep] = useState(1);
    const [preview, setPreview] = useState<AdminPromotionPreview | null>(null);
    const [search, setSearch] = useState("");
    const [targetMode, setTargetMode] = useState<TargetMode>("filters");
    const [error, setError] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string;
        description: string;
        confirmLabel: string;
        tone: "danger" | "warning" | "info";
        onConfirm: () => Promise<void>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [promotionsPage, setPromotionsPage] = useState(1);
    const [promotionsPageSize, setPromotionsPageSize] = useState(10);

    const load = async () => {
        setLoading(true);
        const [nextPromotions, nextBrands, nextCategories, nextProducts] = await Promise.all([
            fetchAdminPromotions(),
            fetchAdminBrands(),
            fetchAdminCategories(),
            fetchAdminProducts(),
        ]);
        setPromotions(nextPromotions);
        setBrands(nextBrands);
        setCategories(nextCategories);
        setProducts(nextProducts);
        setLoading(false);
    };

    useEffect(() => {
        load().catch((err) => {
            setError(err instanceof Error ? err.message : "Chargement impossible");
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    useEffect(() => setPromotionsPage(1), [promotions.length, promotionsPageSize]);
    const safePromotionsPage = Math.min(promotionsPage, Math.max(1, Math.ceil(promotions.length / promotionsPageSize)));
    const paginatedPromotions = promotions.slice((safePromotionsPage - 1) * promotionsPageSize, safePromotionsPage * promotionsPageSize);

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products.slice(0, 80);
        return products.filter((product) => product.name.toLowerCase().includes(q) || product.reference?.toLowerCase().includes(q)).slice(0, 80);
    }, [products, search]);

    const toggleId = (key: "brandIds" | "categoryIds" | "productIds", id: number) => {
        setForm((current) => {
            const exists = current[key].includes(id);
            if (key === "categoryIds" && exists) {
                const descendantIds = new Set<number>([id]);
                const collectChildren = (parentId: number) => {
                    categories.filter((category) => category.parentId === parentId).forEach((child) => {
                        descendantIds.add(child.id);
                        collectChildren(child.id);
                    });
                };
                collectChildren(id);
                return { ...current, [key]: current[key].filter((value) => !descendantIds.has(value)) };
            }
            return { ...current, [key]: [...current[key], id] };
        });
        setPreview(null);
    };

    const resetForm = () => {
        setForm(emptyPayload);
        setEditingId(null);
        setStep(1);
        setPreview(null);
        setError("");
        setTargetMode("filters");
    };

    const startCreate = () => {
        resetForm();
        setShowForm(true);
        requestAnimationFrame(() => document.getElementById("promotion-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const closeForm = () => {
        resetForm();
        setShowForm(false);
    };

    const editPromotion = (promotion: AdminPromotion) => {
        setEditingId(promotion.id);
        setForm({
            name: promotion.name,
            percentage: promotion.percentage,
            active: promotion.active,
            startsAt: toDateInput(promotion.startsAt),
            endsAt: toDateInput(promotion.endsAt),
            priority: promotion.priority,
            brandIds: promotion.brandIds,
            categoryIds: promotion.categoryIds,
            productIds: promotion.productIds,
        });
        setStep(1);
        setPreview(null);
        setTargetMode(promotion.productIds.length ? "products" : "filters");
        setShowForm(true);
        requestAnimationFrame(() => document.getElementById("promotion-form")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };

    const validateTargetSelection = () => {
        const invalidParent = form.categoryIds.find((categoryId) => {
            const category = categories.find((item) => item.id === categoryId);
            const children = categories.filter((item) => item.parentId === categoryId);
            return category?.productCount === 0 && children.length > 0 && !children.some((child) => form.categoryIds.includes(child.id));
        });
        if (targetMode === "filters" && invalidParent) {
            setError("Sélectionnez au moins une sous-catégorie : cette catégorie ne contient pas de produits directs.");
            return false;
        }
        return true;
    };

    const showPreview = async () => {
        setError("");
        if (!validateTargetSelection()) return;
        try {
            const nextPreview = await previewAdminPromotion(form);
            setPreview(nextPreview);
            setStep(3);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Aperçu impossible");
        }
    };

    const savePromotion = async () => {
        setError("");
        if (!validateTargetSelection()) return;
        try {
            const result = editingId ? await updateAdminPromotion(editingId, form) : await createAdminPromotion(form);
            if (!result.success) throw new Error(result.error || "Enregistrement impossible");
            const message = editingId ? "Promotion modifiée avec succès." : "Promotion ajoutée avec succès.";
            resetForm();
            setShowForm(false);
            toast.success(message);
            await load();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Enregistrement impossible";
            setError(message);
        }
    };

    const removePromotion = async (promotion: AdminPromotion) => {
        setConfirmDialog({
            title: "Supprimer cette promotion ?",
            description: "Les produits concernés retrouveront automatiquement leur prix normal. Aucune fiche produit ne sera supprimée.",
            confirmLabel: "Supprimer la promotion",
            tone: "danger",
            onConfirm: async () => {
                try {
                    const result = await deleteAdminPromotion(promotion.id);
                    if (!result.success) throw new Error(result.error || "Suppression impossible");
                    toast.success("Promotion supprimée avec succès.");
                    await load();
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Suppression impossible";
                    setError(message);
                }
            },
        });
    };

    const changeActive = async (promotion: AdminPromotion) => {
        const nextActive = !promotion.active;
        setConfirmDialog({
            title: `${nextActive ? "Activer" : "Désactiver"} cette promotion ?`,
            description: nextActive
                ? "La promotion sera de nouveau appliquée aux produits correspondants, selon les dates et la priorité définies."
                : "La promotion restera enregistrée mais ne sera plus appliquée au catalogue.",
            confirmLabel: nextActive ? "Activer la promotion" : "Désactiver la promotion",
            tone: "warning",
            onConfirm: async () => {
                try {
                    const result = await updateAdminPromotion(promotion.id, { ...formFromPromotion(promotion), active: nextActive });
                    if (!result.success) throw new Error(result.error || "Mise à jour impossible");
                    toast.success(nextActive ? "Promotion activée avec succès." : "Promotion désactivée avec succès.");
                    await load();
                } catch (err) {
                    const message = err instanceof Error ? err.message : "Mise à jour impossible";
                    setError(message);
                }
            },
        });
    };

    const selectedTargets = form.brandIds.length + form.categoryIds.length + form.productIds.length;
    const rootCategories = categories.filter((category) => !category.parentId || !categories.some((item) => item.id === category.parentId));
    const childrenOf = (categoryId: number) => categories.filter((category) => category.parentId === categoryId);
    const changeTargetMode = (mode: TargetMode) => {
        setTargetMode(mode);
        setPreview(null);
        setError("");
        setForm((current) => mode === "products"
            ? { ...current, brandIds: [], categoryIds: [] }
            : { ...current, productIds: [] });
    };

    const requestSavePromotion = () => {
        if (!editingId) {
            void savePromotion();
            return;
        }
        if (!validateTargetSelection()) return;
        setConfirmDialog({
            title: "Enregistrer les modifications ?",
            description: "Les changements apportés à cette promotion seront appliqués au catalogue selon ses règles de ciblage.",
            confirmLabel: "Enregistrer",
            tone: "info",
            onConfirm: savePromotion,
        });
    };
    const renderCategoryTarget = (category: AdminCategory) => {
        const children = childrenOf(category.id);
        const selected = form.categoryIds.includes(category.id);
        const hasSelectedDescendant = (parentId: number): boolean => childrenOf(parentId).some((child) => form.categoryIds.includes(child.id) || hasSelectedDescendant(child.id));
        const expanded = selected || hasSelectedDescendant(category.id);
        return (
            <div key={category.id}>
                <button type="button" onClick={() => toggleId("categoryIds", category.id)} className={chipClass(selected)}>{category.name}</button>
                {expanded && children.length > 0 && <div className="mt-2 border-l-2 border-sky-100 pl-3">
                    <p className="mb-2 text-xs text-gray-500">{category.productCount === 0 ? "Choisissez au moins une sous-catégorie : aucun produit direct." : "Sous-catégories (facultatif si la catégorie contient des produits directs)"}</p>
                    <div className="flex flex-wrap gap-2">{children.map(renderCategoryTarget)}</div>
                </div>}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-5 p-6 text-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-black text-gray-950">Promotions</h1>
                    <p className="mt-2 text-sm text-gray-500">Crée des remises dynamiques sans modifier les prix de base des produits.</p>
                </div>
                <button onClick={startCreate} className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800">
                    <PlusCircle className="h-4 w-4" /> Nouvelle promotion
                </button>
            </div>


            <section className="order-2 overflow-hidden border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                    <h2 className="text-sm font-bold text-gray-900">Promotions enregistrées</h2>
                </div>
                <div className="divide-y divide-gray-100">
                    {loading ? (
                        <p className="p-4 text-sm text-gray-500">Chargement...</p>
                    ) : promotions.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Aucune promotion enregistrée.</p>
                    ) : (
                        paginatedPromotions.map((promotion) => (
                            <div key={promotion.id} className="grid gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 lg:grid-cols-[1fr_auto]">
                                <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">-{promotion.percentage}%</span>
                                        <h3 className="text-sm font-black text-gray-950">{promotion.name}</h3>
                                        <button
                                            onClick={() => changeActive(promotion)}
                                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                                promotion.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            {promotion.active ? "Active" : "Inactive"}
                                        </button>
                                    </div>
                                    <p className="text-xs font-medium text-gray-700">{targetText(promotion)}</p>
                                    <p className="text-[11px] text-gray-500">
                                        Priorité {promotion.priority} | {promotion.productCount} produit(s) | {promotion.variantCount} variante(s)
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => editPromotion(promotion)} className="inline-flex h-8 w-8 items-center justify-center border border-gray-300 bg-white text-gray-900 hover:bg-gray-50" title="Modifier">
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => removePromotion(promotion)} className="inline-flex h-8 w-8 items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" title="Supprimer">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {!loading && promotions.length > 0 && <AdminTablePagination page={safePromotionsPage} pageSize={promotionsPageSize} totalItems={promotions.length} onPageChange={setPromotionsPage} onPageSizeChange={(pageSize) => { setPromotionsPageSize(pageSize); setPromotionsPage(1); }} />}
            </section>

            {showForm && <section id="promotion-form" className="order-1 border border-gray-200 bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <BadgePercent className="h-5 w-5 text-gray-700" />
                        <h2 className="text-lg font-bold text-gray-900">{editingId ? "Modifier la promotion" : "Ajouter une promotion"}</h2>
                    </div>
                    <button type="button" onClick={closeForm} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50" title="Fermer" aria-label="Fermer le formulaire">
                        <X className="h-4 w-4" /> Fermer
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-5 py-3">
                    {[1, 2, 3].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => item === 3 && !preview ? showPreview() : setStep(item)}
                            disabled={!editingId && item === 3 && !preview}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                step === item ? "bg-black text-white" : "bg-gray-100 text-gray-700 disabled:opacity-40"
                            }`}
                        >
                            {item === 1 ? "1. Détails" : item === 2 ? "2. Cible" : "3. Aperçu"}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {step === 1 && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <label className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Nom</span>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black" placeholder="Ex: Soldes valises rigides" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Pourcentage</span>
                                <input type="number" min={1} max={99} value={form.percentage} onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Début</span>
                                <input type="date" value={toDateInput(form.startsAt)} onChange={(e) => setForm({ ...form, startsAt: e.target.value || null })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Fin</span>
                                <input type="date" value={toDateInput(form.endsAt)} onChange={(e) => setForm({ ...form, endsAt: e.target.value || null })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black" />
                            </label>
                            <label className="space-y-1">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Priorité</span>
                                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black" />
                            </label>
                            <label className="flex items-center gap-3 pt-6 text-sm font-bold text-gray-900">
                                <span className="relative inline-flex h-6 w-11 items-center">
                                    <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="peer sr-only" />
                                    <span className="h-6 w-11 rounded-full bg-gray-300 transition-colors peer-checked:bg-emerald-500" />
                                    <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                                </span>
                                Promotion active
                            </label>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                                {selectedTargets === 0 ? "Aucune cible sélectionnée: la promotion s'appliquera à tous les produits." : `${selectedTargets} cible(s) sélectionnée(s).`}
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={() => changeTargetMode("filters")} className={`border p-4 text-left ${targetMode === "filters" ? "border-sky-500 bg-sky-50" : "border-gray-200 bg-white"}`}>
                                    <p className="text-sm font-bold">Ensemble de produits</p>
                                    <p className="mt-1 text-xs text-gray-600">Cibler par marques et/ou catégories.</p>
                                </button>
                                <button type="button" onClick={() => changeTargetMode("products")} className={`border p-4 text-left ${targetMode === "products" ? "border-sky-500 bg-sky-50" : "border-gray-200 bg-white"}`}>
                                    <p className="text-sm font-bold">Produits spécifiques</p>
                                    <p className="mt-1 text-xs text-gray-600">Choisir une liste précise de produits.</p>
                                </button>
                            </div>

                            {targetMode === "filters" ? <>
                                <div>
                                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">Marques</h3>
                                    <p className="mb-2 text-xs text-gray-500">Sans catégorie, tous les produits des marques sélectionnées sont concernés.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {brands.map((brand) => (
                                            <button key={brand.id} type="button" onClick={() => toggleId("brandIds", brand.id)} className={chipClass(form.brandIds.includes(brand.id))}>{brand.name}</button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">Catégories</h3>
                                    <p className="mb-3 text-xs text-gray-500">Avec une marque, seuls les produits correspondant aussi aux catégories choisies sont concernés.</p>
                                    <div className="space-y-3 border border-gray-100 p-3">
                                        {rootCategories.map(renderCategoryTarget)}
                                    </div>
                                </div>
                            </> : <div>
                                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-600">Produits spécifiques</h3>
                                <p className="mb-3 text-xs text-gray-500">Les marques et catégories ne sont pas utilisées dans ce mode.</p>
                                <input value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 w-full border border-gray-300 px-3 py-2 text-sm font-medium focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10" placeholder="Rechercher un produit..." />
                                <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
                                    {filteredProducts.map((product) => (
                                        <button key={product.id} type="button" onClick={() => toggleId("productIds", product.id)} className={`${chipClass(form.productIds.includes(product.id))} text-left`}>{product.name}</button>
                                    ))}
                                </div>
                            </div>}
                        </div>
                    )}

                    {step === 3 && preview && (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="border border-gray-200 p-4">
                                    <p className="text-2xl font-bold text-gray-900">{preview.productCount}</p>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Produits concernés</p>
                                </div>
                                <div className="border border-gray-200 p-4">
                                    <p className="text-2xl font-bold text-gray-900">{preview.variantCount}</p>
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Variantes concernées</p>
                                </div>
                                <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                                    Les prix ne sont pas modifiés en base. La remise est calculée à l'affichage et au checkout.
                                </div>
                            </div>
                            <div className="max-h-80 overflow-auto border border-gray-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                                        <tr>
                                            <th className="p-3">Produit</th>
                                            <th className="p-3">Marque</th>
                                            <th className="p-3">Catégories</th>
                                            <th className="p-3">Prix original</th>
                                            <th className="p-3">Prix promo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {preview.products.map((product) => (
                                            <tr key={product.id}>
                                                <td className="p-3 font-bold">{product.name}</td>
                                                <td className="p-3">{product.brandName}</td>
                                                <td className="p-3">{product.categoryNames.join(", ") || "-"}</td>
                                                <td className="p-3 text-gray-500 line-through">{formatTnd(product.originalPrice)}</td>
                                                <td className="p-3 font-bold text-red-600">{formatTnd(product.promotionPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-gray-200 pt-4">
                        <button onClick={() => setStep(Math.max(1, step - 1))} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50" disabled={step === 1}>
                            Retour
                        </button>
                        <div className="flex gap-2">
                            <button onClick={closeForm} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
                                <X className="h-4 w-4" /> Annuler
                            </button>
                            {step < 2 && (
                                <button onClick={() => setStep(2)} className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                                    Continuer
                                </button>
                            )}
                            {step === 2 && (
                                <button onClick={editingId ? requestSavePromotion : showPreview} className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                                    {editingId ? <Check className="h-4 w-4" /> : <Percent className="h-4 w-4" />} {editingId ? "Enregistrer les modifications" : "Voir l'aperçu"}
                            </button>
                            )}
                            {step === 3 && (
                                <button onClick={editingId ? requestSavePromotion : savePromotion} className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                                    <Check className="h-4 w-4" /> {editingId ? "Enregistrer les modifications" : "Confirmer la promotion"}
                                </button>
                            )}
                            {editingId && step === 1 && (
                                <button onClick={requestSavePromotion} className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                                    <Check className="h-4 w-4" /> Enregistrer les modifications
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>}

            {confirmDialog && (
                <ConfirmationModal
                    title={confirmDialog.title}
                    description={confirmDialog.description}
                    confirmLabel={confirmDialog.confirmLabel}
                    tone={confirmDialog.tone}
                    onCancel={() => setConfirmDialog(null)}
                    onConfirm={async () => {
                        await confirmDialog.onConfirm();
                        setConfirmDialog(null);
                    }}
                />
            )}
        </div>
    );
};

const ConfirmationModal = ({
    title,
    description,
    confirmLabel,
    tone,
    onCancel,
    onConfirm,
}: {
    title: string;
    description: string;
    confirmLabel: string;
    tone: "danger" | "warning" | "info";
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}) => {
    const [submitting, setSubmitting] = useState(false);
    const toneStyles = {
        danger: { icon: "bg-red-50 text-red-600", confirm: "bg-red-600 hover:bg-red-700" },
        warning: { icon: "bg-amber-50 text-amber-700", confirm: "bg-amber-600 hover:bg-amber-700" },
        info: { icon: "bg-blue-50 text-blue-700", confirm: "bg-blue-600 hover:bg-blue-700" },
    }[tone];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
            <div className="w-full max-w-[390px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
                <div className="px-5 pb-4 pt-5">
                    <div className="flex items-start gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneStyles.icon}`}><AlertTriangle className="h-4 w-4" /></span>
                        <div className="min-w-0 pr-2">
                            <h3 className="text-sm font-bold leading-5 text-slate-900">{title}</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="min-w-24 border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:bg-neutral-50 disabled:opacity-60"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={async () => {
                            setSubmitting(true);
                            try {
                                await onConfirm();
                            } finally {
                                setSubmitting(false);
                            }
                        }}
                        className={`min-w-24 px-4 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-60 ${toneStyles.confirm}`}
                    >
                        {submitting ? "Traitement..." : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const formFromPromotion = (promotion: AdminPromotion): AdminPromotionPayload => ({
    name: promotion.name,
    percentage: promotion.percentage,
    active: promotion.active,
    startsAt: toDateInput(promotion.startsAt) || null,
    endsAt: toDateInput(promotion.endsAt) || null,
    priority: promotion.priority,
    brandIds: promotion.brandIds,
    categoryIds: promotion.categoryIds,
    productIds: promotion.productIds,
});

export default AdminPromotions;

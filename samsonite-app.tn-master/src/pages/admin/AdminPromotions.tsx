import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Edit2, Eye, Percent, Plus, Trash2, X } from "lucide-react";
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

const AdminPromotions = () => {
    const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [form, setForm] = useState<AdminPromotionPayload>(emptyPayload);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [step, setStep] = useState(1);
    const [preview, setPreview] = useState<AdminPromotionPreview | null>(null);
    const [search, setSearch] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string;
        description: string;
        confirmLabel: string;
        tone: "danger" | "warning";
        onConfirm: () => Promise<void>;
    } | null>(null);
    const [loading, setLoading] = useState(true);

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

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return products.slice(0, 80);
        return products.filter((product) => product.name.toLowerCase().includes(q) || product.reference?.toLowerCase().includes(q)).slice(0, 80);
    }, [products, search]);

    const toggleId = (key: "brandIds" | "categoryIds" | "productIds", id: number) => {
        setForm((current) => {
            const exists = current[key].includes(id);
            return { ...current, [key]: exists ? current[key].filter((value) => value !== id) : [...current[key], id] };
        });
        setPreview(null);
    };

    const resetForm = () => {
        setForm(emptyPayload);
        setEditingId(null);
        setStep(1);
        setPreview(null);
        setError("");
        setSuccess("");
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
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const showPreview = async () => {
        setError("");
        setSuccess("");
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
        setSuccess("");
        try {
            const result = editingId ? await updateAdminPromotion(editingId, form) : await createAdminPromotion(form);
            if (!result.success) throw new Error(result.error || "Enregistrement impossible");
            const message = editingId ? "Promotion modifiée avec succès." : "Promotion ajoutée avec succès.";
            resetForm();
            setSuccess(message);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Enregistrement impossible");
        }
    };

    const removePromotion = async (promotion: AdminPromotion) => {
        setConfirmDialog({
            title: "Supprimer cette promotion ?",
            description: "Les produits concernés retrouveront automatiquement leur prix normal. Aucune fiche produit ne sera supprimée.",
            confirmLabel: "Supprimer la promotion",
            tone: "danger",
            onConfirm: async () => {
                const result = await deleteAdminPromotion(promotion.id);
                if (!result.success) {
                    setError(result.error || "Suppression impossible");
                    return;
                }
                setSuccess("Promotion supprimée avec succès.");
                await load();
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
                await updateAdminPromotion(promotion.id, { ...formFromPromotion(promotion), active: nextActive });
                setSuccess(nextActive ? "Promotion activée avec succès." : "Promotion désactivée avec succès.");
                await load();
            },
        });
    };

    const selectedTargets = form.brandIds.length + form.categoryIds.length + form.productIds.length;

    return (
        <div className="space-y-5 p-6 text-slate-950">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Promotions</h1>
                    <p className="mt-1 text-sm text-slate-600">Crée des remises dynamiques sans modifier les prix de base des produits.</p>
                </div>
                <button onClick={resetForm} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-black">
                    <Plus className="h-4 w-4" /> Nouvelle promotion
                </button>
            </div>

            {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
            {success && (
                <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                </div>
            )}

            <section className="border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-black uppercase tracking-wide">Promotions enregistrées</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {loading ? (
                        <p className="p-4 text-sm text-slate-500">Chargement...</p>
                    ) : promotions.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">Aucune promotion enregistrée.</p>
                    ) : (
                        promotions.map((promotion) => (
                            <div key={promotion.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-black text-red-700">-{promotion.percentage}%</span>
                                        <h3 className="font-black">{promotion.name}</h3>
                                        <button
                                            onClick={() => changeActive(promotion)}
                                            className={`rounded-full px-3 py-1 text-xs font-black ${
                                                promotion.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {promotion.active ? "Active" : "Inactive"}
                                        </button>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">{targetText(promotion)}</p>
                                    <p className="text-xs text-slate-500">
                                        Priorité {promotion.priority} | {promotion.productCount} produit(s) | {promotion.variantCount} variante(s)
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => editPromotion(promotion)} className="border border-slate-300 bg-white p-2" title="Modifier">
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => removePromotion(promotion)} className="border border-red-200 bg-red-50 p-2 text-red-600" title="Supprimer">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
                    {[1, 2, 3, 4].map((item) => (
                        <button
                            key={item}
                            onClick={() => setStep(item)}
                            disabled={item > 2 && !preview}
                            className={`rounded-full px-3 py-1.5 text-xs font-black ${
                                step === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700 disabled:opacity-40"
                            }`}
                        >
                            {item === 1 ? "1. Détails" : item === 2 ? "2. Cible" : item === 3 ? "3. Aperçu" : "4. Confirmation"}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {step === 1 && (
                        <div className="grid gap-4 lg:grid-cols-2">
                            <label className="space-y-1 text-sm font-black">
                                Nom
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 px-3 py-2 font-semibold" placeholder="Ex: Soldes valises rigides" />
                            </label>
                            <label className="space-y-1 text-sm font-black">
                                Pourcentage
                                <input type="number" min={1} max={99} value={form.percentage} onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })} className="w-full border border-slate-300 px-3 py-2 font-semibold" />
                            </label>
                            <label className="space-y-1 text-sm font-black">
                                Début
                                <input type="date" value={toDateInput(form.startsAt)} onChange={(e) => setForm({ ...form, startsAt: e.target.value || null })} className="w-full border border-slate-300 px-3 py-2 font-semibold" />
                            </label>
                            <label className="space-y-1 text-sm font-black">
                                Fin
                                <input type="date" value={toDateInput(form.endsAt)} onChange={(e) => setForm({ ...form, endsAt: e.target.value || null })} className="w-full border border-slate-300 px-3 py-2 font-semibold" />
                            </label>
                            <label className="space-y-1 text-sm font-black">
                                Priorité
                                <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="w-full border border-slate-300 px-3 py-2 font-semibold" />
                            </label>
                            <label className="flex items-center gap-3 pt-6 text-sm font-black">
                                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                Promotion active
                            </label>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5">
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-900">
                                {selectedTargets === 0 ? "Aucune cible sélectionnée: la promotion s'appliquera à tous les produits." : `${selectedTargets} cible(s) sélectionnée(s).`}
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-black uppercase">Marques</h3>
                                <div className="flex flex-wrap gap-2">
                                    {brands.map((brand) => (
                                        <button key={brand.id} onClick={() => toggleId("brandIds", brand.id)} className={chipClass(form.brandIds.includes(brand.id))}>
                                            {brand.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-black uppercase">Catégories</h3>
                                <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto border border-slate-100 p-3">
                                    {categories.map((category) => (
                                        <button key={category.id} onClick={() => toggleId("categoryIds", category.id)} className={chipClass(form.categoryIds.includes(category.id))}>
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="mb-2 text-sm font-black uppercase">Produits spécifiques</h3>
                                <input value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3 w-full border border-slate-300 px-3 py-2 text-sm font-semibold" placeholder="Rechercher un produit..." />
                                <div className="grid max-h-64 gap-2 overflow-y-auto md:grid-cols-2">
                                    {filteredProducts.map((product) => (
                                        <button key={product.id} onClick={() => toggleId("productIds", product.id)} className={`${chipClass(form.productIds.includes(product.id))} text-left`}>
                                            {product.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && preview && (
                        <div className="space-y-4">
                            <div className="grid gap-3 md:grid-cols-3">
                                <div className="border border-slate-200 p-4">
                                    <p className="text-2xl font-black">{preview.productCount}</p>
                                    <p className="text-xs font-black uppercase text-slate-500">Produits concernés</p>
                                </div>
                                <div className="border border-slate-200 p-4">
                                    <p className="text-2xl font-black">{preview.variantCount}</p>
                                    <p className="text-xs font-black uppercase text-slate-500">Variantes concernées</p>
                                </div>
                                <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                                    Les prix ne sont pas modifiés en base. La remise est calculée à l'affichage et au checkout.
                                </div>
                            </div>
                            <div className="max-h-80 overflow-auto border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="p-3">Produit</th>
                                            <th className="p-3">Marque</th>
                                            <th className="p-3">Catégories</th>
                                            <th className="p-3">Prix original</th>
                                            <th className="p-3">Prix promo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.products.map((product) => (
                                            <tr key={product.id}>
                                                <td className="p-3 font-bold">{product.name}</td>
                                                <td className="p-3">{product.brandName}</td>
                                                <td className="p-3">{product.categoryNames.join(", ") || "-"}</td>
                                                <td className="p-3 text-slate-500 line-through">{formatTnd(product.originalPrice)}</td>
                                                <td className="p-3 font-black text-red-600">{formatTnd(product.promotionPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4">
                            <div className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-4">
                                <Eye className="mt-1 h-5 w-5" />
                                <div>
                                    <h3 className="font-black">Dernière validation</h3>
                                    <p className="text-sm text-slate-600">
                                        La promotion sera enregistrée comme règle dynamique. Les nouveaux produits correspondant aux cibles recevront automatiquement la remise.
                                    </p>
                                </div>
                            </div>
                            <button onClick={savePromotion} className="inline-flex items-center gap-2 bg-black px-5 py-3 text-sm font-black text-white">
                                <Check className="h-4 w-4" /> Confirmer la promotion
                            </button>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
                        <button onClick={() => setStep(Math.max(1, step - 1))} className="border border-slate-300 px-4 py-2 text-sm font-black" disabled={step === 1}>
                            Retour
                        </button>
                        <div className="flex gap-2">
                            <button onClick={resetForm} className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-sm font-black">
                                <X className="h-4 w-4" /> Annuler
                            </button>
                            {step < 2 && (
                                <button onClick={() => setStep(2)} className="bg-black px-4 py-2 text-sm font-black text-white">
                                    Continuer
                                </button>
                            )}
                            {step === 2 && (
                                <button onClick={showPreview} className="inline-flex items-center gap-2 bg-black px-4 py-2 text-sm font-black text-white">
                                    <Percent className="h-4 w-4" /> Voir l'aperçu
                                </button>
                            )}
                            {step === 3 && (
                                <button onClick={() => setStep(4)} className="bg-black px-4 py-2 text-sm font-black text-white">
                                    Continuer vers confirmation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

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
    tone: "danger" | "warning";
    onCancel: () => void;
    onConfirm: () => Promise<void>;
}) => {
    const [submitting, setSubmitting] = useState(false);
    const isDanger = tone === "danger";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
            <div className="w-full max-w-lg border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start gap-4 border-b border-slate-100 p-6">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                            isDanger ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                        }`}
                    >
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-black text-slate-950">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Fermer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex flex-wrap justify-end gap-3 bg-slate-50 p-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="border border-slate-300 bg-white px-5 py-2.5 text-sm font-black text-slate-800 transition-colors hover:bg-slate-100"
                    >
                        Garder
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
                        className={`px-5 py-2.5 text-sm font-black text-white transition-colors disabled:opacity-60 ${
                            isDanger ? "bg-red-600 hover:bg-red-700" : "bg-slate-950 hover:bg-slate-800"
                        }`}
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

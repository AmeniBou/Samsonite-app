import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Trash2,
    Pencil,
    PlusCircle,
    Search,
    RefreshCw,
    Eye,
    EyeOff,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Filter,
    Package,
} from "lucide-react";
import {
    fetchAdminProducts,
    deleteProduct,
    updateProduct,
    type AdminProduct,
} from "@/lib/admin-api";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import { AdminActiveFilter, adminFilterControlClass, adminFilterLabelClass } from "@/components/admin/AdminFilters";
import { toast } from "@/components/ui/sonner";
import { AppSelect } from "@/components/ui/app-select";

type SortKey = "id" | "name" | "reference" | "price" | "stock" | "categoryName" | "active";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";
type StockFilter = "all" | "available" | "out" | "low";
type VariantFilter = "all" | "with" | "without";
type ImageFilter = "all" | "with" | "without";

const decodeAdminText = (value?: string | null): string => {
    let text = value || "";
    const textarea = document.createElement("textarea");

    for (let index = 0; index < 2; index += 1) {
        textarea.innerHTML = text;
        text = textarea.value;
    }

    for (let index = 0; index < 2 && /Ã|Â|â/.test(text); index += 1) {
        try {
            const bytes = Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
            const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
            if (decoded && decoded !== text) text = decoded;
        } catch {
            break;
        }
    }

    return text;
};

const getAdminProductImageSrc = (product: AdminProduct): string | null => {
    return product.imageUrl || product.images?.[0] || null;
};

const AdminDashboard = () => {
    const [products, setProducts] = useState<AdminProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const [sortKey, setSortKey] = useState<SortKey>("id");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [statusFilterOpen, setStatusFilterOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [brandFilter, setBrandFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [stockFilter, setStockFilter] = useState<StockFilter>("all");
    const [variantFilter, setVariantFilter] = useState<VariantFilter>("all");
    const [imageFilter, setImageFilter] = useState<ImageFilter>("all");
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const loadProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await fetchAdminProducts();
            setProducts(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const handleDelete = async (product: AdminProduct) => {

        setDeletingId(product.id);
        try {
            const result = await deleteProduct(product.id);
            if (result.success) {
                setProducts((prev) => prev.filter((p) => p.id !== product.id));
            } else {
                alert(`Erreur: ${result.error}`);
            }
        } catch {
            alert("Erreur de suppression");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleActive = async (product: AdminProduct) => {
        setTogglingId(product.id);
        try {
            const result = await updateProduct(product.id, { active: !product.active });
            if (result.success) {
                setProducts((prev) =>
                    prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p))
                );
                toast.success(`Produit « ${decodeAdminText(product.name)} » ${product.active ? "désactivé" : "activé"} avec succès.`);
            } else {
                toast.error(result.error || "Impossible de modifier le statut du produit.");
            }
        } catch {
            toast.error("Impossible de modifier le statut du produit.");
        } finally {
            setTogglingId(null);
        }
    };

    const brandOptions = Array.from(
        new Set(products.map((product) => decodeAdminText(product.brandName || "Sans marque")).filter(Boolean))
    ).sort((first, second) => first.localeCompare(second, "fr", { sensitivity: "base" }));

    const categoryOptions = Array.from(
        new Set(products.map((product) => decodeAdminText(product.categoryName || "Sans catégorie")).filter(Boolean))
    ).sort((first, second) => first.localeCompare(second, "fr", { sensitivity: "base" }));

    const minPriceValue = minPrice.trim() ? Number(minPrice) : null;
    const maxPriceValue = maxPrice.trim() ? Number(maxPrice) : null;

    const filteredBySearch = products.filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            decodeAdminText(p.name).toLowerCase().includes(q) ||
            p.reference.toLowerCase().includes(q) ||
            decodeAdminText(p.brandName).toLowerCase().includes(q) ||
            decodeAdminText(p.categoryName).toLowerCase().includes(q) ||
            String(p.id).includes(q)
        );
    });

    const filtered = filteredBySearch.filter((p) => {
        const productBrand = decodeAdminText(p.brandName || "Sans marque");
        const productCategory = decodeAdminText(p.categoryName || "Sans catégorie");
        const hasImage = Boolean(getAdminProductImageSrc(p));

        if (statusFilter === "active" && !p.active) return false;
        if (statusFilter === "inactive" && p.active) return false;
        if (brandFilter !== "all" && productBrand !== brandFilter) return false;
        if (categoryFilter !== "all" && productCategory !== categoryFilter) return false;
        if (stockFilter === "available" && p.stock <= 0) return false;
        if (stockFilter === "out" && p.stock > 0) return false;
        if (stockFilter === "low" && (p.stock <= 0 || p.stock > 5)) return false;
        if (variantFilter === "with" && !p.hasVariants) return false;
        if (variantFilter === "without" && p.hasVariants) return false;
        if (imageFilter === "with" && !hasImage) return false;
        if (imageFilter === "without" && hasImage) return false;
        if (minPriceValue !== null && Number.isFinite(minPriceValue) && p.price < minPriceValue) return false;
        if (maxPriceValue !== null && Number.isFinite(maxPriceValue) && p.price > maxPriceValue) return false;
        return true;
    });

    const activeFilterCount = [
        statusFilter !== "all",
        brandFilter !== "all",
        categoryFilter !== "all",
        stockFilter !== "all",
        variantFilter !== "all",
        imageFilter !== "all",
        minPrice.trim(),
        maxPrice.trim(),
    ].filter(Boolean).length;

    const hasActiveFilters = activeFilterCount > 0 || Boolean(search.trim());

    const resetFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setBrandFilter("all");
        setCategoryFilter("all");
        setStockFilter("all");
        setVariantFilter("all");
        setImageFilter("all");
        setMinPrice("");
        setMaxPrice("");
    };

    const sorted = [...filtered].sort((a, b) => {
        const factor = sortDirection === "asc" ? 1 : -1;

        if (sortKey === "id") return (a.id - b.id) * factor;
        if (sortKey === "price") return (a.price - b.price) * factor;
        if (sortKey === "stock") return (a.stock - b.stock) * factor;
        if (sortKey === "active") return (Number(a.active) - Number(b.active)) * factor;

        if (sortKey === "name") return decodeAdminText(a.name).localeCompare(decodeAdminText(b.name), "fr", { sensitivity: "base" }) * factor;
        if (sortKey === "reference") return a.reference.localeCompare(b.reference, "fr", { sensitivity: "base" }) * factor;
        return decodeAdminText(a.categoryName).localeCompare(decodeAdminText(b.categoryName), "fr", { sensitivity: "base" }) * factor;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        statusFilter,
        brandFilter,
        categoryFilter,
        stockFilter,
        variantFilter,
        imageFilter,
        minPrice,
        maxPrice,
        sortKey,
        sortDirection,
        itemsPerPage,
    ]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * itemsPerPage;
    const pageItems = sorted.slice(pageStart, pageStart + itemsPerPage);

    const startIndex = sorted.length === 0 ? 0 : pageStart + 1;
    const endIndex = Math.min(pageStart + pageItems.length, sorted.length);


    const activeCount = products.filter((p) => p.active).length;

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDirection("asc");
    };

    const sortIcon = (key: SortKey) => {
        if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
        return sortDirection === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-700" />
        ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-700" />
        );
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-950">Produits</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {products.length} produits • {activeCount} actifs
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadProducts}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Rafraîchir
                    </button>
                    <Link
                        to="/admin/produits/nouveau"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold text-white transition-colors hover:bg-gray-800"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nouveau produit
                    </Link>
                </div>
            </div>

            <div className="mb-5 rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white">
                            <Filter className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-gray-950">Filtres du catalogue</h2>
                            <p className="text-xs text-gray-500">
                                {sorted.length} résultat{sorted.length !== 1 ? "s" : ""} sur {products.length} produit{products.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((prev) => !prev)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-gray-950 px-3 text-xs font-bold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-950/20"
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
                            className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 px-3 text-xs font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-950/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Réinitialiser
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <label className={adminFilterLabelClass}>
                        Recherche globale
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="search"
                            aria-label="Rechercher dans les produits"
                            placeholder="Nom, référence, marque, catégorie ou ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-10 pr-4 text-sm font-medium text-gray-900 shadow-sm transition-colors placeholder:font-normal placeholder:text-gray-400 hover:border-gray-400 hover:bg-white focus:border-gray-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-950/10"
                        />
                    </div>
                    </label>

                    {filtersOpen && (
                        <>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <label className={adminFilterLabelClass}>
                            Marque
                            <AppSelect
                                value={brandFilter}
                                onChange={(e) => setBrandFilter(e.target.value)}
                                className={adminFilterControlClass}
                            >
                                <option value="all">Toutes les marques</option>
                                {brandOptions.map((brand) => (
                                    <option key={brand} value={brand}>{brand}</option>
                                ))}
                            </AppSelect>
                        </label>

                        <label className={adminFilterLabelClass}>
                            Catégorie
                            <AppSelect
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={adminFilterControlClass}
                            >
                                <option value="all">Toutes les catégories</option>
                                {categoryOptions.map((category) => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </AppSelect>
                        </label>

                        <label className={adminFilterLabelClass}>
                            Stock
                            <AppSelect
                                value={stockFilter}
                                onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                                className={adminFilterControlClass}
                            >
                                <option value="all">Tous les stocks</option>
                                <option value="available">Disponible</option>
                                <option value="low">Stock faible (1 à 5)</option>
                                <option value="out">Rupture de stock</option>
                            </AppSelect>
                        </label>

                        <label className={adminFilterLabelClass}>
                            Variantes
                            <AppSelect
                                value={variantFilter}
                                onChange={(e) => setVariantFilter(e.target.value as VariantFilter)}
                                className={adminFilterControlClass}
                            >
                                <option value="all">Tous les produits</option>
                                <option value="with">Avec variantes</option>
                                <option value="without">Sans variantes</option>
                            </AppSelect>
                        </label>

                        <label className={adminFilterLabelClass}>
                            Images
                            <AppSelect
                                value={imageFilter}
                                onChange={(e) => setImageFilter(e.target.value as ImageFilter)}
                                className={adminFilterControlClass}
                            >
                                <option value="all">Tous</option>
                                <option value="with">Avec image</option>
                                <option value="without">Sans image</option>
                            </AppSelect>
                        </label>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:max-w-[372px]">
                        <label className={adminFilterLabelClass}>
                            Prix min
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="0.000"
                                className={adminFilterControlClass}
                            />
                        </label>

                        <label className={adminFilterLabelClass}>
                            Prix max
                            <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="9999.000"
                                className={adminFilterControlClass}
                            />
                        </label>

                    </div>
                        </>
                    )}
                    {(statusFilter !== "all" || brandFilter !== "all" || categoryFilter !== "all" || stockFilter !== "all" || variantFilter !== "all" || imageFilter !== "all" || minPrice.trim() || maxPrice.trim()) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
                        {statusFilter !== "all" && <AdminActiveFilter label={`Statut : ${statusFilter === "active" ? "actifs" : "inactifs"}`} onRemove={() => setStatusFilter("all")} />}
                        {brandFilter !== "all" && <AdminActiveFilter label={`Marque : ${brandFilter}`} onRemove={() => setBrandFilter("all")} />}
                        {categoryFilter !== "all" && <AdminActiveFilter label={`Catégorie : ${categoryFilter}`} onRemove={() => setCategoryFilter("all")} />}
                        {stockFilter !== "all" && <AdminActiveFilter label={`Stock : ${stockFilter === "available" ? "disponible" : stockFilter === "low" ? "faible" : "rupture"}`} onRemove={() => setStockFilter("all")} />}
                        {variantFilter !== "all" && <AdminActiveFilter label={`Variantes : ${variantFilter === "with" ? "avec" : "sans"}`} onRemove={() => setVariantFilter("all")} />}
                        {imageFilter !== "all" && <AdminActiveFilter label={`Images : ${imageFilter === "with" ? "avec" : "sans"}`} onRemove={() => setImageFilter("all")} />}
                        {minPrice.trim() && <AdminActiveFilter label={`Prix min : ${minPrice}`} onRemove={() => setMinPrice("")} />}
                        {maxPrice.trim() && <AdminActiveFilter label={`Prix max : ${maxPrice}`} onRemove={() => setMaxPrice("")} />}
                    </div>
                    )}
                </div>
            </div>


            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-700">
                                    <button onClick={() => toggleSort("id")} className="inline-flex items-center gap-1 hover:text-black">
                                        ID {sortIcon("id")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700">Image</th>
                                <th className="px-4 py-3 font-medium text-gray-700">
                                    <button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1 hover:text-black">
                                        Nom {sortIcon("name")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700">
                                    <button onClick={() => toggleSort("reference")} className="inline-flex items-center gap-1 hover:text-black">
                                        Réf. {sortIcon("reference")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">
                                    <button onClick={() => toggleSort("price")} className="inline-flex items-center gap-1 hover:text-black ml-auto">
                                        Prix (TND) {sortIcon("price")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">
                                    <button onClick={() => toggleSort("stock")} className="inline-flex items-center gap-1 hover:text-black ml-auto">
                                        Stock {sortIcon("stock")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700">
                                    <button onClick={() => toggleSort("categoryName")} className="inline-flex items-center gap-1 hover:text-black">
                                        Catégorie {sortIcon("categoryName")}
                                    </button>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700 relative">
                                    <div className="inline-flex items-center gap-1">
                                        <button
                                            onClick={() => toggleSort("active")}
                                            className="inline-flex items-center gap-1 hover:text-black"
                                        >
                                            Statut {sortIcon("active")}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setStatusFilterOpen((prev) => !prev);
                                            }}
                                            className={`p-1 rounded hover:bg-gray-200 ${statusFilter !== "all" ? "text-black" : "text-gray-500"}`}
                                            title="Filtrer par statut"
                                        >
                                            <Filter className="h-3.5 w-3.5" />
                                        </button>
                                        {statusFilterOpen && (
                                            <div className="absolute z-20 mt-1 top-full left-4 bg-white border border-gray-200 rounded-md shadow-md p-1 min-w-[140px]">
                                                <button
                                                    onClick={() => {
                                                        setStatusFilter("all");
                                                        setStatusFilterOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded ${statusFilter === "all" ? "bg-gray-100 text-gray-900" : "hover:bg-gray-50"}`}
                                                >
                                                    Tous
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setStatusFilter("active");
                                                        setStatusFilterOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded ${statusFilter === "active" ? "bg-green-50 text-green-700" : "hover:bg-gray-50"}`}
                                                >
                                                    Actifs
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setStatusFilter("inactive");
                                                        setStatusFilterOpen(false);
                                                    }}
                                                    className={`w-full text-left px-2 py-1.5 text-xs rounded ${statusFilter === "inactive" ? "bg-gray-100 text-gray-700" : "hover:bg-gray-50"}`}
                                                >
                                                    Inactifs
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </th>
                                <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        Chargement des produits...
                                    </td>
                                </tr>
                            )}
                            {!loading && sorted.length === 0 && (
                                <tr>
                                    <td colSpan={9}>
                                        <AdminEmptyState
                                            icon={Package}
                                            title={products.length === 0 ? "Aucun produit enregistré" : "Aucun produit trouvé"}
                                            description={products.length === 0
                                                ? "Les produits ajoutés au catalogue apparaîtront ici."
                                                : "Aucun produit ne correspond à la recherche ou aux filtres sélectionnés."}
                                        />
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                pageItems.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                            {product.id}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getAdminProductImageSrc(product) ? (
                                                <img
                                                    src={getAdminProductImageSrc(product) || "/placeholder.svg"}
                                                    alt={decodeAdminText(product.name)}
                                                    className="w-10 h-10 object-cover rounded bg-white"
                                                    onError={(e) => {
                                                        e.currentTarget.src = "/placeholder.svg";
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs text-center p-1">
                                                    Pas d'image
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 truncate max-w-[200px]" title={decodeAdminText(product.name)}>
                                                {decodeAdminText(product.name)}
                                            </div>
                                            <div className="flex gap-1 mt-1">
                                                {product.hasVariants && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                        {product.variantCount ?? product.variants?.length ?? 0} {(product.variantCount ?? product.variants?.length ?? 0) > 1 ? "variantes" : "variante"}
                                                    </span>
                                                )}
                                                {product.categoryId === 2 && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100">
                                                        Cat. Racine
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.reference ? (
                                                <span className="text-gray-500 font-mono text-xs">{product.reference}</span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                                                    Sans Ref.
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                                            {product.price.toFixed(3)}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-medium ${product.stock <= 0 ? "text-red-600" : "text-gray-700"}`}>
                                            {product.stock}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">
                                            {decodeAdminText(product.categoryName)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <ConfirmDeleteDialog
                                                title={product.active ? "Désactiver ce produit ?" : "Activer ce produit ?"}
                                                description={product.active
                                                    ? `Le produit "${decodeAdminText(product.name)}" ne sera plus affiché sur le site public ni dans le catalogue client. Il restera conservé dans le backoffice.`
                                                    : `Le produit "${decodeAdminText(product.name)}" sera de nouveau visible sur le site public, si sa catégorie est active.`}
                                                confirmLabel={product.active ? "Désactiver" : "Activer"}
                                                pendingLabel="Modification..."
                                                tone={product.active ? "warning" : "info"}
                                                disabled={togglingId === product.id}
                                                onConfirm={() => handleToggleActive(product)}
                                            >
                                                {(openDialog) => (
                                                    <button
                                                        type="button"
                                                        onClick={openDialog}
                                                        disabled={togglingId === product.id}
                                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${product.active
                                                            ? "bg-green-50 text-green-700 hover:bg-green-100"
                                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                            }`}
                                                        title={product.active ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                                                    >
                                                        {product.active ? (
                                                            <>
                                                                <Eye className="h-3 w-3" /> Actif
                                                            </>
                                                        ) : (
                                                            <>
                                                                <EyeOff className="h-3 w-3" /> Inactif
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </ConfirmDeleteDialog>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/admin/produits/modifier/${product.id}`}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 text-blue-600 transition-colors hover:bg-blue-50"
                                                    title="Modifier"
                                                    aria-label="Modifier ce produit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Link>
                                                <ConfirmDeleteDialog
                                                    title="Supprimer ce produit ?"
                                                    description={`"${decodeAdminText(product.name)}" (ID: ${product.id}) sera supprimé du catalogue.`}
                                                    disabled={deletingId === product.id}
                                                    onConfirm={() => handleDelete(product)}
                                                >
                                                    {(openDialog) => (
                                                        <button
                                                            type="button"
                                                            onClick={openDialog}
                                                            disabled={deletingId === product.id}
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </ConfirmDeleteDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <AdminTablePagination page={safeCurrentPage} pageSize={itemsPerPage} totalItems={sorted.length} onPageChange={setCurrentPage} onPageSizeChange={(pageSize) => { setItemsPerPage(pageSize); setCurrentPage(1); }} />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;

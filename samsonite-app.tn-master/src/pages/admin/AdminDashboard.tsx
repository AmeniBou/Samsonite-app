import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
    Trash2,
    PlusCircle,
    Search,
    RefreshCw,
    Eye,
    EyeOff,
    ArrowUpDown,
    ChevronUp,
    ChevronDown,
    Filter,
} from "lucide-react";
import {
    fetchAdminProducts,
    deleteProduct,
    updateProduct,
    type AdminProduct,
} from "@/lib/admin-api";

type SortKey = "id" | "name" | "reference" | "price" | "stock" | "categoryName" | "active";
type SortDirection = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive";

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

    const handleDelete = async (product: AdminProduct) => {
        if (!window.confirm(`Supprimer "${decodeAdminText(product.name)}" (ID: ${product.id}) ?`)) return;

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
            } else {
                alert(`Erreur: ${result.error}`);
            }
        } catch {
            alert("Erreur de modification");
        } finally {
            setTogglingId(null);
        }
    };

    const filteredBySearch = products.filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            decodeAdminText(p.name).toLowerCase().includes(q) ||
            p.reference.toLowerCase().includes(q) ||
            decodeAdminText(p.categoryName).toLowerCase().includes(q) ||
            String(p.id).includes(q)
        );
    });

    const filteredByStatus = filteredBySearch.filter((p) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return p.active;
        return !p.active;
    });

    const sorted = [...filteredByStatus].sort((a, b) => {
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
    }, [search, statusFilter, sortKey, sortDirection, itemsPerPage]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const pageStart = (safeCurrentPage - 1) * itemsPerPage;
    const pageItems = sorted.slice(pageStart, pageStart + itemsPerPage);

    const startIndex = sorted.length === 0 ? 0 : pageStart + 1;
    const endIndex = Math.min(pageStart + pageItems.length, sorted.length);

    const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (page) => Math.abs(page - safeCurrentPage) <= 2
    );

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
                    <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
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
                        Rafraichir
                    </button>
                    <Link
                        to="/admin/produits/nouveau"
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Ajouter
                    </Link>
                </div>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher par nom, reference, categorie ou ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                />
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-md mb-4">
                    {error}
                </div>
            )}

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
                                        Ref. {sortIcon("reference")}
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
                                        Categorie {sortIcon("categoryName")}
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
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        {search ? "Aucun produit trouve" : "Aucun produit"}
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
                                            {product.imageId ? (
                                                <img
                                                    src={`/api/catalog/images/products/${product.id}/${product.imageId}`}
                                                    alt={decodeAdminText(product.name)}
                                                    className="w-10 h-10 object-cover rounded"
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
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                        Variantes
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
                                            <button
                                                onClick={() => handleToggleActive(product)}
                                                disabled={togglingId === product.id}
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${product.active
                                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                    }`}
                                                title={product.active ? "Cliquer pour desactiver" : "Cliquer pour activer"}
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
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/admin/produits/modifier/${product.id}`}
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Modifier"
                                                >
                                                    Modifier
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(product)}
                                                    disabled={deletingId === product.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {!loading && (
                    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t bg-gray-50">
                        <div className="text-xs text-gray-600">
                            Affichage {startIndex}-{endIndex} sur {sorted.length}
                        </div>

                        <div className="flex items-center gap-2">
                            <label htmlFor="items-per-page" className="text-xs text-gray-600">
                                Par page
                            </label>
                            <select
                                id="items-per-page"
                                value={itemsPerPage}
                                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={safeCurrentPage === 1}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-white"
                            >
                                Prec.
                            </button>

                            {visiblePages.map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-2 py-1 text-xs border rounded ${page === safeCurrentPage
                                        ? "bg-black text-white border-black"
                                        : "border-gray-300 hover:bg-white"
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={safeCurrentPage === totalPages}
                                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 hover:bg-white"
                            >
                                Suiv.
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;

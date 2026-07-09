import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import {
    fetchAdminProduct,
    createProduct,
    updateProduct,
    fetchAdminCategories,
    type AdminCategory,
} from "@/lib/admin-api";

const AdminProductForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const colorOptions = [
        { name: "Noir", hex: "#000000" },
        { name: "Gris", hex: "#7A7A7A" },
        { name: "Bleu Marine", hex: "#1E2A38" },
        { name: "Rouge", hex: "#C1121F" },
        { name: "Vert Olive", hex: "#556B2F" },
        { name: "Beige", hex: "#D2B48C" },
        { name: "Bordeaux", hex: "#5A0B1E" },
        { name: "Rose", hex: "#D87093" },
    ];

    const sizeOptions = ["S", "M", "L", "XL", "55 cm", "65 cm", "75 cm"];

    const [form, setForm] = useState({
        name: "",
        description: "",
        descriptionShort: "",
        price: "",
        categoryId: "",
        reference: "",
        weight: "",
        width: "",
        height: "",
        depth: "",
        active: true,
        onSale: false,
        onlineOnly: false,
        quantity: "",
        volume: "",
        imagesText: "",
        featuresText: "",
        colorsSelected: [] as string[],
        sizesSelected: [] as string[],
        model: "",
        matiere: "",
        poignees: "",
        poigneeTraction: "",
        roulettes: "",
        typeRoues: "",
        compartimentInf: false,
        compartimentSup: false,
        variants: [] as Array<{
            colorName: string;
            colorHex: string;
            size: string;
            price: string;
            stock: string;
            imagesText: string;
        }>,
    });

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await fetchAdminCategories();
                setCategories(cats);
            } catch {
                setError("Impossible de charger les catégories");
            }
        };

        const loadProduct = async () => {
            if (!isEdit) return;
            try {
                setLoading(true);
                const p = await fetchAdminProduct(parseInt(id!, 10));
                setForm({
                    name: p.name,
                    description: p.description || "",
                    descriptionShort: p.descriptionShort || "",
                    price: p.price.toString(),
                    categoryId: p.categoryId.toString(),
                    reference: p.reference,
                    weight: p.weight || "",
                    width: p.width || "",
                    height: p.height || "",
                    depth: p.depth || "",
                    active: p.active,
                    onSale: Boolean(p.onSale),
                    onlineOnly: Boolean(p.onlineOnly),
                    quantity: p.quantity?.toString() || "",
                    volume: p.volume || "",
                    imagesText: (p.images || []).join("\n"),
                    featuresText: (p.features || []).map((f) => `${f.label}|${f.value}`).join("\n"),
                    colorsSelected:
                        p.variants?.map((v) => v.colorHex || v.colorName).filter(Boolean) as string[] || [],
                    sizesSelected:
                        (p.features || [])
                            .filter((f) => f.label?.toLowerCase().includes("taille"))
                            .map((f) => f.value)
                            .filter(Boolean) || [],
                    variants:
                        p.variants?.map((v) => ({
                            colorName: v.colorName || "",
                            colorHex: v.colorHex || "",
                            size: v.size || "",
                            price: v.price?.toString() || "",
                            stock: v.stock?.toString() || "",
                            imagesText: (v.images || []).join("\n"),
                        })) || [],
                });

                // Fetch full details if needed - the getMappedAdminProduct might not have everything
                // Actually, let's assume we need to fetch the raw product for full editing
                // if we want to change description etc.
            } catch {
                setError("Impossible de charger le produit");
            } finally {
                setLoading(false);
            }
        };

        loadCategories();
        loadProduct();
    }, [id, isEdit]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleVariantChange = (
        index: number,
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => {
            const variants = [...prev.variants];
            variants[index] = { ...variants[index], [name]: value };
            return { ...prev, variants };
        });
    };

    const toggleColor = (hexOrName: string) => {
        setForm((prev) => {
            const exists = prev.colorsSelected.includes(hexOrName);
            return {
                ...prev,
                colorsSelected: exists
                    ? prev.colorsSelected.filter((c) => c !== hexOrName)
                    : [...prev.colorsSelected, hexOrName],
            };
        });
    };

    const toggleSize = (size: string) => {
        setForm((prev) => {
            const exists = prev.sizesSelected.includes(size);
            return {
                ...prev,
                sizesSelected: exists
                    ? prev.sizesSelected.filter((s) => s !== size)
                    : [...prev.sizesSelected, size],
            };
        });
    };

    const addVariant = () => {
        setForm((prev) => ({
            ...prev,
            variants: [
                ...prev.variants,
                { colorName: "", colorHex: "", size: "", price: "", stock: "", imagesText: "" },
            ],
        }));
    };

    const removeVariant = (index: number) => {
        setForm((prev) => {
            const variants = prev.variants.filter((_, i) => i !== index);
            return { ...prev, variants };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.name.trim()) {
            setError("Le nom est requis");
            return;
        }
        if (!form.price || parseFloat(form.price) < 0) {
            setError("Le prix est invalide");
            return;
        }
        if (!form.categoryId) {
            setError("La catégorie est requise");
            return;
        }

        setLoading(true);

        try {
            const images = form.imagesText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
            const featuresFree = form.featuresText
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                    const [label, value] = line.split("|");
                    return { label: (label || "").trim(), value: (value || "").trim() };
                })
                .filter((f) => f.label && f.value);
            const featuresAuto: Array<{ label: string; value: string }> = [];
            if (form.model) featuresAuto.push({ label: "ModÃ¨le", value: form.model });
            if (form.matiere) featuresAuto.push({ label: "MatiÃ¨re", value: form.matiere });
            if (form.poignees) featuresAuto.push({ label: "PoignÃ©es", value: form.poignees });
            if (form.poigneeTraction)
                featuresAuto.push({ label: "PoignÃ©e de traction", value: form.poigneeTraction });
            if (form.roulettes) featuresAuto.push({ label: "Roulettes", value: form.roulettes });
            if (form.typeRoues) featuresAuto.push({ label: "Type de roues", value: form.typeRoues });
            if (form.compartimentInf !== undefined)
                featuresAuto.push({
                    label: "Compartiment infÃ©rieur",
                    value: form.compartimentInf ? "Oui" : "Non",
                });
            if (form.compartimentSup !== undefined)
                featuresAuto.push({
                    label: "Compartiment supÃ©rieur",
                    value: form.compartimentSup ? "Oui" : "Non",
                });
            if (form.sizesSelected.length)
                featuresAuto.push({ label: "Tailles", value: form.sizesSelected.join(", ") });
            const features = [...featuresAuto, ...featuresFree];
            const variants = form.variants
                .map((variant) => {
                    const images = variant.imagesText
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean);
                    return {
                        colorName: variant.colorName.trim() || undefined,
                        colorHex: variant.colorHex.trim() || undefined,
                        size: variant.size.trim() || undefined,
                        price: variant.price ? parseFloat(variant.price) : undefined,
                        stock: variant.stock ? parseFloat(variant.stock) : undefined,
                        images,
                    };
                })
                .filter(
                    (v) =>
                        v.colorName ||
                        v.colorHex ||
                        v.size ||
                        typeof v.price === "number" ||
                        typeof v.stock === "number" ||
                        (v.images && v.images.length > 0)
                );

            const paletteVariants =
                form.colorsSelected.length > 0
                    ? form.colorsSelected.map((c) => {
                          const paletteColor = colorOptions.find(
                              (opt) => opt.hex.toLowerCase() === c.toLowerCase() || opt.name === c
                          );
                          return {
                              colorName: paletteColor?.name || c,
                              colorHex: paletteColor?.hex || (c.startsWith("#") ? c : undefined),
                              size: form.sizesSelected[0],
                              price: undefined,
                              stock: form.quantity ? parseFloat(form.quantity) : undefined,
                              images: [],
                          };
                      })
                    : [];

            const productData = {
                name: form.name.trim(),
                description: form.description.trim(),
                descriptionShort: form.descriptionShort.trim(),
                price: parseFloat(form.price),
                categoryId: parseInt(form.categoryId, 10),
                reference: form.reference.trim(),
                weight: form.weight.trim() || undefined,
                width: form.width.trim() || undefined,
                height: form.height.trim() || undefined,
                depth: form.depth.trim() || undefined,
                active: form.active,
                onSale: form.onSale,
                onlineOnly: form.onlineOnly,
                quantity: form.quantity ? parseFloat(form.quantity) : undefined,
                volume: form.volume.trim() || undefined,
                images,
                features,
                variants: variants.length > 0 ? variants : paletteVariants,
            };

            const result = isEdit
                ? await updateProduct(parseInt(id!, 10), productData)
                : await createProduct(productData);

            if (result.success) {
                const msg = isEdit
                    ? "Produit mis à jour avec succès"
                    : `Produit créé avec succès (ID: ${(result as any).id})`;
                setSuccess(msg);
                setTimeout(() => navigate("/admin"), 1500);
            } else {
                setError(result.error || "Une erreur est survenue");
            }
        } catch {
            setError("Erreur de connexion au serveur");
        } finally {
            setLoading(false);
        }
    };

    // Only show categories that are not root (id > 2)
    const selectableCategories = categories.filter((c) => c.id > 2);

    return (
        <div className="p-6 max-w-2xl">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate("/admin")}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEdit ? `Modifier : ${form.name || "..."}` : "Ajouter un produit"}
                </h1>
                {isEdit && id && (
                    <p className="text-xs text-gray-400 font-mono mt-1">ID PrestaShop : {id}</p>
                )}
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-md mb-4">{error}</div>
            )}
            {success && (
                <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-md mb-4">
                    {success}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-5">
                {/* Name */}
                <div>
                    <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Nom du produit *
                    </label>
                    <input
                        id="product-name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        placeholder="ex: Valise Proxis Spinner 55cm"
                        required
                    />
                </div>

                {/* Price + Reference */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
                            Prix (TND) *
                        </label>
                        <input
                            id="product-price"
                            name="price"
                            type="number"
                            step="0.001"
                            min="0"
                            value={form.price}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="299.000"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="product-reference" className="block text-sm font-medium text-gray-700 mb-1">
                            Référence
                        </label>
                        <input
                            id="product-reference"
                            name="reference"
                            type="text"
                            value={form.reference}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="CW6-09-001"
                        />
                    </div>
                </div>

                {/* Category Selection with Hierarchy */}
                <div>
                    <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
                        Catégorie *
                    </label>
                    <select
                        id="product-category"
                        name="categoryId"
                        value={form.categoryId}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                        required
                    >
                        <option value="">Sélectionner une catégorie</option>
                        {categories
                            .filter(c => c.id > 2) // Ignore Root/Home
                            .map((cat) => {
                                // Simple breadcrumb building
                                const path = [];
                                let current: AdminCategory | undefined = cat;
                                while (current && current.id > 2) {
                                    path.unshift(current.name);
                                    current = categories.find(c => c.id === current?.parentId);
                                }
                                return (
                                    <option key={cat.id} value={cat.id}>
                                        {path.join(" > ")}
                                    </option>
                                );
                            })
                            .sort((a, b) => a.props.children.localeCompare(b.props.children))
                        }
                    </select>
                </div>

                {/* Dimensions & Weight */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label htmlFor="product-weight" className="block text-sm font-medium text-gray-700 mb-1">
                            Poids (kg)
                        </label>
                        <input
                            id="product-weight"
                            name="weight"
                            type="text"
                            value={form.weight}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="2.500"
                        />
                    </div>
                    <div>
                        <label htmlFor="product-width" className="block text-sm font-medium text-gray-700 mb-1">
                            Largeur (cm)
                        </label>
                        <input
                            id="product-width"
                            name="width"
                            type="text"
                            value={form.width}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="40"
                        />
                    </div>
                    <div>
                        <label htmlFor="product-height" className="block text-sm font-medium text-gray-700 mb-1">
                            Hauteur (cm)
                        </label>
                        <input
                            id="product-height"
                            name="height"
                            type="text"
                            value={form.height}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="55"
                        />
                    </div>
                    <div>
                        <label htmlFor="product-depth" className="block text-sm font-medium text-gray-700 mb-1">
                            Profondeur (cm)
                        </label>
                        <input
                            id="product-depth"
                            name="depth"
                            type="text"
                            value={form.depth}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="20"
                        />
                    </div>
                </div>

                {/* Stock & Volume */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="product-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                            Stock initial
                        </label>
                        <input
                            id="product-quantity"
                            name="quantity"
                            type="number"
                            min="0"
                            value={form.quantity}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="10"
                        />
                    </div>
                    <div>
                        <label htmlFor="product-volume" className="block text-sm font-medium text-gray-700 mb-1">
                            Volume
                        </label>
                        <input
                            id="product-volume"
                            name="volume"
                            type="text"
                            value={form.volume}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="25 L"
                        />
                    </div>
                </div>

                {/* Couleurs disponibles */}
                <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Couleurs disponibles</p>
                    <div className="flex flex-wrap gap-2">
                        {colorOptions.map((color) => {
                            const selected = form.colorsSelected.includes(color.hex) || form.colorsSelected.includes(color.name);
                            return (
                                <button
                                    key={color.hex}
                                    type="button"
                                    onClick={() => toggleColor(color.hex)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md border transition ${
                                        selected ? "border-black ring-1 ring-black" : "border-gray-200"
                                    }`}
                                >
                                    <span
                                        className="h-4 w-4 rounded-full border border-gray-200"
                                        style={{ backgroundColor: color.hex }}
                                    />
                                    <span className="text-xs font-medium">{color.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    {form.colorsSelected.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            {form.colorsSelected.length} couleur(s) sÃ©lectionnÃ©e(s)
                        </p>
                    )}
                </div>

                {/* Tailles */}
                <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Tailles / formats</p>
                    <div className="flex flex-wrap gap-2">
                        {sizeOptions.map((size) => {
                            const selected = form.sizesSelected.includes(size);
                            return (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => toggleSize(size)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                                        selected ? "border-black bg-black text-white" : "border-gray-200 text-gray-700"
                                    }`}
                                >
                                    {size}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Description short */}
                <div>
                    <label htmlFor="product-desc-short" className="block text-sm font-medium text-gray-700 mb-1">
                        Description courte
                    </label>
                    <textarea
                        id="product-desc-short"
                        name="descriptionShort"
                        rows={2}
                        value={form.descriptionShort}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        placeholder="Courte description affichée en résumé..."
                    />
                </div>

                {/* ModÃ¨le & matiÃ¨re */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ModÃ¨le</label>
                        <input
                            name="model"
                            value={form.model}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="ex: AT Work, Proxis..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">MatiÃ¨re</label>
                        <input
                            name="matiere"
                            value={form.matiere}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Polycarbonate, Polyester..."
                        />
                    </div>
                </div>

                {/* PoignÃ©es / Traction / Roulettes */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PoignÃ©es</label>
                            <input
                                name="poignees"
                                value={form.poignees}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="PoignÃ©e haute + latÃ©rale"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">PoignÃ©e de traction</label>
                            <input
                                name="poigneeTraction"
                                value={form.poigneeTraction}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Tige double, ajustable..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Roulettes</label>
                            <input
                                name="roulettes"
                                value={form.roulettes}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="4 roues doubles 360Â°"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type de roues</label>
                            <input
                                name="typeRoues"
                                value={form.typeRoues}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Silencieuses, suspendues..."
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="compartimentInf"
                                name="compartimentInf"
                                type="checkbox"
                                checked={form.compartimentInf}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <label htmlFor="compartimentInf" className="text-sm text-gray-700">
                                Compartiment infÃ©rieur
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                id="compartimentSup"
                                name="compartimentSup"
                                type="checkbox"
                                checked={form.compartimentSup}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <label htmlFor="compartimentSup" className="text-sm text-gray-700">
                                Compartiment supÃ©rieur
                            </label>
                        </div>
                    </div>
                </div>

                {/* Description full */}
                <div>
                    <label htmlFor="product-desc" className="block text-sm font-medium text-gray-700 mb-1">
                        Description complète
                    </label>
                    <textarea
                        id="product-desc"
                        name="description"
                        rows={4}
                        value={form.description}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                        placeholder="Description détaillée du produit..."
                    />
                </div>

                {/* Images */}
                <div>
                    <label htmlFor="product-images" className="block text-sm font-medium text-gray-700 mb-1">
                        Images (URLs, une par ligne)
                    </label>
                    <textarea
                        id="product-images"
                        name="imagesText"
                        rows={3}
                        value={form.imagesText}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
                        placeholder={"https://.../photo1.jpg\nhttps://.../photo2.jpg"}
                    />
                </div>

                {/* Features */}
                <div>
                    <label htmlFor="product-features" className="block text-sm font-medium text-gray-700 mb-1">
                        CaractÃ©ristiques (label|valeur par ligne)
                    </label>
                    <textarea
                        id="product-features"
                        name="featuresText"
                        rows={4}
                        value={form.featuresText}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
                        placeholder={"ModÃ¨le|Sac Ã  dos pour ordinateur\nMatiÃ¨re|100% Polyester\nVolume|25 L"}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Exemple: <span className="font-mono">MatiÃ¨re|100% Polyester</span>
                    </p>
                </div>

                {/* Variants */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Variantes (couleur/taille)</span>
                        <button
                            type="button"
                            onClick={addVariant}
                            className="px-2 py-1 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-50"
                        >
                            + Ajouter une variante
                        </button>
                    </div>
                    {form.variants.length === 0 && (
                        <p className="text-xs text-gray-400">Aucune variante ajoutÃ©e.</p>
                    )}
                    {form.variants.map((variant, index) => (
                        <div key={index} className="border rounded-md p-3 space-y-3 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <span className="text-xs uppercase tracking-wide text-gray-500">
                                    Variante #{index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeVariant(index)}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Supprimer
                                </button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <input
                                    name="colorName"
                                    value={variant.colorName}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Couleur (nom)"
                                />
                                <input
                                    name="colorHex"
                                    value={variant.colorHex}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="#HEX"
                                />
                                <input
                                    name="size"
                                    value={variant.size}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Taille / option"
                                />
                                <input
                                    name="price"
                                    value={variant.price}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Prix (TND)"
                                />
                                <input
                                    name="stock"
                                    value={variant.stock}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Stock"
                                />
                            </div>
                            <textarea
                                name="imagesText"
                                rows={2}
                                value={variant.imagesText}
                                onChange={(e) => handleVariantChange(index, e)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
                                placeholder="URLs d'images de la variante (une par ligne)"
                            />
                        </div>
                    ))}
                </div>

                {/* Toggles */}
                <div className="grid md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                            id="product-active"
                            name="active"
                            type="checkbox"
                            checked={form.active}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        Produit actif (visible sur le site)
                    </label>
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                            id="product-onSale"
                            name="onSale"
                            type="checkbox"
                            checked={form.onSale}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        Produit en promotion
                    </label>
                    <label className="flex items-center gap-3 text-sm text-gray-700">
                        <input
                            id="product-onlineOnly"
                            name="onlineOnly"
                            type="checkbox"
                            checked={form.onlineOnly}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        Vente en ligne uniquement
                    </label>
                </div>

                {/* Submit */}
                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4" />
                        )}
                        {loading
                            ? (isEdit ? "Mise à jour..." : "Création...")
                            : (isEdit ? "Enregistrer les modifications" : "Créer le produit")}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminProductForm;

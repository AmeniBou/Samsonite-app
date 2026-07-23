import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, ImageOff } from "lucide-react";
import {
    fetchAdminProduct,
    createProduct,
    updateProduct,
    fetchAdminCategories,
    fetchAdminBrands,
    uploadAdminImages,
    type AdminCategory,
    type AdminBrand,
} from "@/lib/admin-api";

const decodeAdminText = (value?: string | null): string => {
    let text = value || "";
    const textarea = document.createElement("textarea");

    for (let index = 0; index < 2; index += 1) {
        textarea.innerHTML = text;
        text = textarea.value;
    }

    for (let index = 0; index < 2 && ["\u00c3", "\u00c2", "\u00e2"].some((marker) => text.includes(marker)); index += 1) {
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


const isValidImageReference = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    return /^(https?:\/\/|\/)([^\s]+)\.(jpe?g|png|webp|gif|avif)(\?.*)?$/i.test(trimmed);
};

const parseLines = (value: string): string[] =>
    value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

const isValidNonNegativeNumber = (value: string): boolean => {
    if (!value.trim()) return true;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0;
};

const isValidPositiveNumber = (value: string): boolean => {
    if (!value.trim()) return false;
    const number = Number(value);
    return Number.isFinite(number) && number > 0;
};
const AdminProductForm = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEdit = Boolean(id);
    const [categories, setCategories] = useState<AdminCategory[]>([]);
    const [brands, setBrands] = useState<AdminBrand[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
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
        parentCategoryId: "",
        categoryId: "",
        brandId: "",
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
        const loadReferences = async () => {
            try {
                const [cats, fetchedBrands] = await Promise.all([
                    fetchAdminCategories(),
                    fetchAdminBrands(),
                ]);
                setCategories(cats);
                setBrands(fetchedBrands);
            } catch {
                setError("Impossible de charger les catégories ou les marques");
            }
        };

        const loadProduct = async () => {
            if (!isEdit) return;
            try {
                setLoading(true);
                const p = await fetchAdminProduct(parseInt(id!, 10));
                setForm({
                    name: decodeAdminText(p.name),
                    description: decodeAdminText(p.description),
                    descriptionShort: decodeAdminText(p.descriptionShort),
                    price: p.price.toString(),
                    parentCategoryId: "",
                    categoryId: p.categoryId.toString(),
                    brandId: p.brandId?.toString() || "",
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
                    featuresText: (p.features || [])
                        .map((f) => `${decodeAdminText(f.label)}|${decodeAdminText(f.value)}`)
                        .join("\n"),
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

        loadReferences();
        loadProduct();
    }, [id, isEdit]);

    useEffect(() => {
        if (!form.categoryId || form.parentCategoryId || categories.length === 0) return;
        const category = categories.find((item) => String(item.id) === form.categoryId);
        if (!category) return;
        setForm((prev) => ({
            ...prev,
            parentCategoryId: category.parentId ? String(category.parentId) : String(category.id),
        }));
    }, [categories, form.categoryId, form.parentCategoryId]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
            ...(name === "parentCategoryId" ? { categoryId: "" } : {}),
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

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;

        const invalidFile = files.find((file) => !file.type.startsWith("image/"));
        if (invalidFile) {
            setError(`Image invalide: ${invalidFile.name}. Choisis un fichier JPG, PNG, WEBP ou GIF.`);
            event.target.value = "";
            return;
        }

        const oversizedFile = files.find((file) => file.size > 5 * 1024 * 1024);
        if (oversizedFile) {
            setError(`Image trop lourde: ${oversizedFile.name}. Maximum 5 Mo par image.`);
            event.target.value = "";
            return;
        }

        setError("");
        setSuccess("");
        setUploadingImages(true);

        try {
            const result = await uploadAdminImages(files);
            if (!result.success || !result.images?.length) {
                setError(result.error || "Impossible d'importer les images");
                return;
            }

            setForm((prev) => ({
                ...prev,
                imagesText: [prev.imagesText, ...result.images]
                    .filter(Boolean)
                    .join("\n"),
            }));
            setSuccess(`${result.images.length} image(s) importee(s)`);
        } catch {
            setError("Erreur pendant l'import des images");
        } finally {
            setUploadingImages(false);
            event.target.value = "";
        }
    };

    const removeProductImage = (imageToRemove: string) => {
        setForm((prev) => ({
            ...prev,
            imagesText: parseLines(prev.imagesText)
                .filter((image) => image !== imageToRemove)
                .join("\n"),
        }));
    };

    const moveProductImage = (index: number, direction: -1 | 1) => {
        setForm((prev) => {
            const images = parseLines(prev.imagesText);
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= images.length) return prev;
            [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
            return { ...prev, imagesText: images.join("\n") };
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
        if (!isValidPositiveNumber(form.price)) {
            setError("Le prix est obligatoire et doit etre superieur a 0.");
            return;
        }
        if (!form.brandId) {
            setError("La marque est requise.");
            return;
        }
        if (!form.parentCategoryId) {
            setError("La categorie parent est requise.");
            return;
        }
        if (!form.categoryId) {
            setError("La sous-categorie est requise.");
            return;
        }
        if (!isValidNonNegativeNumber(form.quantity)) {
            setError("Le stock doit etre un nombre positif ou zero.");
            return;
        }

        const images = parseLines(form.imagesText);
        const invalidImage = images.find((image) => !isValidImageReference(image));
        if (invalidImage) {
            setError(`Image invalide: ${invalidImage}. Utilise une URL ou un chemin /images/... en JPG, PNG, WEBP, GIF ou AVIF.`);
            return;
        }

        for (const [index, variant] of form.variants.entries()) {
            if (!isValidNonNegativeNumber(variant.stock)) {
                setError(`Le stock de la variante #${index + 1} doit etre numerique.`);
                return;
            }
            if (variant.price && !isValidPositiveNumber(variant.price)) {
                setError(`Le prix de la variante #${index + 1} doit etre superieur a 0.`);
                return;
            }
            const invalidVariantImage = parseLines(variant.imagesText).find((image) => !isValidImageReference(image));
            if (invalidVariantImage) {
                setError(`Image invalide dans la variante #${index + 1}: ${invalidVariantImage}`);
                return;
            }
        }

        setLoading(true);

        try {
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
            if (form.model) featuresAuto.push({ label: "Modèle", value: form.model });
            if (form.matiere) featuresAuto.push({ label: "Matière", value: form.matiere });
            if (form.poignees) featuresAuto.push({ label: "Poignées", value: form.poignees });
            if (form.poigneeTraction)
                featuresAuto.push({ label: "Poignée de traction", value: form.poigneeTraction });
            if (form.roulettes) featuresAuto.push({ label: "Roulettes", value: form.roulettes });
            if (form.typeRoues) featuresAuto.push({ label: "Type de roues", value: form.typeRoues });
            if (form.compartimentInf !== undefined)
                featuresAuto.push({
                    label: "Compartiment inférieur",
                    value: form.compartimentInf ? "Oui" : "Non",
                });
            if (form.compartimentSup !== undefined)
                featuresAuto.push({
                    label: "Compartiment supérieur",
                    value: form.compartimentSup ? "Oui" : "Non",
                });
            if (form.sizesSelected.length)
                featuresAuto.push({ label: "Tailles", value: form.sizesSelected.join(", ") });
            const features = [...featuresAuto, ...featuresFree];
            const variants = form.variants
                .map((variant) => {
                    const images = parseLines(variant.imagesText);
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
                brandId: parseInt(form.brandId, 10),
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

    const rootCategories = categories
        .filter((category) => !category.parentId)
        .sort((first, second) => first.name.localeCompare(second.name, "fr"));
    const selectedParent = categories.find((category) => String(category.id) === form.parentCategoryId);
    const childCategories = categories
        .filter((category) => String(category.parentId) === form.parentCategoryId)
        .sort((first, second) => first.name.localeCompare(second.name, "fr"));
    const categoryOptions = selectedParent ? [selectedParent, ...childCategories] : [];
    const imagePreviewItems = parseLines(form.imagesText).slice(0, 12);
    const allProductImages = parseLines(form.imagesText);
    const selectedBrandName = brands.find((brand) => String(brand.id) === form.brandId)?.name || "Samsonite";
    const selectedCategoryName = categories.find((category) => String(category.id) === form.categoryId)?.name || selectedParent?.name || "Categorie";
    const previewImage = allProductImages[0] || "/placeholder.svg";
    const previewDescription = form.descriptionShort || form.description || "Description courte du produit.";
    const previewPrice = form.price && Number.isFinite(Number(form.price)) ? Number(form.price).toLocaleString("fr-TN", { minimumFractionDigits: 3 }) : "0,000";

    return (
        <div className="p-6 max-w-7xl">
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
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
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

                <div className="grid gap-4 md:grid-cols-3">
                    <div>
                        <label htmlFor="product-brand" className="block text-sm font-medium text-gray-700 mb-1">
                            Marque *
                        </label>
                        <select
                            id="product-brand"
                            name="brandId"
                            value={form.brandId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                            required
                        >
                            <option value="">Sélectionner une marque</option>
                            {brands.map((brand) => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-parent-category" className="block text-sm font-medium text-gray-700 mb-1">
                            Catégorie parent *
                        </label>
                        <select
                            id="product-parent-category"
                            name="parentCategoryId"
                            value={form.parentCategoryId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                            required
                        >
                            <option value="">Choisir un parent</option>
                            {rootCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
                            Sous-catégorie *
                        </label>
                        <select
                            id="product-category"
                            name="categoryId"
                            value={form.categoryId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black bg-white"
                            required
                            disabled={!form.parentCategoryId}
                        >
                            <option value="">Choisir une sous-catégorie</option>
                            {categoryOptions.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.id === selectedParent?.id ? `Toutes - ${category.name}` : category.name}
                                </option>
                            ))}
                        </select>
                    </div>
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
                            {form.colorsSelected.length} couleur(s) sélectionnée(s)
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

                {/* Modèle & matière */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                        <input
                            name="model"
                            value={form.model}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="ex: AT Work, Proxis..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                        <input
                            name="matiere"
                            value={form.matiere}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                            placeholder="Polycarbonate, Polyester..."
                        />
                    </div>
                </div>

                {/* Poignées / Traction / Roulettes */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Poignées</label>
                            <input
                                name="poignees"
                                value={form.poignees}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Poignée haute + latérale"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Poignée de traction</label>
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
                                placeholder="4 roues doubles 360°"
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
                                Compartiment inférieur
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
                                Compartiment supérieur
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
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-bold text-gray-900">Images du produit</p>
                            <p className="text-xs text-gray-500">Importe les photos depuis ton ordinateur. La première image devient l'image principale.</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800">
                            {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {uploadingImages ? "Import..." : "Importer des images"}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={uploadingImages}
                            />
                        </label>
                    </div>

                    {imagePreviewItems.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {imagePreviewItems.map((image, index) => {
                                const valid = isValidImageReference(image);
                                return (
                                    <div key={`${image}-${index}`} className={`overflow-hidden rounded-md border bg-white ${valid ? "border-gray-200" : "border-red-300"}`}>
                                        <div className="aspect-square bg-white">
                                            {valid ? (
                                                <img
                                                    src={image}
                                                    alt={`Aperçu produit ${index + 1}`}
                                                    className="h-full w-full object-contain"
                                                    onError={(event) => {
                                                        event.currentTarget.src = "/placeholder.svg";
                                                    }}
                                                />
                                            ) : (
                                                <div className="flex h-full flex-col items-center justify-center gap-2 text-red-500">
                                                    <ImageOff className="h-5 w-5" />
                                                    <span className="px-2 text-center text-xs font-semibold">Image invalide</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-1 border-t border-gray-100 px-2 py-1">
                                            <span className="text-[11px] font-semibold text-gray-500">#{index + 1}</span>
                                            <div className="flex gap-1">
                                                <button type="button" onClick={() => moveProductImage(index, -1)} disabled={index === 0} className="text-[11px] text-gray-500 hover:text-black disabled:opacity-30">Haut</button>
                                                <button type="button" onClick={() => moveProductImage(index, 1)} disabled={index === imagePreviewItems.length - 1} className="text-[11px] text-gray-500 hover:text-black disabled:opacity-30">Bas</button>
                                                <button type="button" onClick={() => removeProductImage(image)} className="text-[11px] font-bold text-red-600 hover:underline">Retirer</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex min-h-36 items-center justify-center rounded-md border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                            Aucune image importée pour le moment.
                        </div>
                    )}
                </div>

                {/* Features */}
                <div>
                    <label htmlFor="product-features" className="block text-sm font-medium text-gray-700 mb-1">
                        Caractéristiques (label|valeur par ligne)
                    </label>
                    <textarea
                        id="product-features"
                        name="featuresText"
                        rows={4}
                        value={form.featuresText}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none font-mono"
                        placeholder={"Modèle|Sac à dos pour ordinateur\nMatière|100% Polyester\nVolume|25 L"}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Exemple: <span className="font-mono">Matière|100% Polyester</span>
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
                        <p className="text-xs text-gray-400">Aucune variante ajoutée.</p>
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
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={variant.price}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Prix (TND)"
                                />
                                <input
                                    name="stock"
                                    type="number"
                                    step="1"
                                    min="0"
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
                                placeholder="Images de la variante (optionnel, une par ligne)"
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

            <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Aperçu page détail</p>
                    <div className="mt-4 overflow-hidden rounded-md border border-gray-100 bg-white">
                        <div className="aspect-square bg-white p-4">
                            <img
                                src={previewImage}
                                alt="Aperçu produit"
                                className="h-full w-full object-contain"
                                onError={(event) => {
                                    event.currentTarget.src = "/placeholder.svg";
                                }}
                            />
                        </div>
                    </div>
                    <div className="mt-5 space-y-3">
                        <div>
                            <p className="text-xs font-bold uppercase text-gray-400">{selectedBrandName}</p>
                            <h2 className="mt-1 text-2xl font-black uppercase leading-tight text-gray-950">{form.name || "Nom du produit"}</h2>
                            <p className="mt-1 text-sm text-gray-500">{selectedCategoryName}</p>
                        </div>
                        <p className="text-xl font-black text-gray-950">{previewPrice} DT</p>
                        <p className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${form.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                            {form.active ? "Visible sur le site" : "Non visible"}
                        </p>
                        <p className="line-clamp-4 text-sm leading-6 text-gray-600">{previewDescription}</p>
                        <button type="button" className="w-full rounded-md bg-black px-4 py-3 text-sm font-black uppercase text-white">
                            Ajouter au panier
                        </button>
                    </div>
                </div>
            </aside>
            </div>
        </div>
    );
};

export default AdminProductForm;

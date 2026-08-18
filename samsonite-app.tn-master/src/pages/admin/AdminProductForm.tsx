import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Upload, ImageOff, Copy, X, GripVertical, ShoppingBag } from "lucide-react";
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
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { toast } from "@/components/ui/sonner";

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

const normalizeFeatureLabel = (value?: string | null): string =>
    decodeAdminText(value)
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const structuredFeatureLabels = new Set([
    "modele",
    "matiere",
    "poignees",
    "poignee de traction",
    "roulettes",
    "type de roues",
    "porte-adresse",
    "ecoresponsable",
    "interieur",
    "compartiment inferieur",
    "compartiment superieur",
    "plateau separateur",
    "tailles",
]);

const isStructuredFeatureLabel = (label?: string | null): boolean =>
    structuredFeatureLabels.has(normalizeFeatureLabel(label));

const getFeatureValue = (
    features: Array<{ label?: string; value?: string }>,
    label: string
): string =>
    decodeAdminText(
        features.find((feature) => normalizeFeatureLabel(feature.label) === normalizeFeatureLabel(label))?.value
    );

const getFeatureBoolean = (
    features: Array<{ label?: string; value?: string }>,
    label: string
): boolean => /^(oui|yes|true|1)$/i.test(getFeatureValue(features, label).trim());

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

type ProductVariantForm = {
    colorName: string;
    colorHex: string;
    size: string;
    weight: string;
    width: string;
    height: string;
    depth: string;
    isExpandable: boolean;
    expandedWidth: string;
    expandedHeight: string;
    expandedDepth: string;
    volume: string;
    price: string;
    stockInitial: string;
    stock: string;
    imagesText: string;
};

type ProductFormStep = 1 | 2 | 3;

const createEmptyVariant = (overrides: Partial<ProductVariantForm> = {}): ProductVariantForm => ({
    colorName: "",
    colorHex: "",
    size: "",
    weight: "",
    width: "",
    height: "",
    depth: "",
    isExpandable: false,
    expandedWidth: "",
    expandedHeight: "",
    expandedDepth: "",
    volume: "",
    price: "",
    stockInitial: "",
    stock: "",
    imagesText: "",
    ...overrides,
});

const getVariantUniqueKey = (
    variant: Pick<ProductVariantForm, "colorName" | "size" | "height" | "width" | "depth" | "volume">
): string =>
    [
        variant.colorName.trim().toLowerCase(),
        variant.size.trim().toLowerCase(),
        variant.height.trim().toLowerCase(),
        variant.width.trim().toLowerCase(),
        variant.depth.trim().toLowerCase(),
        variant.volume.trim().toLowerCase(),
    ].join("::");

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
    const [currentStep, setCurrentStep] = useState<ProductFormStep>(1);
    const [previewVariantIndex, setPreviewVariantIndex] = useState(0);
    const [draggedVariantImage, setDraggedVariantImage] = useState<{
        variantIndex: number;
        imageIndex: number;
    } | null>(null);

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
        porteAdresse: "",
        ecoresponsable: false,
        interieur: "",
        compartimentInf: false,
        compartimentSup: false,
        plateauSeparateur: "",
        variants: [createEmptyVariant()] as ProductVariantForm[],
    });

    useEffect(() => {
        setPreviewVariantIndex((index) => Math.min(index, Math.max(0, form.variants.length - 1)));
    }, [form.variants.length]);
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
                const productFeatures = (p.features || []).map((feature) => ({
                    label: decodeAdminText(feature.label),
                    value: decodeAdminText(feature.value),
                }));
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
                    featuresText: productFeatures
                        .filter((f) => !isStructuredFeatureLabel(f.label))
                        .map((f) => `${decodeAdminText(f.label)}|${decodeAdminText(f.value)}`)
                        .join("\n"),
                    colorsSelected:
                        p.variants?.map((v) => v.colorHex || v.colorName).filter(Boolean) as string[] || [],
                    sizesSelected:
                        (p.features || [])
                            .filter((f) => f.label?.toLowerCase().includes("taille"))
                            .map((f) => f.value)
                        .filter(Boolean) || [],
                    model: getFeatureValue(productFeatures, "Modèle"),
                    matiere: getFeatureValue(productFeatures, "Matière"),
                    poignees: getFeatureValue(productFeatures, "Poignées"),
                    poigneeTraction: getFeatureValue(productFeatures, "Poignée de traction"),
                    roulettes: getFeatureValue(productFeatures, "Roulettes"),
                    typeRoues: getFeatureValue(productFeatures, "Type de roues"),
                    porteAdresse: getFeatureValue(productFeatures, "Porte-Adresse"),
                    ecoresponsable: getFeatureBoolean(productFeatures, "Ecoresponsable"),
                    interieur: getFeatureValue(productFeatures, "Intérieur"),
                    compartimentInf: getFeatureBoolean(productFeatures, "Compartiment inférieur"),
                    compartimentSup: getFeatureBoolean(productFeatures, "Compartiment supérieur"),
                    plateauSeparateur: getFeatureValue(productFeatures, "Plateau Séparateur"),
                    variants:
                        p.variants && p.variants.length > 0
                            ? p.variants.map((v) =>
                                  createEmptyVariant({
                                      colorName: v.colorName || "",
                                      colorHex: v.colorHex || "",
                                      size: v.size || "",
                                      weight: v.weight || "",
                                      width: v.width || "",
                                      height: v.height || "",
                                      depth: v.depth || "",
                                      isExpandable: Boolean(v.isExpandable || v.expandedWidth || v.expandedHeight || v.expandedDepth),
                                      expandedWidth: v.expandedWidth || "",
                                      expandedHeight: v.expandedHeight || "",
                                      expandedDepth: v.expandedDepth || "",
                                      volume: v.volume || "",
                                      price: v.price?.toString() || "",
                                      stockInitial: v.stockInitial?.toString() || "",
                                      stock: v.stock?.toString() || "",
                                      imagesText: (v.images || []).join("\n"),
                                  })
                              )
                            : [createEmptyVariant()],
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
        const { name, value, type } = e.target;
        const nextValue = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
        setForm((prev) => {
            const variants = [...prev.variants];
            variants[index] = { ...variants[index], [name]: nextValue };
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
            variants: [...prev.variants, createEmptyVariant()],
        }));
    };

    const duplicateVariant = (index: number) => {
        setForm((prev) => ({
            ...prev,
            variants: [
                ...prev.variants.slice(0, index + 1),
                createEmptyVariant({ ...prev.variants[index] }),
                ...prev.variants.slice(index + 1),
            ],
        }));
        setSuccess("Variante dupliquée. Modifie au moins la couleur ou la taille avant d'enregistrer.");
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

    const handleVariantImageUpload = async (
        index: number,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
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

            setForm((prev) => {
                const variants = [...prev.variants];
                variants[index] = {
                    ...variants[index],
                    imagesText: [variants[index].imagesText, ...result.images]
                        .filter(Boolean)
                        .join("\n"),
                };
                return { ...prev, variants };
            });
            setSuccess(`${result.images.length} image(s) importee(s) dans la variante #${index + 1}`);
        } catch {
            setError("Erreur pendant l'import des images");
        } finally {
            setUploadingImages(false);
            event.target.value = "";
        }
    };

    const removeVariantImage = (variantIndex: number, imageToRemove: string) => {
        setForm((prev) => {
            const variants = [...prev.variants];
            variants[variantIndex] = {
                ...variants[variantIndex],
                imagesText: parseLines(variants[variantIndex].imagesText)
                    .filter((image) => image !== imageToRemove)
                    .join("\n"),
            };
            return { ...prev, variants };
        });
    };

    const reorderVariantImage = (variantIndex: number, fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;

        setForm((prev) => {
            const variants = [...prev.variants];
            const images = parseLines(variants[variantIndex].imagesText);
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) {
                return prev;
            }

            const [movedImage] = images.splice(fromIndex, 1);
            images.splice(toIndex, 0, movedImage);
            variants[variantIndex] = {
                ...variants[variantIndex],
                imagesText: images.join("\n"),
            };

            return { ...prev, variants };
        });
    };

    const useProductImagesForVariant = (variantIndex: number) => {
        const productImages = parseLines(form.imagesText);
        if (productImages.length === 0) {
            setError("Ajoute d'abord des images générales au produit, ou importe directement les images dans la variante.");
            return;
        }

        setForm((prev) => {
            const variants = [...prev.variants];
            const currentVariantImages = parseLines(variants[variantIndex].imagesText);
            const mergedImages = Array.from(new Set([...currentVariantImages, ...productImages]));

            variants[variantIndex] = {
                ...variants[variantIndex],
                imagesText: mergedImages.join("\n"),
            };

            return { ...prev, variants };
        });
        setError("");
        setSuccess(`Images générales associées à la variante #${variantIndex + 1}.`);
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

    const handleSaveProduct = async () => {
        setError("");
        setSuccess("");

        if (currentStep !== 3) {
            setError("Passe d'abord par l'étape Aperçu avant de valider la création.");
            return;
        }

        const finalValidationErrors = [...getGeneralValidationErrors(), ...getVariantsValidationErrors()];
        if (finalValidationErrors.length > 0) {
            setError(finalValidationErrors[0]);
            setCurrentStep(getGeneralValidationErrors().length > 0 ? 1 : 2);
            return;
        }

        if (!form.name.trim()) {
            setError("Le nom est requis");
            return;
        }
        if (!form.brandId) {
            setError("La marque est requise.");
            return;
        }
        if (!form.parentCategoryId) {
            setError("La catégorie parent est requise.");
            return;
        }
        if (!form.categoryId) {
            setError("La sous-catégorie est requise.");
            return;
        }
        if (form.variants.length === 0) {
            setError("Ajoute au moins une variante avec couleur, prix, stock et images.");
            return;
        }

        for (const [index, variant] of form.variants.entries()) {
            if (!variant.colorName.trim()) {
                setError(`La couleur de la variante #${index + 1} est requise.`);
                return;
            }
            if (!isValidPositiveNumber(variant.price)) {
                setError(`Le prix de la variante #${index + 1} est requis et doit etre superieur a 0.`);
                return;
            }
            if (!variant.stock.trim()) {
                setError(`Le stock de la variante #${index + 1} est requis.`);
                return;
            }
            if (parseLines(variant.imagesText).length === 0) {
                setError(`Ajoute au moins une image pour la variante #${index + 1}.`);
                return;
            }
            if (
                variant.isExpandable &&
                (!variant.expandedHeight.trim() || !variant.expandedWidth.trim() || !variant.expandedDepth.trim())
            ) {
                setError(`Ajoute la hauteur, largeur et profondeur avec extension pour la variante #${index + 1}.`);
                return;
            }
            const duplicateIndex = form.variants.findIndex(
                (candidate, candidateIndex) =>
                    candidateIndex !== index &&
                    getVariantUniqueKey(candidate) === getVariantUniqueKey(variant)
            );
            if (duplicateIndex !== -1) {
                setError(
                    `La variante #${index + 1} existe déjà en variante #${duplicateIndex + 1}. Change la couleur, la taille ou les dimensions.`
                );
                return;
            }
            if (!isValidNonNegativeNumber(variant.stockInitial)) {
                setError(`Le stock initial de la variante #${index + 1} doit etre numerique.`);
                return;
            }
            if (!isValidNonNegativeNumber(variant.stock)) {
                setError(`Le stock de la variante #${index + 1} doit etre numerique.`);
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
            if (form.porteAdresse) featuresAuto.push({ label: "Porte-Adresse", value: form.porteAdresse });
            featuresAuto.push({ label: "Ecoresponsable", value: form.ecoresponsable ? "Oui" : "Non" });
            if (form.interieur) featuresAuto.push({ label: "Intérieur", value: form.interieur });
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
            if (form.plateauSeparateur)
                featuresAuto.push({ label: "Plateau Séparateur", value: form.plateauSeparateur });
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
                        weight: variant.weight.trim() || undefined,
                        width: variant.width.trim() || undefined,
                        height: variant.height.trim() || undefined,
                        depth: variant.depth.trim() || undefined,
                        isExpandable: variant.isExpandable,
                        expandedWidth: variant.isExpandable ? variant.expandedWidth.trim() || undefined : undefined,
                        expandedHeight: variant.isExpandable ? variant.expandedHeight.trim() || undefined : undefined,
                        expandedDepth: variant.isExpandable ? variant.expandedDepth.trim() || undefined : undefined,
                        volume: variant.volume.trim() || undefined,
                        price: variant.price ? parseFloat(variant.price) : undefined,
                        stockInitial: variant.stockInitial ? parseFloat(variant.stockInitial) : undefined,
                        stock: variant.stock ? parseFloat(variant.stock) : undefined,
                        images,
                    };
                })
                .filter(
                    (v) =>
                        v.colorName ||
                        v.colorHex ||
                        v.size ||
                        v.weight ||
                        v.width ||
                        v.height ||
                        v.depth ||
                        v.isExpandable ||
                        v.expandedWidth ||
                        v.expandedHeight ||
                        v.expandedDepth ||
                        v.volume ||
                        typeof v.price === "number" ||
                        typeof v.stockInitial === "number" ||
                        typeof v.stock === "number" ||
                        (v.images && v.images.length > 0)
                );

            const variantImages = Array.from(
                new Set(variants.flatMap((variant) => variant.images || []))
            );
            const firstVariant = variants[0];
            const derivedPrice = firstVariant?.price || (form.price ? parseFloat(form.price) : 0);
            const derivedStock = variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);

            const productData = {
                name: form.name.trim(),
                description: form.description.trim(),
                descriptionShort: form.descriptionShort.trim(),
                price: derivedPrice,
                brandId: parseInt(form.brandId, 10),
                categoryId: parseInt(form.categoryId, 10),
                reference: form.reference.trim(),
                weight: firstVariant?.weight || undefined,
                width: firstVariant?.width || undefined,
                height: firstVariant?.height || undefined,
                depth: firstVariant?.depth || undefined,
                active: form.active,
                onSale: form.onSale,
                onlineOnly: form.onlineOnly,
                quantity: derivedStock,
                volume: firstVariant?.volume || undefined,
                images: variantImages,
                features,
                variants,
            };

            const result = isEdit
                ? await updateProduct(parseInt(id!, 10), productData)
                : await createProduct(productData);

            if (result.success) {
                const msg = isEdit
                    ? "Produit mis à jour avec succès"
                    : `Produit créé avec succès (ID: ${(result as any).id})`;
                setSuccess(msg);
                toast.success(msg);
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
    const allVariantImages = form.variants.flatMap((variant) => parseLines(variant.imagesText));
    const imagePreviewItems = allVariantImages.slice(0, 12);
    const allProductImages = allVariantImages;
    const selectedBrandName = brands.find((brand) => String(brand.id) === form.brandId)?.name || "Samsonite";
    const selectedCategoryName = categories.find((category) => String(category.id) === form.categoryId)?.name || selectedParent?.name || "Catégorie";
    const previewDescription = form.descriptionShort || form.description || "Description courte du produit.";
    const previewVariants = form.variants.map((variant, index) => ({
        ...variant,
        index,
        images: parseLines(variant.imagesText),
        priceNumber: Number(variant.price),
        stockNumber: Number(variant.stock),
        dimension: [variant.height, variant.width, variant.depth].map((value) => value.trim()).filter(Boolean).join(" x "),
        expandedDimension: [variant.expandedHeight, variant.expandedWidth, variant.expandedDepth].map((value) => value.trim()).filter(Boolean).join(" x "),
    }));
    const safePreviewVariantIndex = Math.min(previewVariantIndex, Math.max(0, previewVariants.length - 1));
    const selectedPreviewVariant = previewVariants[safePreviewVariantIndex] || previewVariants[0] || createEmptyVariant();
    const previewVariantImages = selectedPreviewVariant.images?.length ? selectedPreviewVariant.images : allProductImages;
    const previewImage = previewVariantImages[0] || "/placeholder.svg";
    const previewPrice = Number.isFinite(selectedPreviewVariant.priceNumber) && selectedPreviewVariant.priceNumber > 0
        ? selectedPreviewVariant.priceNumber.toLocaleString("fr-TN", { minimumFractionDigits: 3 })
        : "0,000";
    const previewStock = Number.isFinite(selectedPreviewVariant.stockNumber) ? selectedPreviewVariant.stockNumber : 0;
    const previewAvailability = previewStock > 0 ? "Disponible" : "Temporairement indisponible";
    const previewColorOptions = Array.from(
        new Map(
            previewVariants
                .filter((variant) => variant.colorName.trim() || variant.colorHex.trim())
                .map((variant) => [
                    `${variant.colorName.trim().toLowerCase()}::${variant.colorHex.trim().toLowerCase()}`,
                    variant,
                ])
        ).values()
    );
    const previewSizeOptions = Array.from(
        new Map(
            previewVariants
                .filter((variant) => variant.size.trim())
                .map((variant) => [variant.size.trim().toLowerCase(), variant])
        ).values()
    );
    const previewSpecRows = [
        { label: "Référence", value: form.reference },
        { label: "Modele", value: form.model },
        { label: "Matiere", value: form.matiere },
        { label: "Poignees", value: form.poignees },
        { label: "Poignee de traction", value: form.poigneeTraction },
        { label: "Roulettes", value: form.roulettes },
        { label: "Type de roues", value: form.typeRoues },
        { label: "Dimension", value: selectedPreviewVariant.dimension ? `${selectedPreviewVariant.dimension} cm` : "" },
        { label: "Dimension extensible", value: selectedPreviewVariant.isExpandable && selectedPreviewVariant.expandedDimension ? `${selectedPreviewVariant.expandedDimension} cm` : "" },
        { label: "Taille", value: selectedPreviewVariant.size },
        { label: "Volume", value: selectedPreviewVariant.volume },
        { label: "Poids", value: selectedPreviewVariant.weight },
        { label: "Stock", value: selectedPreviewVariant.stock },
    ].filter((row) => String(row.value || "").trim());
    const steps: Array<{ id: ProductFormStep; label: string; helper: string }> = [
        { id: 1, label: "Informations", helper: "Produit" },
        { id: 2, label: "Variantes", helper: "Couleurs, dimensions, stock" },
        { id: 3, label: "Aperçu", helper: "Validation finale" },
    ];

    const getGeneralValidationErrors = () => {
        const errors: string[] = [];
        if (!form.name.trim()) errors.push("Le nom du produit est obligatoire.");
        if (!form.brandId) errors.push("La marque est obligatoire.");
        if (!form.parentCategoryId) errors.push("La catégorie parent est obligatoire.");
        if (!form.categoryId) errors.push("La sous-catégorie est obligatoire.");
        return errors;
    };

    const getVariantsValidationErrors = () => {
        const errors: string[] = [];
        if (form.variants.length === 0) {
            errors.push("Un produit doit avoir au moins une variante.");
            return errors;
        }

        const seen = new Map<string, number>();
        for (const [index, variant] of form.variants.entries()) {
            const label = `Variante #${index + 1}`;
            const colorName = variant.colorName.trim();
            const size = variant.size.trim();
            const images = parseLines(variant.imagesText);

            if (!colorName) errors.push(`${label}: couleur obligatoire.`);
            if (!isValidPositiveNumber(variant.price)) {
                errors.push(`${label}: prix obligatoire, numérique et supérieur à 0.`);
            }
            if (!variant.stock.trim()) {
                errors.push(`${label}: stock actuel obligatoire.`);
            } else if (!isValidNonNegativeNumber(variant.stock)) {
                errors.push(`${label}: stock actuel numérique et positif ou nul.`);
            }
            if (!isValidNonNegativeNumber(variant.stockInitial)) {
                errors.push(`${label}: stock initial numérique et positif ou nul.`);
            }
            if (images.length === 0) {
                errors.push(`${label}: au moins une image est obligatoire.`);
            }
            if (variant.isExpandable && (!variant.expandedHeight.trim() || !variant.expandedWidth.trim() || !variant.expandedDepth.trim())) {
                errors.push(`${label}: dimensions avec extension obligatoires.`);
            }
            const invalidImage = images.find((image) => !isValidImageReference(image));
            if (invalidImage) {
                errors.push(`${label}: image invalide (${invalidImage}).`);
            }

            const key = getVariantUniqueKey(variant);
            if (colorName) {
                const firstIndex = seen.get(key);
                if (firstIndex !== undefined) {
                    errors.push(`${label}: doublon avec la variante #${firstIndex + 1}.`);
                } else {
                    seen.set(key, index);
                }
            }
        }

        return errors;
    };

    const validateGeneralStep = () => {
        const errors = getGeneralValidationErrors();
        if (errors.length > 0) {
            setError(errors[0]);
            return false;
        }
        setError("");
        return true;
    };

    const validateVariantsStep = () => {
        const errors = getVariantsValidationErrors();
        if (errors.length > 0) {
            setError(errors[0]);
            return false;
        }

        setError("");
        return true;
    };

    const goToStep = (step: ProductFormStep) => {
        if (step < currentStep) {
            setError("");
            setCurrentStep(step);
            return;
        }
        if (step >= 2 && !validateGeneralStep()) return;
        if (step >= 3 && !validateVariantsStep()) return;
        setCurrentStep(step);
    };

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
            <div className="max-w-5xl">
            <form onSubmit={(event) => event.preventDefault()} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        {steps.map((step) => {
                            const isCurrent = currentStep === step.id;
                            const isDone = currentStep > step.id;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => goToStep(step.id)}
                                    className={`flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors ${isCurrent ? "border-black bg-white shadow-sm" : isDone ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${isCurrent ? "bg-black text-white" : isDone ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                                        {step.id}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-black uppercase text-gray-950">{step.label}</span>
                                        <span className="block text-xs text-gray-500">{step.helper}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {currentStep === 1 && (
                <div className="space-y-5">
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

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                    <div>
                        <label htmlFor="product-desc-short" className="block text-sm font-medium text-gray-700 mb-1">
                            Description courte
                        </label>
                        <textarea
                            id="product-desc-short"
                            name="descriptionShort"
                            rows={3}
                            value={form.descriptionShort}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                            placeholder="Résumé visible sur la fiche produit..."
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
                        <p className="mt-1 text-xs text-gray-500">
                            Marque absente ?{" "}
                            <Link to="/admin/marques" className="font-bold text-black underline">
                                Gerer les marques
                            </Link>
                        </p>
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

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-4">
                        <h3 className="text-sm font-bold text-gray-900">Détails intérieurs et éco</h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Ces informations seront enregistrées comme caractéristiques produit.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Porte-Adresse</label>
                            <input
                                name="porteAdresse"
                                value={form.porteAdresse}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Étiquette d'identification rétractable"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plateau Séparateur</label>
                            <input
                                name="plateauSeparateur"
                                value={form.plateauSeparateur}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Dans les compartiments supérieurs & inférieurs"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Intérieur</label>
                            <input
                                name="interieur"
                                value={form.interieur}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-black"
                                placeholder="Organisation intérieure, doublure, sangles, séparateur..."
                            />
                        </div>
                        <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                            <input
                                id="ecoresponsable"
                                name="ecoresponsable"
                                type="checkbox"
                                checked={form.ecoresponsable}
                                onChange={handleChange}
                                className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                            />
                            <label htmlFor="ecoresponsable" className="text-sm text-gray-700">
                                Écoresponsable
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

                {/* Features */}
                <div>
                    <label htmlFor="product-features" className="block text-sm font-medium text-gray-700 mb-1">
                        Caractéristiques supplémentaires (optionnel)
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

                </div>
                )}

                {currentStep === 2 && (
                <div className="space-y-3">
                {/* Variants */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm font-bold text-gray-900">Variantes des valises</span>
                            <p className="mt-1 text-xs text-gray-500">Chaque variante combine une couleur, des dimensions, son prix, son stock et ses images. La taille est optionnelle.</p>
                        </div>
                        <button
                            type="button"
                            onClick={addVariant}
                            className="px-2 py-1 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-50"
                        >
                            + Ajouter une variante
                        </button>
                    </div>
                    {form.variants.length === 0 && (
                        <p className="text-xs text-red-500">Un produit doit avoir au moins une variante.</p>
                    )}
                    {form.variants.map((variant, index) => (
                        <div key={index} className="border rounded-md p-3 space-y-3 bg-gray-50">
                            <div className="flex justify-between items-center">
                                <span className="text-xs uppercase tracking-wide text-gray-500">
                                    Variante #{index + 1}
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => duplicateVariant(index)}
                                        className="text-xs font-semibold text-blue-700 hover:underline"
                                    >
                                        Dupliquer
                                    </button>
                                    <ConfirmDeleteDialog
                                        title="Supprimer cette variante ?"
                                        description={`La variante #${index + 1} et ses images associées seront retirées du formulaire.`}
                                        disabled={form.variants.length === 1}
                                        onConfirm={() => removeVariant(index)}
                                    >
                                        {(openDialog) => (
                                            <button
                                                type="button"
                                                onClick={openDialog}
                                                disabled={form.variants.length === 1}
                                                className="text-xs text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
                                                title={form.variants.length === 1 ? "Un produit doit garder au moins une variante" : "Supprimer cette variante"}
                                            >
                                                Supprimer
                                            </button>
                                        )}
                                    </ConfirmDeleteDialog>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <input
                                    name="colorName"
                                    value={variant.colorName}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Couleur (nom)"
                                />
                                <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1">
                                    <input
                                        name="colorHex"
                                        type="color"
                                        value={variant.colorHex || "#000000"}
                                        onChange={(e) => handleVariantChange(index, e)}
                                        className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white p-0.5"
                                        title="Choisir la couleur"
                                    />
                                    <input
                                        name="colorHex"
                                        value={variant.colorHex}
                                        onChange={(e) => handleVariantChange(index, e)}
                                        className="min-w-0 flex-1 text-sm outline-none"
                                        placeholder="#HEX"
                                    />
                                </div>
                                <input
                                    name="size"
                                    value={variant.size}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Taille"
                                />
                                <input
                                    name="volume"
                                    value={variant.volume}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Volume"
                                />
                                <input
                                    name="height"
                                    value={variant.height}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Hauteur"
                                />
                                <input
                                    name="width"
                                    value={variant.width}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Largeur"
                                />
                                <input
                                    name="depth"
                                    value={variant.depth}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Profondeur"
                                />
                                <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800">
                                    <input
                                        name="isExpandable"
                                        type="checkbox"
                                        checked={variant.isExpandable}
                                        onChange={(e) => handleVariantChange(index, e)}
                                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    Extensible
                                </label>
                                {variant.isExpandable && (
                                    <>
                                        <input
                                            name="expandedHeight"
                                            value={variant.expandedHeight}
                                            onChange={(e) => handleVariantChange(index, e)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Hauteur avec extension"
                                        />
                                        <input
                                            name="expandedWidth"
                                            value={variant.expandedWidth}
                                            onChange={(e) => handleVariantChange(index, e)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Largeur avec extension"
                                        />
                                        <input
                                            name="expandedDepth"
                                            value={variant.expandedDepth}
                                            onChange={(e) => handleVariantChange(index, e)}
                                            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                            placeholder="Profondeur avec extension"
                                        />
                                    </>
                                )}
                                <input
                                    name="weight"
                                    value={variant.weight}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Poids"
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
                                    name="stockInitial"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={variant.stockInitial}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Stock initial"
                                />
                                <input
                                    name="stock"
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={variant.stock}
                                    onChange={(e) => handleVariantChange(index, e)}
                                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                    placeholder="Stock actuel"
                                />
                            </div>
                            <div className="space-y-3 rounded-md border border-gray-200 bg-white p-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Images de cette variante</p>
                                        <p className="text-xs text-gray-500">Ces images s'afficheront quand la couleur/taille est sélectionnée.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => useProductImagesForVariant(index)}
                                            disabled={parseLines(form.imagesText).length === 0}
                                            className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 hover:border-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                                            title="Copier les images générales du produit dans cette variante"
                                        >
                                            <Copy className="h-4 w-4" />
                                            Utiliser images produit
                                        </button>
                                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-black px-3 py-2 text-xs font-bold text-white hover:bg-gray-800">
                                            {uploadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            Importer
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={(event) => handleVariantImageUpload(index, event)}
                                                disabled={uploadingImages}
                                            />
                                        </label>
                                    </div>
                                </div>
                                {parseLines(variant.imagesText).length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                        {parseLines(variant.imagesText).map((image, imageIndex) => (
                                            <div
                                                key={`${image}-${imageIndex}`}
                                                draggable
                                                onDragStart={() => setDraggedVariantImage({ variantIndex: index, imageIndex })}
                                                onDragOver={(event) => event.preventDefault()}
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    if (!draggedVariantImage || draggedVariantImage.variantIndex !== index) return;
                                                    reorderVariantImage(index, draggedVariantImage.imageIndex, imageIndex);
                                                    setDraggedVariantImage(null);
                                                }}
                                                onDragEnd={() => setDraggedVariantImage(null)}
                                                className={`group relative overflow-hidden rounded-md border bg-white transition ${
                                                    draggedVariantImage?.variantIndex === index &&
                                                    draggedVariantImage.imageIndex === imageIndex
                                                        ? "border-black opacity-60"
                                                        : "border-gray-200 hover:border-gray-400"
                                                }`}
                                                title="Glisser pour changer l'ordre"
                                            >
                                                <ConfirmDeleteDialog
                                                    title="Supprimer cette image ?"
                                                    description="Cette image sera retiree de la variante."
                                                    onConfirm={() => removeVariantImage(index, image)}
                                                >
                                                    {(openDialog) => (
                                                        <button
                                                            type="button"
                                                            onClick={openDialog}
                                                            className="absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-sm ring-1 ring-gray-200 transition hover:bg-red-600 hover:text-white"
                                                            aria-label="Supprimer cette image"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </ConfirmDeleteDialog>
                                                <div className="absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm ring-1 ring-gray-200">
                                                    <GripVertical className="h-4 w-4" />
                                                </div>
                                                <div className="aspect-square p-1">
                                                    <img
                                                        src={image}
                                                        alt={`Variante ${index + 1} image ${imageIndex + 1}`}
                                                        className="h-full w-full object-contain"
                                                        onError={(event) => {
                                                            event.currentTarget.src = "/placeholder.svg";
                                                        }}
                                                    />
                                                </div>
                                                <div className="border-t border-gray-100 px-2 py-1 text-center text-[11px] font-bold text-gray-500">
                                                    #{imageIndex + 1}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {parseLines(variant.imagesText).length === 0 && (
                                    <div className="flex items-center gap-3 rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                                        <ImageOff className="h-4 w-4 shrink-0" />
                                        <span className="font-semibold">
                                            Aucune image ajoutée. Une image est obligatoire pour publier cette variante.
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                )}
                {currentStep === 3 && (
                <div className="space-y-5">
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-5 py-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Aperçu fidèle de la fiche produit client</p>
                            <p className="mt-1 text-xs text-gray-500">Clique sur les tailles et couleurs pour vérifier l'image, le prix, le stock et les caractéristiques de chaque variante.</p>
                        </div>

                        <div className="grid gap-8 p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.8fr)]">
                            <div>
                                <div className="mx-auto flex aspect-square max-w-[460px] items-center justify-center border border-gray-100 bg-white p-6">
                                    <img
                                        src={previewImage}
                                        alt="Aperçu produit"
                                        className="h-full w-full object-contain"
                                        onError={(event) => {
                                            event.currentTarget.src = "/placeholder.svg";
                                        }}
                                    />
                                </div>
                                {previewVariantImages.length > 1 && (
                                    <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                        {previewVariantImages.map((image, imageIndex) => (
                                            <button
                                                key={`${image}-${imageIndex}`}
                                                type="button"
                                                className={`h-16 w-16 flex-shrink-0 border-2 bg-white p-1 ${imageIndex === 0 ? "border-black" : "border-transparent hover:border-gray-300"}`}
                                                title={`Image ${imageIndex + 1}`}
                                            >
                                                <img src={image} alt="" className="h-full w-full object-contain" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">{selectedBrandName}</p>
                                    <h2 className="mt-1 text-3xl font-black uppercase leading-tight text-gray-950">{form.name || "Nom du produit"}</h2>
                                    <p className="mt-2 text-base leading-7 text-gray-700">{previewDescription}</p>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 border-y border-gray-200 py-4">
                                    <p className="min-w-[135px] text-2xl font-black text-gray-950">{previewPrice} DT</p>
                                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase ${previewStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                                        <span className="h-2 w-2 rounded-full bg-current" />
                                        {previewAvailability}
                                    </span>
                                    <span className="text-xs font-semibold text-gray-500">TVA incl.</span>
                                </div>

                                {previewSizeOptions.length > 0 && (
                                    <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)]">
                                        <p className="pt-2 text-xs font-black uppercase tracking-wide text-gray-950">Taille</p>
                                        <div className="flex flex-wrap gap-2">
                                            {previewSizeOptions.map((variant) => {
                                                const isSelected = variant.index === selectedPreviewVariant.index;
                                                return (
                                                    <button
                                                        key={`preview-size-${variant.index}`}
                                                        type="button"
                                                        onClick={() => setPreviewVariantIndex(variant.index)}
                                                        className={`min-h-11 min-w-[74px] border px-4 py-2 text-sm font-semibold ${isSelected ? "border-black bg-black text-white" : "border-gray-300 bg-white text-black hover:border-black"}`}
                                                    >
                                                        {variant.size}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {previewSpecRows.some((row) => /dimension|volume|poids/i.test(row.label)) && (
                                    <dl className="grid gap-2 border-y border-gray-200 py-4 text-sm">
                                        {previewSpecRows.filter((row) => /dimension|volume|poids/i.test(row.label)).map((row) => (
                                            <div key={row.label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-4">
                                                <dt className="font-black uppercase text-gray-950">{row.label}</dt>
                                                <dd className="text-gray-600">{row.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}

                                {previewColorOptions.length > 0 && (
                                    <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)]">
                                        <p className="pt-2 text-xs font-black uppercase tracking-wide text-gray-950">
                                            Couleur
                                            {selectedPreviewVariant.colorName && <span className="mt-1 block text-xs font-semibold normal-case text-gray-500">{selectedPreviewVariant.colorName}</span>}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            {previewColorOptions.map((variant) => {
                                                const isSelected = variant.index === selectedPreviewVariant.index;
                                                return (
                                                    <button
                                                        key={`preview-color-${variant.index}`}
                                                        type="button"
                                                        onClick={() => setPreviewVariantIndex(variant.index)}
                                                        className={`flex h-11 w-11 items-center justify-center rounded-full border bg-white ${isSelected ? "border-black shadow-[0_0_0_4px_rgba(0,0,0,0.06)]" : "border-gray-300"}`}
                                                        title={variant.colorName || "Couleur"}
                                                    >
                                                        <span className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: variant.colorHex || "#d1d5db" }} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <button type="button" className="flex w-full items-center justify-center gap-2 bg-black px-4 py-4 text-sm font-black uppercase tracking-wide text-white">
                                    <ShoppingBag className="h-4 w-4" />
                                    Ajouter au panier
                                </button>
                            </div>
                        </div>

                        {previewSpecRows.length > 0 && (
                            <div className="border-t border-gray-200 p-5">
                                <h3 className="mb-4 text-base font-black uppercase tracking-tight">Détails du produit</h3>
                                <div className="bg-gray-50">
                                    <div className="bg-gray-100 px-5 py-4 text-sm font-black uppercase tracking-wide text-gray-600">Specifications</div>
                                    <dl className="divide-y divide-gray-200 px-5">
                                        {previewSpecRows.map((row) => (
                                            <div key={`${row.label}-${row.value}`} className="grid gap-3 py-3.5 text-sm sm:grid-cols-[190px_minmax(0,1fr)]">
                                                <dt className="font-semibold text-gray-600">{row.label}</dt>
                                                <dd className="leading-6 text-gray-600">{row.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}
{/* Step navigation */}
                <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => goToStep((currentStep - 1) as ProductFormStep)}
                        disabled={currentStep === 1}
                        className="inline-flex items-center justify-center rounded-md border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Retour à l'étape précédente
                    </button>
                    {currentStep < 3 ? (
                        <button
                            type="button"
                            onClick={() => goToStep((currentStep + 1) as ProductFormStep)}
                            className="inline-flex items-center justify-center rounded-md bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
                        >
                            {currentStep === 1 ? "Continuer vers les variantes" : "Continuer vers l'aperçu"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSaveProduct}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {loading
                                ? (isEdit ? "Mise à jour..." : "Création...")
                                : (isEdit ? "Valider et enregistrer" : "Valider et créer le produit")}
                        </button>
                    )}
                </div>
            </form>
            </div>
        </div>
    );
};

export default AdminProductForm;

import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

export interface PromotionPayload {
    name?: string;
    percentage?: number | string;
    active?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    priority?: number | string;
    brandIds?: number[];
    categoryIds?: number[];
    productIds?: number[];
}

export interface PromotionProductLike {
    id: number;
    brandId?: number | null;
    categories?: Array<{ categoryId?: number; category?: { id: number } }>;
}

const promotionInclude = {
    brands: { include: { brand: true } },
    categories: { include: { category: true } },
    products: { include: { product: { include: { brand: true, categories: { include: { category: true } } } } } },
} satisfies Prisma.PromotionRuleInclude;

export type PromotionWithTargets = Prisma.PromotionRuleGetPayload<{ include: typeof promotionInclude }>;

const uniqIds = (ids?: number[]) =>
    Array.from(new Set((ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)));

const toDate = (value?: string | null, boundary: "start" | "end" = "start") => {
    if (!value) return null;
    const trimmed = value.trim();
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    const date = dateOnly
        ? new Date(
              Number(dateOnly[1]),
              Number(dateOnly[2]) - 1,
              Number(dateOnly[3]),
              boundary === "start" ? 0 : 23,
              boundary === "start" ? 0 : 59,
              boundary === "start" ? 0 : 59,
              boundary === "start" ? 0 : 999
          )
        : new Date(trimmed);
    if (Number.isNaN(date.getTime())) throw new Error("Date de promotion invalide");
    return date;
};

const normalizePayload = (payload: PromotionPayload) => {
    const name = String(payload.name || "").trim();
    const percentage = Number(payload.percentage);
    const startsAt = toDate(payload.startsAt, "start");
    const endsAt = toDate(payload.endsAt, "end");
    const priority = Math.floor(Number(payload.priority || 0));

    if (!name) throw new Error("Le nom de la promotion est obligatoire");
    if (!Number.isFinite(percentage) || percentage < 1 || percentage > 99) {
        throw new Error("Le pourcentage doit etre compris entre 1 et 99");
    }
    if (startsAt && endsAt && startsAt > endsAt) {
        throw new Error("La date de debut doit etre avant la date de fin");
    }

    return {
        name,
        percentage,
        active: payload.active !== false,
        startsAt,
        endsAt,
        priority: Number.isFinite(priority) ? priority : 0,
        brandIds: uniqIds(payload.brandIds),
        categoryIds: uniqIds(payload.categoryIds),
        productIds: uniqIds(payload.productIds),
    };
};

const validateTargets = async (payload: ReturnType<typeof normalizePayload>) => {
    const [brands, categories, products] = await Promise.all([
        payload.brandIds.length ? prisma.brand.count({ where: { id: { in: payload.brandIds } } }) : 0,
        payload.categoryIds.length ? prisma.category.count({ where: { id: { in: payload.categoryIds } } }) : 0,
        payload.productIds.length ? prisma.product.count({ where: { id: { in: payload.productIds } } }) : 0,
    ]);

    if (brands !== payload.brandIds.length) throw new Error("Une ou plusieurs marques selectionnees n'existent pas");
    if (categories !== payload.categoryIds.length) throw new Error("Une ou plusieurs categories selectionnees n'existent pas");
    if (products !== payload.productIds.length) throw new Error("Un ou plusieurs produits selectionnes n'existent pas");
};

export const isPromotionCurrentlyActive = (promotion: PromotionWithTargets, now = new Date()) =>
    promotion.active &&
    (!promotion.startsAt || promotion.startsAt <= now) &&
    (!promotion.endsAt || promotion.endsAt >= now);

export const promotionMatchesProduct = (promotion: PromotionWithTargets, product: PromotionProductLike) => {
    const brandIds = new Set(promotion.brands.map((item) => item.brandId));
    const categoryIds = new Set(promotion.categories.map((item) => item.categoryId));
    const productIds = new Set(promotion.products.map((item) => item.productId));
    const hasTargets = brandIds.size > 0 || categoryIds.size > 0 || productIds.size > 0;

    if (!hasTargets) return true;
    if (product.brandId && brandIds.has(product.brandId)) return true;
    if (productIds.has(product.id)) return true;

    return (product.categories || []).some((relation) => {
        const categoryId = relation.categoryId || relation.category?.id;
        return Boolean(categoryId && categoryIds.has(categoryId));
    });
};

export const getBestPromotionForProduct = (
    product: PromotionProductLike,
    promotions: PromotionWithTargets[],
    now = new Date()
) => {
    return promotions
        .filter((promotion) => isPromotionCurrentlyActive(promotion, now) && promotionMatchesProduct(promotion, product))
        .sort((a, b) => {
            const priorityDiff = b.priority - a.priority;
            if (priorityDiff) return priorityDiff;
            const percentageDiff = Number(b.percentage) - Number(a.percentage);
            if (percentageDiff) return percentageDiff;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        })[0] || null;
};

export const getPromotionPrice = (basePrice: number, promotion?: PromotionWithTargets | null) => {
    if (!promotion || !Number.isFinite(basePrice) || basePrice <= 0) return basePrice;
    return Math.max(0, Number((basePrice * (1 - Number(promotion.percentage) / 100)).toFixed(2)));
};

export const listActivePromotions = () =>
    prisma.promotionRule.findMany({
        where: {
            active: true,
            AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        include: promotionInclude,
        orderBy: [{ priority: "desc" }, { percentage: "desc" }, { updatedAt: "desc" }],
    });

const promotionProductWhere = (payload: ReturnType<typeof normalizePayload>): Prisma.ProductWhereInput => {
    const or: Prisma.ProductWhereInput[] = [];
    if (payload.brandIds.length) or.push({ brandId: { in: payload.brandIds } });
    if (payload.categoryIds.length) or.push({ categories: { some: { categoryId: { in: payload.categoryIds } } } });
    if (payload.productIds.length) or.push({ id: { in: payload.productIds } });
    return or.length ? { OR: or } : {};
};

export const previewPromotion = async (payload: PromotionPayload) => {
    const normalized = normalizePayload(payload);
    await validateTargets(normalized);

    const products = await prisma.product.findMany({
        where: promotionProductWhere(normalized),
        orderBy: { name: "asc" },
        include: {
            brand: true,
            categories: { include: { category: true } },
            variants: true,
        },
    });

    const percentage = normalized.percentage;
    const rows = products.map((product) => {
        const originalPrice = Number(product.price);
        const promotionPrice = Math.max(0, Number((originalPrice * (1 - percentage / 100)).toFixed(2)));
        return {
            id: product.id,
            name: product.name,
            brandName: product.brand?.name || "Sans marque",
            categoryNames: product.categories.map((relation) => relation.category.name),
            originalPrice,
            promotionPrice,
            variantCount: product.variants.length,
        };
    });

    return {
        productCount: rows.length,
        variantCount: rows.reduce((total, product) => total + product.variantCount, 0),
        products: rows,
    };
};

const summarizePromotion = async (promotion: PromotionWithTargets) => {
    const preview = await previewPromotion({
        name: promotion.name,
        percentage: Number(promotion.percentage),
        active: promotion.active,
        startsAt: promotion.startsAt?.toISOString() || null,
        endsAt: promotion.endsAt?.toISOString() || null,
        priority: promotion.priority,
        brandIds: promotion.brands.map((item) => item.brandId),
        categoryIds: promotion.categories.map((item) => item.categoryId),
        productIds: promotion.products.map((item) => item.productId),
    });

    return {
        id: promotion.id,
        name: promotion.name,
        percentage: Number(promotion.percentage),
        active: promotion.active,
        startsAt: promotion.startsAt,
        endsAt: promotion.endsAt,
        priority: promotion.priority,
        brandIds: promotion.brands.map((item) => item.brandId),
        brandNames: promotion.brands.map((item) => item.brand.name),
        categoryIds: promotion.categories.map((item) => item.categoryId),
        categoryNames: promotion.categories.map((item) => item.category.name),
        productIds: promotion.products.map((item) => item.productId),
        productNames: promotion.products.map((item) => item.product.name),
        productCount: preview.productCount,
        variantCount: preview.variantCount,
        createdAt: promotion.createdAt,
        updatedAt: promotion.updatedAt,
    };
};

export const listPromotions = async () => {
    const promotions = await prisma.promotionRule.findMany({
        include: promotionInclude,
        orderBy: [{ active: "desc" }, { priority: "desc" }, { updatedAt: "desc" }],
    });

    return Promise.all(promotions.map(summarizePromotion));
};

export const getPromotion = async (id: number) => {
    const promotion = await prisma.promotionRule.findUnique({ where: { id }, include: promotionInclude });
    return promotion ? summarizePromotion(promotion) : null;
};

const writeTargets = (payload: ReturnType<typeof normalizePayload>) => ({
    brands: { create: payload.brandIds.map((brandId) => ({ brandId })) },
    categories: { create: payload.categoryIds.map((categoryId) => ({ categoryId })) },
    products: { create: payload.productIds.map((productId) => ({ productId })) },
});

export const createPromotion = async (payload: PromotionPayload) => {
    const normalized = normalizePayload(payload);
    await validateTargets(normalized);

    const promotion = await prisma.promotionRule.create({
        data: {
            name: normalized.name,
            percentage: normalized.percentage,
            active: normalized.active,
            startsAt: normalized.startsAt,
            endsAt: normalized.endsAt,
            priority: normalized.priority,
            ...writeTargets(normalized),
        },
        include: promotionInclude,
    });

    return summarizePromotion(promotion);
};

export const updatePromotion = async (id: number, payload: PromotionPayload) => {
    const normalized = normalizePayload(payload);
    await validateTargets(normalized);

    const promotion = await prisma.$transaction(async (tx) => {
        await tx.promotionBrand.deleteMany({ where: { promotionId: id } });
        await tx.promotionCategory.deleteMany({ where: { promotionId: id } });
        await tx.promotionProduct.deleteMany({ where: { promotionId: id } });

        return tx.promotionRule.update({
            where: { id },
            data: {
                name: normalized.name,
                percentage: normalized.percentage,
                active: normalized.active,
                startsAt: normalized.startsAt,
                endsAt: normalized.endsAt,
                priority: normalized.priority,
                ...writeTargets(normalized),
            },
            include: promotionInclude,
        });
    });

    return summarizePromotion(promotion);
};

export const deletePromotion = async (id: number) => {
    await prisma.promotionRule.delete({ where: { id } });
    return { success: true };
};

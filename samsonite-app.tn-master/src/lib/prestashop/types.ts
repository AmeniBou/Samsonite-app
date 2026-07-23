// ---------- MULTILANG ----------
export interface PSLangField {
  id: string;
  value: string;
}

export interface PSAssociationId {
  id: string;
  imageUrl?: string;
}

export interface PSAssociationStock {
  id: string;
  id_product_attribute: string;
}

export interface PSAssociationFeature {
  id: string;
  id_feature_value: string;
}

export interface PSCombination {
  id: number | string;
  id_product: number | string;
  price?: string;
  reference?: string;
  default_on?: string;
  associations?: {
    product_option_values?: PSAssociationId[];
    images?: PSAssociationId[];
  };
}

export interface PSProductOptionValue {
  id: number | string;
  id_attribute_group?: number | string;
  color?: string;
  name?: PSLangField[];
}

export interface PSStockAvailable {
  id: number | string;
  id_product: number | string;
  id_product_attribute: number | string;
  quantity?: number | string;
}

export interface PSFeature {
  id: number | string;
  name: PSLangField[];
}

export interface PSFeatureValue {
  id: number | string;
  id_feature: number | string;
  value: PSLangField[];
}

export interface PSProductOption {
  id: number | string;
  name?: PSLangField[];
  public_name?: PSLangField[];
}

// ---------- PRESTASHOP ----------
export interface PSProduct {
  id: number | string;
  id_default_image?: number | string;
  id_default_combination?: number | string;
  id_manufacturer?: number | string;
  manufacturer_name?: string;

  name: PSLangField[];
  description: PSLangField[];
  description_short: PSLangField[];
  link_rewrite?: PSLangField[];

  on_sale: string,
  online_only: string,

  price: string;
  reference: string;
  id_category_default: number | string;
  active: string;

  weight: string;
  width: string;
  height: string;
  depth: string;

  quantity?: number | string;
  associations?: {
    categories?: PSAssociationId[];
    images?: PSAssociationId[];
    combinations?: PSAssociationId[];
    product_option_values?: PSAssociationId[];
    product_features?: PSAssociationFeature[];
    stock_availables?: PSAssociationStock[];
  };
}

export interface PSCategory {
  id: number | string;
  id_parent: number | string;

  name: PSLangField[];
  description?: PSLangField[];
  link_rewrite?: PSLangField[];

  active: string;
}

// ---------- FRONT DISPLAY ----------
export interface ColorOption {
  combinationId: number;
  name: string;
  hex: string;
  productId: number;
}

export interface ProductVariant {
  combinationId: number;
  price: number;
  stock: number;
  isDefault: boolean;
  size?: string;
  dimensions?: string;
  extensibleDimensions?: string;
  weight?: string;
  volume?: string;
  color?: {
    name: string;
    hex: string;
  };
  images: string[];
}

export interface ProductCharacteristic {
  label: string;
  value: string;
}

export interface ProductDisplay {
  id: number;
  name: string;
  brandName: string;
  collection: string;
  shortDescription: string;
  description: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  images: string[];
  colors: ColorOption[];
  variants: ProductVariant[];
  characteristics: ProductCharacteristic[];
  dimensions?: string;
  weight?: string;
  volume?: string;
  slug: string;
  categorySlug: string;
  categorySlugs: string[];
  stock?: number;
}

export interface CategoryDisplay {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  children?: Array<{
    name: string;
    slug: string;
  }>;
}

export interface CartItem {
  product: ProductDisplay;
  quantity: number;
  selectedColor?: string;
}

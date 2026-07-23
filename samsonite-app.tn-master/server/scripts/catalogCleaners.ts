export type ProductLikeRow = {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  url?: string;
};

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ãª/g, "ê"],
  [/Ã«/g, "ë"],
  [/Ã /g, "à"],
  [/Ã¢/g, "â"],
  [/Ã¤/g, "ä"],
  [/Ã´/g, "ô"],
  [/Ã¶/g, "ö"],
  [/Ã®/g, "î"],
  [/Ã¯/g, "ï"],
  [/Ã»/g, "û"],
  [/Ã¼/g, "ü"],
  [/Ã§/g, "ç"],
  [/Ã‰/g, "É"],
  [/Ãˆ/g, "È"],
  [/ÃŠ/g, "Ê"],
  [/Ã€/g, "À"],
  [/Ã‡/g, "Ç"],
  [/Â /g, " "],
  [/Â/g, ""],
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â€“/g, "-"],
  [/â€”/g, "-"],
  [/â€¦/g, "..."],
  [/ï¿½/g, ""],
];

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
  eacute: "é",
  egrave: "è",
  ecirc: "ê",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ugrave: "ù",
};

export function cleanText(value?: string | null): string | undefined {
  if (value == null) return undefined;

  let text = String(value);
  for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  text = text
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, entity) => HTML_ENTITIES[entity.toLowerCase()] ?? match)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length ? text : undefined;
}

export function normalizeKey(value?: string | null): string {
  return (cleanText(value) ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(value: string): string {
  return normalizeKey(value).replace(/\s+/g, "-");
}

const CATEGORY_ALIASES: Record<string, string> = {
  accueil: "Accueil",
  accessoire: "Accessoires",
  accessoires: "Accessoires",
  cadenas: "Cadenas",
  sangles: "Sangles",
  sangle: "Sangles",
  "coussin de voyage": "Coussin de voyage",
  "housse de valise": "Housse de valise",
  masque: "Masques",
  masques: "Masques",
  parapluie: "Parapluie",
  valise: "Valises",
  valises: "Valises",
  rigide: "Rigides",
  rigides: "Rigides",
  souple: "Souples",
  souples: "Souples",
  "ensemble de valises": "Ensembles de valises",
  "ensembles de valises": "Ensembles de valises",
  "sac a dos": "Sac à dos",
  "sacs a dos": "Sac à dos",
  "sac ordinateur": "Sac Ordinateur",
  "sacs ordinateur": "Sac Ordinateur",
  "pilot case": "Pilot Case",
  "pilote case": "Pilot Case",
  portefeuille: "Portefeuille",
  business: "Business",
  "disney and enfant": "Disney & Enfant",
  "disney enfant": "Disney & Enfant",
  "disney et enfant": "Disney & Enfant",
  "valise disney": "Disney & Enfant",
  "valise enfant": "Valise enfant",
  "sac a dos enfant": "Sac à dos enfants",
  "sac a dos enfants": "Sac à dos enfants",
  "sac scolaire": "Sac scolaire",
};

export const ROOT_CATEGORIES = [
  "Valises",
  "Sacs",
  "Business",
  "Disney & Enfant",
  "Accessoires",
  "Bagages à main",
  "Offres d'été",
];

export function canonicalCategoryName(value?: string | null): string | undefined {
  const cleaned = cleanText(value)?.replace(/^[^\p{L}\p{N}]+/u, "").trim();
  if (!cleaned) return undefined;
  const key = normalizeKey(cleaned);
  return CATEGORY_ALIASES[key] ?? cleaned;
}

export function getParentCategoryName(categoryName: string): string | undefined {
  const name = canonicalCategoryName(categoryName) ?? categoryName;
  if (["Rigides", "Souples", "Ensembles de valises"].includes(name)) return "Valises";
  if (["Sac à dos"].includes(name)) return "Sacs";
  if (["Sac Ordinateur", "Pilot Case", "Portefeuille"].includes(name)) return "Business";
  if (["Valise enfant", "Sac à dos enfants", "Sac scolaire"].includes(name)) return "Disney & Enfant";
  if (["Housse de valise", "Cadenas", "Sangles", "Coussin de voyage", "Parapluie", "Masques"].includes(name)) {
    return "Accessoires";
  }
  return undefined;
}

export function inferProductCategory(row: ProductLikeRow): string | undefined {
  const rawCategory = canonicalCategoryName(row.category);
  const text = normalizeKey(`${row.name ?? ""} ${row.description ?? ""} ${row.url ?? ""}`);

  if (rawCategory && rawCategory !== "Accueil") return rawCategory;

  if (/pilot case|pilote case|pro dlx/.test(text)) return "Pilot Case";
  if (/portefeuille|wallet|slg/.test(text)) return "Portefeuille";
  if (/housse/.test(text)) return "Housse de valise";
  if (/cadenas/.test(text)) return "Cadenas";
  if (/sangle/.test(text)) return "Sangles";
  if (/parapluie/.test(text)) return "Parapluie";
  if (/masque/.test(text)) return "Masques";
  if (/sac scolaire/.test(text)) return "Sac scolaire";
  if (/sac a dos enfant|backpack enfant/.test(text)) return "Sac à dos enfants";
  if (/disney|minnie|mickey|star wars|dream rider|valise enfant/.test(text)) return "Disney & Enfant";
  if (/sac ordinateur|laptop|ordinateur|pc 15|pc 17|guardit|urban groove|at work/.test(text)) return "Sac Ordinateur";
  if (/sac a dos|backpack|roader|biz2go/.test(text)) return "Sac à dos";
  if (/set de|ensemble|3 valises|trois valises/.test(text)) return "Ensembles de valises";
  if (/souple|soft|duffle|hyperspeed|pulsonic|crosstrack/.test(text)) return "Souples";
  if (/valise|spinner|spiner|rigide|trolley|4 roues|roulettes|proxis|c lite|essens|stackd|magnum|cosmolite|s cure|attrix|nuon|boss alu|urbify|dashpop|soundbox|airconic|linex|deep dive|summer hit|high turn/.test(text)) {
    return "Rigides";
  }

  return rawCategory && rawCategory !== "Accueil" ? rawCategory : undefined;
}

export function canonicalBrandName(rawBrand?: string | null, row: ProductLikeRow = {}): string | undefined {
  const raw = cleanText(rawBrand);
  const key = normalizeKey(raw);
  const text = normalizeKey(`${raw ?? ""} ${row.name ?? ""} ${row.description ?? ""} ${row.url ?? ""}`);

  if (/american tourister/.test(text) || key === "american tourister") return "American Tourister";
  if (/samsonite/.test(text) || key === "samsonite") return "Samsonite";
  if (/disney/.test(text) || key === "disney") return "Disney";
  if (/lipault/.test(text) || key === "lipault") return "Lipault";

  return raw;
}

const COLOR_HEX: Record<string, string> = {
  noir: "#111111",
  black: "#111111",
  bleu: "#1f5f9f",
  blue: "#1f5f9f",
  gris: "#8b949e",
  grey: "#8b949e",
  gray: "#8b949e",
  rouge: "#d7352a",
  red: "#d7352a",
  vert: "#0f6b50",
  green: "#0f6b50",
  orange: "#f47b20",
  jaune: "#d9a51b",
  yellow: "#d9a51b",
  rose: "#d46a8c",
  pink: "#d46a8c",
  violet: "#7562a8",
  purple: "#7562a8",
  blanc: "#f2f2f2",
  white: "#f2f2f2",
  beige: "#d4c7b4",
  kaki: "#68735d",
  khaki: "#68735d",
  argent: "#c8c9cc",
  silver: "#c8c9cc",
};

export function getColorHex(value?: string | null): string | undefined {
  const key = normalizeKey(value);
  if (!key) return undefined;
  const direct = COLOR_HEX[key];
  if (direct) return direct;
  const part = key.split(" ").find((word) => COLOR_HEX[word]);
  return part ? COLOR_HEX[part] : undefined;
}

export function normalizeAvailability(value?: string | null): string | undefined {
  const text = cleanText(value);
  if (!text) return undefined;
  if (/instock/i.test(text)) return "https://schema.org/InStock";
  if (/outofstock/i.test(text)) return "https://schema.org/OutOfStock";
  return text;
}



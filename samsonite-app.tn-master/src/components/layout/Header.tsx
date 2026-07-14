import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  MapPin,
  Menu,
  Search,
  ShoppingCart,
  User,
  X,
} from "lucide-react";

import { useCart } from "@/hooks/useCart";
import { useLanguage } from "@/lib/i18n";
import { fetchDisplayCategories, fetchDisplayProducts } from "@/lib/prestashop/catalog";
import type { CategoryDisplay, ProductDisplay } from "@/lib/prestashop/types";
import { getSearchSuggestions } from "@/lib/search";

interface NavItem {
  name: string;
  slug: string;
  highlight?: boolean;
}

interface MenuGroup {
  title: string;
  slug: string;
  links: NavItem[];
}

const PRIMARY_NAV: NavItem[] = [
  { name: "OFFRES D'ETE", slug: "promos", highlight: true },
  { name: "BAGAGES A MAIN", slug: "bagages-a-main" },
  { name: "DISNEY & ENFANT", slug: "disney-amp-enfant" },
  { name: "ACCESSOIRES", slug: "accessoires" },
];

const VALISES_NAV_LINKS: NavItem[] = [
  { name: "Toutes les valises", slug: "valises" },
  { name: "Valises rigides", slug: "rigides" },
  { name: "Valises souples", slug: "souples" },
];

const SACS_NAV_LINKS: NavItem[] = [
  { name: "Sacs a dos", slug: "sac-a-dos" },
  { name: "Sac ordinateur", slug: "sac-ordinateur" },
];

const DISNEY_NAV_LINKS: NavItem[] = [
  { name: "Disney & Enfant / Valise Disney", slug: "disney-amp-enfant" },
  { name: "Sacs enfants & scolaire", slug: "sac-scolaire" },
];

const ACCESSOIRES_NAV_LINKS: NavItem[] = [
  { name: "Tous les accessoires", slug: "accessoires" },
  { name: "Cadenas", slug: "cadenas" },
  { name: "Sangles", slug: "sangles" },
  { name: "Housse de valise", slug: "housse-de-valise" },
  { name: "Coussin de voyage", slug: "coussin-de-voyage" },
  { name: "Parapluie", slug: "parapluie" },
  { name: "Masques", slug: "masques" },
];

const FALLBACK_CATEGORIES: CategoryDisplay[] = [
  { id: 1, name: "Valises", slug: "valises" },
  { id: 2, name: "Sacs a dos", slug: "sac-a-dos" },
  { id: 3, name: "Business", slug: "business" },
  { id: 4, name: "Accessoires", slug: "accessoires" },
  { id: 5, name: "Promos", slug: "promos" },
];

const EXPLORER_GROUPS: MenuGroup[] = [
  {
    title: "Valises",
    slug: "valises",
    links: [
      { name: "Rigides", slug: "rigides" },
      { name: "Souples", slug: "souples" },
      { name: "Bagages a main", slug: "bagages-a-main" },
      { name: "Ensembles de valises", slug: "ensembles-de-valises" },
      { name: "Valise enfant", slug: "valise-enfant" },
    ],
  },
  {
    title: "Sacs",
    slug: "sacs",
    links: [
      { name: "Sacs a dos", slug: "sac-a-dos" },
      { name: "Sac ordinateur", slug: "sac-ordinateur" },
    ],
  },
  {
    title: "Business",
    slug: "business",
    links: [
      { name: "Pilot Case", slug: "pilot-case" },
      { name: "Portefeuille", slug: "portefeuille" },
    ],
  },
  {
    title: "Accessoires",
    slug: "accessoires",
    links: [
      { name: "Cadenas", slug: "cadenas" },
      { name: "Sangles", slug: "sangles" },
      { name: "Housse de valise", slug: "housse-de-valise" },
      { name: "Coussin de voyage", slug: "coussin-de-voyage" },
      { name: "Parapluie", slug: "parapluie" },
      { name: "Masques", slug: "masques" },
    ],
  },
  {
    title: "Disney & Enfant",
    slug: "disney-amp-enfant",
    links: [
      { name: "Disney & Enfant / Valise Disney", slug: "disney-amp-enfant" },
      { name: "Sacs enfants & scolaire", slug: "sac-scolaire" },
    ],
  },
];

const Header = () => {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [valisesOpen, setValisesOpen] = useState(false);
  const [sacsOpen, setSacsOpen] = useState(false);
  const [disneyOpen, setDisneyOpen] = useState(false);
  const [accessoiresOpen, setAccessoiresOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [products, setProducts] = useState<ProductDisplay[]>([]);
  const { totalItems } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const labelBySlug: Record<string, string> = {
    promos: t("nav.summer"),
    "bagages-a-main": t("nav.cabin"),
    "disney-amp-enfant": t("nav.disneyKids"),
    accessoires: t("nav.accessories"),
    valises: t("nav.allSuitcases"),
    rigides: t("nav.hardSuitcases"),
    souples: t("nav.softSuitcases"),
    "sac-a-dos": t("nav.backpacks"),
    "sac-ordinateur": t("nav.laptopBags"),
    "sac-scolaire": t("nav.schoolKids"),
    cadenas: t("nav.locks"),
    sangles: t("nav.straps"),
    "housse-de-valise": t("nav.covers"),
    "coussin-de-voyage": t("nav.pillow"),
    parapluie: t("nav.umbrella"),
    masques: t("nav.masks"),
    "ensembles-de-valises": t("group.sets"),
    "valise-enfant": t("group.kidsSuitcase"),
    portefeuille: t("group.wallet"),
    "pilot-case": "Pilot Case",
  };

  const getNavLabel = (item: NavItem | CategoryDisplay) => labelBySlug[item.slug] || item.name;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [fetchedCategories, fetchedProducts] = await Promise.all([
          fetchDisplayCategories(),
          fetchDisplayProducts(),
        ]);
        if (!cancelled) {
          setCategories(fetchedCategories);
          setProducts(fetchedProducts);
        }
      } catch (error) {
        console.error("Unable to load categories in header", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCategories = useMemo(
    () => (categories.length ? categories : FALLBACK_CATEGORIES),
    [categories]
  );

  const searchSuggestions = useMemo(
    () =>
      getSearchSuggestions({
        query: searchQuery,
        products,
        categories: visibleCategories,
        limit: 6,
      }),
    [products, searchQuery, visibleCategories]
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setSearchQuery("");
    setSearchOpen(false);
    navigate(`/recherche?q=${encodeURIComponent(query)}`);
  };

  const chooseSearchSuggestion = (value: string, href?: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    if (href) {
      navigate(href);
      return;
    }
    navigate(`/recherche?q=${encodeURIComponent(value)}`);
  };

  const closeMenus = () => {
    setCategoriesOpen(false);
    setValisesOpen(false);
    setSacsOpen(false);
    setDisneyOpen(false);
    setAccessoiresOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 text-black shadow-[0_1px_0_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="h-11 bg-[#e3ae82] text-black">
        <div className="mx-auto flex h-full max-w-[1760px] items-center justify-center px-6 text-[15px] font-medium">
          <Link to="/categorie/promos" className="underline underline-offset-4 transition-opacity hover:opacity-75">
            {t("top.offer")}
          </Link>
          <div className="absolute right-6 hidden items-center gap-5 lg:flex">
            <Link to="/magasins" className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-wide transition-opacity hover:opacity-70">
              <MapPin className="h-4 w-4" />
              {t("nav.stores")}
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
              onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
              aria-label={t("nav.language")}
            >
              {language.toUpperCase()}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-[68px] max-w-[1760px] items-center px-6 lg:px-10">
        <Link to="/" className="flex min-w-[250px] items-center transition-transform duration-200 hover:scale-[1.015]" onClick={closeMenus}>
          <img
            src="/assets/samsonite-logo.png"
            alt="Samsonite"
            className="h-10 w-auto object-contain"
            onError={(event) => {
              event.currentTarget.src = "/placeholder.svg";
            }}
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {PRIMARY_NAV.map((item) => (
            item.slug === "bagages-a-main" ? (
              <div key="bagages-valises" className="contents">
                <Link
                  to={`/categorie/${item.slug}`}
                  className={`relative whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full ${
                    item.highlight ? "text-[#ff263d]" : "text-black"
                  }`}
                  onClick={closeMenus}
                >
                  {getNavLabel(item)}
                </Link>
                <div className="relative">
                  <button
                    type="button"
                    className="relative inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full"
                    onClick={() => {
                      setValisesOpen((value) => !value);
                      setCategoriesOpen(false);
                      setSacsOpen(false);
                      setDisneyOpen(false);
                      setAccessoiresOpen(false);
                    }}
                    aria-expanded={valisesOpen}
                  >
                    {t("nav.suitcases")}
                    <ChevronDown className={`h-4 w-4 transition-transform ${valisesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {valisesOpen && (
                    <div className="absolute left-1/2 top-full z-50 mt-5 w-60 -translate-x-1/2 border border-neutral-200 bg-white py-3 shadow-[0_24px_70px_rgba(0,0,0,0.12)] animate-fade-in">
                      {VALISES_NAV_LINKS.map((valiseItem) => (
                        <Link
                          key={valiseItem.slug}
                          to={`/categorie/${valiseItem.slug}`}
                          className="block px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-black"
                          onClick={closeMenus}
                        >
                          {getNavLabel(valiseItem)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    className="relative inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full"
                    onClick={() => {
                      setSacsOpen((value) => !value);
                      setValisesOpen(false);
                      setCategoriesOpen(false);
                      setDisneyOpen(false);
                      setAccessoiresOpen(false);
                    }}
                    aria-expanded={sacsOpen}
                  >
                    {t("nav.bags")}
                    <ChevronDown className={`h-4 w-4 transition-transform ${sacsOpen ? "rotate-180" : ""}`} />
                  </button>
                  {sacsOpen && (
                    <div className="absolute left-1/2 top-full z-50 mt-5 w-56 -translate-x-1/2 border border-neutral-200 bg-white py-3 shadow-[0_24px_70px_rgba(0,0,0,0.12)] animate-fade-in">
                      {SACS_NAV_LINKS.map((sacItem) => (
                        <Link
                          key={sacItem.slug}
                          to={`/categorie/${sacItem.slug}`}
                          className="block px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-black"
                          onClick={closeMenus}
                        >
                          {getNavLabel(sacItem)}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : item.slug === "disney-amp-enfant" ? (
              <div key={item.slug} className="relative">
                <button
                  type="button"
                  className="relative inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full"
                  onClick={() => {
                    setDisneyOpen((value) => !value);
                    setValisesOpen(false);
                    setSacsOpen(false);
                    setAccessoiresOpen(false);
                    setCategoriesOpen(false);
                  }}
                  aria-expanded={disneyOpen}
                >
                  {getNavLabel(item)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${disneyOpen ? "rotate-180" : ""}`} />
                </button>
                {disneyOpen && (
                  <div className="absolute left-1/2 top-full z-50 mt-5 w-72 -translate-x-1/2 border border-neutral-200 bg-white py-3 shadow-[0_24px_70px_rgba(0,0,0,0.12)] animate-fade-in">
                    {DISNEY_NAV_LINKS.map((disneyItem) => (
                      <Link
                        key={disneyItem.slug}
                        to={`/categorie/${disneyItem.slug}`}
                        className="block px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-black"
                        onClick={closeMenus}
                      >
                        {getNavLabel(disneyItem)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : item.slug === "accessoires" ? (
              <div key={item.slug} className="relative">
                <button
                  type="button"
                  className="relative inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full"
                  onClick={() => {
                    setAccessoiresOpen((value) => !value);
                    setValisesOpen(false);
                    setSacsOpen(false);
                    setDisneyOpen(false);
                    setCategoriesOpen(false);
                  }}
                  aria-expanded={accessoiresOpen}
                >
                  {getNavLabel(item)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${accessoiresOpen ? "rotate-180" : ""}`} />
                </button>
                {accessoiresOpen && (
                  <div className="absolute left-1/2 top-full z-50 mt-5 w-64 -translate-x-1/2 border border-neutral-200 bg-white py-3 shadow-[0_24px_70px_rgba(0,0,0,0.12)] animate-fade-in">
                    {ACCESSOIRES_NAV_LINKS.map((accessoireItem) => (
                      <Link
                        key={accessoireItem.slug}
                        to={`/categorie/${accessoireItem.slug}`}
                        className="block px-5 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 hover:text-black"
                        onClick={closeMenus}
                      >
                        {getNavLabel(accessoireItem)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={item.slug}
                to={`/categorie/${item.slug}`}
                className={`relative whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full ${
                  item.highlight ? "text-[#ff263d]" : "text-black"
                }`}
                onClick={closeMenus}
              >
                {getNavLabel(item)}
              </Link>
            )
          ))}
          <button
            type="button"
            className="relative inline-flex items-center gap-1 whitespace-nowrap text-[15px] font-semibold tracking-tight transition-colors after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:bg-black after:transition-all hover:text-neutral-500 hover:after:w-full"
            onClick={() => {
              setCategoriesOpen((value) => !value);
              setValisesOpen(false);
              setSacsOpen(false);
              setDisneyOpen(false);
              setAccessoiresOpen(false);
            }}
            aria-expanded={categoriesOpen}
          >
            {t("nav.explore")}
            <ChevronDown className={`h-4 w-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
          </button>
        </nav>

        <div className="ml-auto flex min-w-[210px] items-center justify-end gap-5">
          <div className="relative hidden lg:block">
            {searchOpen && (
              <form
                onSubmit={handleSearch}
                className="absolute right-8 top-1/2 flex h-11 w-80 -translate-y-1/2 items-center border border-neutral-200 bg-white px-4 shadow-[0_18px_45px_rgba(0,0,0,0.12)] animate-fade-in"
              >
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("nav.search")}
                  className="h-full w-full border-0 bg-transparent text-sm outline-none"
                />
                {searchSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-[90] mt-2 border border-neutral-200 bg-white py-2 shadow-[0_18px_45px_rgba(0,0,0,0.12)]">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.type}-${suggestion.value}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => chooseSearchSuggestion(suggestion.value, suggestion.href)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-neutral-50"
                      >
                        <span className="font-semibold">{suggestion.label}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                          {t(`search.type.${suggestion.type}`)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>
            )}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-neutral-100"
              onClick={() => setSearchOpen((value) => !value)}
              aria-label={t("nav.search")}
            >
              <Search className="h-6 w-6 stroke-[1.7]" />
            </button>
          </div>
          <Link to="/admin/login" className="hidden h-10 w-10 items-center justify-center transition-colors hover:bg-neutral-100 lg:flex" aria-label={t("nav.account")}>
            <User className="h-6 w-6 stroke-[1.7]" />
          </Link>
          <Link to="/panier" className="relative flex h-10 w-10 items-center justify-center transition-colors hover:bg-neutral-100" aria-label={t("nav.cart")}>
            <ShoppingCart className="h-6 w-6 stroke-[1.7]" />
            <span className="absolute -right-1 top-0 flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-white px-1 text-[11px] leading-none">
              {totalItems}
            </span>
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center lg:hidden"
            onClick={() => setMobileMenuOpen((value) => !value)}
            aria-expanded={mobileMenuOpen}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
          </button>
        </div>
      </div>

      {categoriesOpen && (
        <div className="hidden border-t border-neutral-200 bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)] lg:block">
          <div className="mx-auto max-w-[1760px] px-10 py-9">
            <p className="mb-6 text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">{t("nav.categories")}</p>
            <div className="grid grid-cols-5 gap-10">
              {EXPLORER_GROUPS.map((group) => (
                <div key={group.slug} className="space-y-4">
                  <Link
                    to={`/categorie/${group.slug}`}
                    onClick={closeMenus}
                    className="block text-lg font-black uppercase leading-tight hover:text-[#ff263d]"
                  >
                    {labelBySlug[group.slug] || group.title}
                  </Link>
                  <div className="space-y-3 border-t border-neutral-200 pt-4">
                    {group.links.map((item) => (
                      <Link
                        key={`${group.slug}-${item.slug}`}
                        to={`/categorie/${item.slug}`}
                        onClick={closeMenus}
                        className="block text-sm font-semibold text-neutral-600 hover:text-black"
                      >
                        {getNavLabel(item)}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white lg:hidden">
          <form onSubmit={handleSearch} className="flex h-12 items-center gap-3 border-b border-neutral-200 px-5">
            <Search className="h-5 w-5" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("nav.search")}
              className="h-full w-full border-0 bg-transparent text-sm outline-none"
            />
          </form>
          {searchSuggestions.length > 0 && (
            <div className="border-b border-neutral-200 px-5 py-2">
              {searchSuggestions.slice(0, 4).map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.value}`}
                  type="button"
                  onClick={() => chooseSearchSuggestion(suggestion.value, suggestion.href)}
                  className="flex w-full items-center justify-between py-2 text-left text-sm"
                >
                  <span className="font-semibold">{suggestion.label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
                    {t(`search.type.${suggestion.type}`)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <nav className="max-h-[calc(100vh-130px)] overflow-y-auto px-5 py-4">
            {[...PRIMARY_NAV, ...visibleCategories].map((item) => (
              <Link
                key={item.slug}
                to={`/categorie/${item.slug}`}
                onClick={closeMenus}
                className={`block border-b border-neutral-100 py-4 text-base font-black uppercase ${
                  "highlight" in item && item.highlight ? "text-[#ff263d]" : "text-black"
                }`}
              >
                {getNavLabel(item)}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;

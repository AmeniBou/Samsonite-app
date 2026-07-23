import { Link } from "react-router-dom";
import { Building2, HelpCircle, Map, Package, Search, ShoppingBag, UserRound } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const SiteMap = () => {
  const { language, t } = useLanguage();
  const isEn = language === "en";

  const sections = [
    {
      icon: Package,
      title: isEn ? "Products" : "Produits",
      links: [
        { label: t("nav.suitcases"), href: "/categorie/valises" },
        { label: t("nav.allSuitcases"), href: "/categorie/valises" },
        { label: t("nav.hardSuitcases"), href: "/categorie/rigides" },
        { label: t("nav.softSuitcases"), href: "/categorie/souples" },
        { label: t("nav.cabin"), href: "/categorie/bagages-a-main" },
        { label: t("group.sets"), href: "/categorie/ensembles-de-valises" },
      ],
    },
    {
      icon: ShoppingBag,
      title: isEn ? "Bags and accessories" : "Sacs et accessoires",
      links: [
        { label: t("nav.bags"), href: "/categorie/sac-a-dos" },
        { label: t("nav.backpacks"), href: "/categorie/sac-a-dos" },
        { label: t("nav.laptopBags"), href: "/categorie/sac-ordinateur" },
        { label: t("nav.accessories"), href: "/categorie/accessoires" },
        { label: t("nav.locks"), href: "/categorie/cadenas" },
        { label: t("nav.pillow"), href: "/categorie/coussin-de-voyage" },
      ],
    },
    {
      icon: Building2,
      title: isEn ? "Brand and stores" : "Marque et boutiques",
      links: [
        { label: isEn ? "About us" : "A propos", href: "/a-propos" },
        { label: t("footer.history"), href: "/la-marque" },
        { label: t("nav.stores"), href: "/magasins" },
        { label: t("services.title"), href: "/services" },
      ],
    },
    {
      icon: HelpCircle,
      title: isEn ? "Help" : "Aide",
      links: [
        { label: t("footer.shipping"), href: "/livraison" },
        { label: t("footer.returns"), href: "/retours" },
        { label: t("footer.contactFaq"), href: "/nous-contacter" },
        { label: t("product.warranty"), href: "/services" },
      ],
    },
    {
      icon: UserRound,
      title: isEn ? "Account and orders" : "Compte et commandes",
      links: [
        { label: t("nav.account"), href: "/compte" },
        { label: t("nav.cart"), href: "/panier" },
        { label: t("cart.checkout"), href: "/commande" },
        { label: t("info.newsletter.title"), href: "/newsletter" },
      ],
    },
    {
      icon: Search,
      title: isEn ? "Search and discovery" : "Recherche et decouverte",
      links: [
        { label: t("search.title"), href: "/recherche" },
        { label: t("nav.summer"), href: "/categorie/promos" },
        { label: t("nav.disneyKids"), href: "/categorie/disney-amp-enfant" },
        { label: t("nav.schoolKids"), href: "/categorie/sac-a-dos-enfants" },
      ],
    },
  ];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            {isEn ? "Navigation" : "Navigation"}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            {isEn ? "Site map" : "Plan du site"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            {isEn
              ? "Find all the main pages of the Samsonite Tunisia website in one place."
              : "Retrouvez en un seul endroit les principales pages du site Samsonite Tunisie."}
          </p>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((section) => (
            <article key={section.title} className="border border-border bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                  <section.icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black uppercase">{section.title}</h2>
              </div>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={`${section.title}-${link.href}-${link.label}`}>
                    <Link
                      to={link.href}
                      className="group flex items-center justify-between border-b border-border pb-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>{link.label}</span>
                      <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-black text-white">
        <div className="samsonite-container flex flex-col gap-4 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <Map className="h-7 w-7" />
            <h2 className="mt-3 text-2xl font-black uppercase">
              {isEn ? "Looking for something specific?" : "Vous cherchez une page precise ?"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {isEn ? "Use search to find products, colors, sizes and collections." : "Utilisez la recherche pour trouver produits, couleurs, tailles et collections."}
            </p>
          </div>
          <Link to="/recherche" className="inline-flex justify-center border border-white px-6 py-3 text-sm font-black uppercase tracking-wide">
            {t("search.title")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default SiteMap;

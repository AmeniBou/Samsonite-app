import { Link } from "react-router-dom";
import { Facebook, Instagram } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const socialLinks = {
  facebook: "https://www.facebook.com/profile.php?id=61590770759317",
  instagram: "https://www.instagram.com/samsonite_tunisie/",
};

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="samsonite-container py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-4 text-xs font-bold tracking-wider">{t("footer.products")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/categorie/valises" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("nav.suitcases")}
                </Link>
              </li>
              <li>
                <Link to="/categorie/sac-a-dos" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("nav.backpacks")}
                </Link>
              </li>
              <li>
                <Link to="/categorie/business" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  Business
                </Link>
              </li>
              <li>
                <Link to="/categorie/accessoires" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("nav.accessories")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-wider">{t("footer.help")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/livraison" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.shipping")}
                </Link>
              </li>
              <li>
                <Link to="/retours" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.returns")}
                </Link>
              </li>
              <li>
                <Link to="/nous-contacter" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.contactFaq")}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("product.warranty")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-wider">{t("footer.brand")}</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/la-marque" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.history")}
                </Link>
              </li>
              <li>
                <Link to="/la-marque" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.sustainability")}
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.innovation")}
                </Link>
              </li>
              <li>
                <Link to="/plan-du-site" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.siteMap")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-wider">{t("footer.info")}</h4>
            <div className="space-y-1 text-sm leading-6 text-primary-foreground/70">
              <p className="font-semibold text-primary-foreground">Samsonite</p>
              <p>9, Rue 8601 Zone Industriel</p>
              <p>Charguia 1</p>
              <p>2035 Ariana</p>
              <p>Tunisie</p>
              <p className="pt-2">
                {t("footer.callUs")} :{" "}
                <a href="tel:+21626528103" className="transition-colors hover:text-primary-foreground">
                  26 528 103
                </a>{" "}
                /{" "}
                <a href="tel:+21671809209" className="transition-colors hover:text-primary-foreground">
                  71 809 209
                </a>
              </p>
              <p>Fax : 71 809 080</p>
              <p>
                {t("footer.emailUs")} :{" "}
                <a href="mailto:commercial@samsonite.com.tn" className="break-all transition-colors hover:text-primary-foreground">
                  commercial@samsonite.com.tn
                </a>
              </p>
            </div>
            <h4 className="mb-4 mt-6 text-xs font-bold tracking-wider">{t("footer.follow")}</h4>
            <div className="flex items-center gap-4">
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/20">
        <div className="samsonite-container flex flex-col items-center justify-between gap-2 py-4 md:flex-row">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Samsonite. {t("footer.rights")}
          </p>
          <div className="flex items-center gap-4 text-xs text-primary-foreground/50">
            <Link to="/services" className="hover:text-primary-foreground">
              {t("footer.legal")}
            </Link>
            <Link to="/services" className="hover:text-primary-foreground">
              {t("footer.privacy")}
            </Link>
            <Link to="/services" className="hover:text-primary-foreground">
              Cookies
            </Link>
            <Link to="/plan-du-site" className="hover:text-primary-foreground">
              {t("footer.siteMap")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

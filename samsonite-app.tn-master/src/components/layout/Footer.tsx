import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const socialLinks = {
  facebook: "https://www.facebook.com/samsonite.tn",
  instagram: "https://www.instagram.com/samsonite.tn/",
  youtube: "https://www.youtube.com/@Samsonite",
  twitter: "https://x.com/Samsonite",
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
                <Link to="/commande" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("footer.orderTracking")}
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
                <Link to="/personnalisation" className="text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                  {t("home.personalization")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold tracking-wider">{t("footer.follow")}</h4>
            <div className="flex items-center gap-4">
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={socialLinks.youtube} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Youtube className="h-5 w-5" />
              </a>
              <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="text-primary-foreground/70 transition-colors hover:text-primary-foreground">
                <Twitter className="h-5 w-5" />
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
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

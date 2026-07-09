import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Twitter } from "lucide-react";

const socialLinks = {
  facebook: "https://www.facebook.com/samsonite.tn",
  instagram: "https://www.instagram.com/samsonite.tn/",
  youtube: "https://www.youtube.com/@Samsonite",
  twitter: "https://x.com/Samsonite",
};

const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="samsonite-container py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xs font-bold tracking-wider mb-4">NOS PRODUITS</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/categorie/valises" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Valises
                </Link>
              </li>
              <li>
                <Link to="/categorie/sac-a-dos" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Sacs a dos
                </Link>
              </li>
              <li>
                <Link to="/categorie/business" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Business
                </Link>
              </li>
              <li>
                <Link to="/categorie/accessoires" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Accessoires
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-wider mb-4">AIDE</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/livraison" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Livraison
                </Link>
              </li>
              <li>
                <Link to="/retours" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Retours
                </Link>
              </li>
              <li>
                <Link to="/commande" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Suivi de commande
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Garantie
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-wider mb-4">LA MARQUE</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/la-marque" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Notre histoire
                </Link>
              </li>
              <li>
                <Link to="/la-marque" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Developpement durable
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Innovation
                </Link>
              </li>
              <li>
                <Link to="/personnalisation" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                  Personnalisation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-wider mb-4">SUIVEZ-NOUS</h4>
            <div className="flex items-center gap-4">
              <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={socialLinks.youtube} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
              <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/20">
        <div className="samsonite-container py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-primary-foreground/50">
            © {new Date().getFullYear()} Samsonite. Tous droits reserves.
          </p>
          <div className="flex items-center gap-4 text-xs text-primary-foreground/50">
            <Link to="/services" className="hover:text-primary-foreground">Mentions legales</Link>
            <Link to="/services" className="hover:text-primary-foreground">Politique de confidentialite</Link>
            <Link to="/services" className="hover:text-primary-foreground">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


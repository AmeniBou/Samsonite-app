import { getPrestashopConfig, isPrestashopConfigured } from "@/lib/prestashop/config";
import { Check, Settings } from "lucide-react";

const PrestashopConfig = () => {
  const currentConfig = getPrestashopConfig();
  const configured = isPrestashopConfigured();

  return (
    <div className="samsonite-container py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Configuration Prestashop</h1>
        </div>

        {configured && (
          <div className="mb-6 flex items-center gap-2 border border-border bg-accent p-4 text-sm text-foreground">
            <Check className="h-4 w-4" />
            Prestashop est configure via les variables d'environnement.
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2 border border-border p-4 text-sm">
            <p className="font-semibold">Configuration active</p>
            <p className="break-all text-muted-foreground">
              URL: {currentConfig.apiUrl || "Non definie"}
            </p>
            <p className="text-muted-foreground">
              Cle API: {currentConfig.apiKey ? "Definie" : "Non definie"}
            </p>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-3 text-xs font-bold tracking-wider">CONFIGURATION SANS LOCAL STORAGE</h3>
            <p className="mb-2 text-sm text-muted-foreground">
              Definissez vos informations Prestashop dans <code>.env</code>:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              <li>VITE_PS_API_URL=https://votre-boutique.com</li>
              <li>VITE_PS_API_KEY=votre_cle_webservice</li>
            </ul>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <h3 className="mb-3 text-xs font-bold tracking-wider">COMMENT OBTENIR VOTRE CLE ?</h3>
            <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
              <li>Connectez-vous au back-office Prestashop</li>
              <li>Allez dans Parametres avances -{">"} Webservice</li>
              <li>Cliquez sur Ajouter une cle</li>
              <li>Activez les permissions nécessaires (products, categories, images, carts)</li>
              <li>Copiez la cle generee dans votre fichier .env</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrestashopConfig;

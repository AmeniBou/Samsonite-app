import { AlertTriangle, CheckCircle2, ClipboardCheck, PackageOpen, RotateCcw } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const Returns = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const conditions = isEn
    ? ["Product unused and clean", "Original packaging kept", "Labels and accessories included", "Request reviewed before return"]
    : ["Produit non utilise et propre", "Emballage d'origine conserve", "Etiquettes et accessoires inclus", "Demande analysee avant retour"];

  const process = isEn
    ? [
        "Contact customer care with your order reference.",
        "The team checks the request and product condition requirements.",
        "You receive return or exchange instructions.",
        "Refund or exchange is processed after inspection.",
      ]
    : [
        "Contactez le service client avec votre référence de commande.",
        "L'equipe verifie la demande et les conditions du produit.",
        "Vous recevez les instructions de retour ou d'echange.",
        "Le remboursement ou l'echange est traite apres controle.",
      ];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            {isEn ? "Returns and exchanges" : "Retours et echanges"}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            {isEn ? "A simple, controlled process" : "Un processus simple et controle"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            {isEn
              ? "Returns are reviewed by the team to protect customers, product quality and stock accuracy."
              : "Les retours sont verifies par l'equipe afin de proteger les clients, la qualite produit et la fiabilite du stock."}
          </p>
        </div>
      </section>

      <section className="samsonite-container grid gap-10 py-14 lg:grid-cols-[380px_1fr]">
        <aside className="border border-border bg-black p-7 text-white">
          <RotateCcw className="h-8 w-8" />
          <h2 className="mt-5 text-2xl font-black uppercase">{isEn ? "Return window" : "Delai de retour"}</h2>
          <p className="mt-3 text-4xl font-black">30</p>
          <p className="text-sm font-bold uppercase text-white/70">{isEn ? "days after receipt" : "jours apres reception"}</p>
          <p className="mt-5 text-sm leading-6 text-white/70">
            {isEn
              ? "The item must be in original condition. Personalized or used products may be excluded."
              : "L'article doit etre dans son etat d'origine. Les produits personnalises ou utilises peuvent etre exclus."}
          </p>
        </aside>

        <div>
          <h2 className="text-xl font-black uppercase">{isEn ? "Eligibility checklist" : "Conditions a respecter"}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {conditions.map((condition) => (
              <div key={condition} className="flex gap-3 border border-border p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                <p className="text-sm font-bold leading-6">{condition}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <div className="mb-8 flex items-center gap-3">
            <ClipboardCheck className="h-7 w-7" />
            <h2 className="text-2xl font-black uppercase">{isEn ? "How it works" : "Comment ca marche"}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {process.map((step, index) => (
              <article key={step} className="border border-border bg-white p-5">
                <p className="text-xs font-black text-muted-foreground">0{index + 1}</p>
                <p className="mt-3 text-sm font-bold leading-6">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container grid gap-5 py-14 md:grid-cols-2">
        <div className="border border-border p-6">
          <PackageOpen className="h-7 w-7" />
          <h2 className="mt-4 text-xl font-black uppercase">{isEn ? "Exchange priority" : "Priorite a l'echange"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isEn
              ? "When the requested size or color is available, exchange is usually faster than refund."
              : "Quand la taille ou couleur souhaitee est disponible, l'echange est souvent plus rapide que le remboursement."}
          </p>
        </div>
        <div className="border border-border p-6">
          <AlertTriangle className="h-7 w-7" />
          <h2 className="mt-4 text-xl font-black uppercase">{isEn ? "Important" : "Important"}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {isEn
              ? "Do not send a product back before receiving instructions from customer care."
              : "Ne renvoyez pas un produit avant d'avoir reçu les instructions du service client."}
          </p>
        </div>
      </section>
    </div>
  );
};

export default Returns;

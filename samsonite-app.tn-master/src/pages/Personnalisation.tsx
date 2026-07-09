import { Link } from "react-router-dom";

const Personnalisation = () => {
  return (
    <div>
      <section className="bg-samsonite-navy h-[400px] flex items-center">
        <div className="samsonite-container text-primary-foreground">
          <p className="text-xs tracking-[0.3em] uppercase mb-4">Service exclusif</p>
          <h1 className="text-4xl md:text-6xl font-bold">PERSONNALISATION</h1>
          <p className="text-lg text-primary-foreground/70 mt-4 max-w-xl">
            Rendez votre bagage unique en le gravant a vos initiales.
          </p>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <h2 className="text-2xl font-bold text-center mb-12">COMMENT CA MARCHE ?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Choisissez votre produit",
              desc: "Selectionnez un produit portant le badge Personnalisable dans notre catalogue.",
            },
            {
              step: "02",
              title: "Personnalisez-le",
              desc: "Ajoutez vos initiales ou un message personnel (jusqu'a 3 caracteres) lors de l'ajout au panier.",
            },
            {
              step: "03",
              title: "Recevez-le chez vous",
              desc: "Votre bagage personnalise est grave dans nos ateliers et livre a votre domicile.",
            },
          ].map((step) => (
            <div key={step.step} className="text-center space-y-4">
              <span className="text-5xl font-bold text-muted-foreground/30">{step.step}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-accent py-16">
        <div className="samsonite-container text-center">
          <h2 className="text-2xl font-bold mb-4">Pret a creer votre bagage unique ?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Explorez notre selection de produits personnalisables et offrez-vous un bagage qui vous ressemble.
          </p>
          <Link
            to="/categorie/valises"
            className="inline-block bg-foreground text-background px-8 py-3.5 text-sm font-bold tracking-wider hover:bg-foreground/90 transition-colors"
          >
            DECOUVRIR LES PRODUITS PERSONNALISABLES
          </Link>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <h2 className="text-xl font-bold mb-8">QUESTIONS FREQUENTES</h2>
        <div className="space-y-6 max-w-3xl">
          {[
            {
              q: "Quels produits sont personnalisables ?",
              a: "Les produits portant le badge Personnalisable peuvent etre graves.",
            },
            {
              q: "Combien de caracteres puis-je graver ?",
              a: "Vous pouvez graver jusqu'a 3 caracteres (lettres et chiffres) sur votre bagage.",
            },
            {
              q: "Combien coute la personnalisation ?",
              a: "La personnalisation est a 45 TND, et elle est offerte sur certains produits.",
            },
            {
              q: "Puis-je retourner un produit personnalise ?",
              a: "Les produits personnalises ne sont pas eligibles aux retours, sauf en cas de defaut de fabrication.",
            },
          ].map((faq) => (
            <div key={faq.q} className="border-b border-border pb-4">
              <h3 className="font-semibold mb-2">{faq.q}</h3>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Personnalisation;

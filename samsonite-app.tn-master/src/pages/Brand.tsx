const Brand = () => {
  return (
    <div>
      <section className="relative h-[420px] flex items-center overflow-hidden">
        <img src="/home-hero.svg" alt="Samsonite heritage" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-samsonite-navy/70" />
        <div className="samsonite-container text-primary-foreground relative z-10">
          <p className="text-xs tracking-[0.3em] uppercase mb-4">Depuis 1910</p>
          <h1 className="text-4xl md:text-6xl font-bold">LA MARQUE</h1>
          <p className="text-lg text-primary-foreground/80 mt-4 max-w-xl">
            Plus d&apos;un siècle d&apos;innovation au service du voyage.
          </p>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <img
            src="/brand-history.svg"
            alt="Histoire de Samsonite"
            className="aspect-[4/3] w-full object-cover bg-accent"
          />
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Notre histoire</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fondée en 1910 à Denver, Colorado, Samsonite est devenue la marque de bagagerie la
              plus reconnue au monde. Depuis plus d&apos;un siècle, nous innovons pour offrir des
              solutions de voyage qui allient durabilité, fonctionnalité et style.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Notre engagement envers l&apos;excellence se reflète dans chaque produit que nous créons,
              des valises rigides aux sacs à dos, en passant par les accessoires de voyage.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-accent py-16">
        <div className="samsonite-container">
          <h2 className="text-2xl font-bold text-center mb-12">NOS VALEURS</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Innovation",
                desc: "Nous repoussons les limites de la technologie pour créer des produits plus légers, résistants et fonctionnels.",
              },
              {
                title: "Durabilité",
                desc: "Nous nous engageons pour un avenir plus durable avec des matériaux recyclés et des process responsables.",
              },
              {
                title: "Design",
                desc: "Chaque produit est conçu pour allier esthétique et praticité, dans l'élégance du voyage moderne.",
              },
            ].map((value) => (
              <div key={value.title} className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-background border-2 border-foreground rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">{value.title[0]}</span>
                </div>
                <h3 className="text-lg font-bold">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground">Eco-responsable</p>
            <h2 className="text-2xl font-bold">Voyagez responsable</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nos collections eco-responsables utilisent des matières recyclées, notamment du RPET
              issu de bouteilles plastiques revalorisées.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
                Matériaux recyclés certifiés
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
                Réduction de l&apos;empreinte carbone
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-foreground rounded-full" />
                Packaging éco-conçu
              </li>
            </ul>
          </div>
          <img
            src="/brand-sustainability.svg"
            alt="Engagement durabilité"
            className="aspect-[4/3] w-full object-cover bg-accent"
          />
        </div>
      </section>
    </div>
  );
};

export default Brand;


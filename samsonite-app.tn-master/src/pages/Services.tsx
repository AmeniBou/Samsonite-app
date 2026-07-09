import { MapPin, Phone, RotateCcw, Shield, Truck, Wrench } from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: Truck,
      title: "Livraison",
      desc: "Livraison offerte a partir de 300 TND. Livraison express en 24-48h disponible.",
      details: [
        "Standard : 3-5 jours ouvres",
        "Express : 24-48h",
        "Point relais : 3-5 jours ouvres",
        "Gratuite a partir de 300 TND",
      ],
    },
    {
      icon: RotateCcw,
      title: "Retours gratuits",
      desc: "Retournez votre article sous 30 jours gratuitement.",
      details: [
        "30 jours pour changer d'avis",
        "Etiquette de retour incluse",
        "Remboursement sous 5-10 jours",
        "Articles en etat d'origine",
      ],
    },
    {
      icon: Shield,
      title: "Garantie mondiale",
      desc: "Tous nos produits beneficient d'une garantie mondiale contre les defauts de fabrication.",
      details: [
        "Couverture mondiale",
        "Defauts de fabrication",
        "Reparation ou remplacement",
        "Service apres-vente dedie",
      ],
    },
    {
      icon: Wrench,
      title: "Reparation",
      desc: "Service de reparation disponible pour prolonger la vie de vos produits.",
      details: [
        "Remplacement de roues",
        "Reparation de fermetures",
        "Changement de poignee",
        "Devis gratuit",
      ],
    },
    {
      icon: MapPin,
      title: "Nos magasins",
      desc: "Retrouvez-nous dans nos boutiques.",
      details: ["Tunis", "Sousse", "Sfax", "Et bien d'autres..."],
    },
    {
      icon: Phone,
      title: "Service client",
      desc: "Notre equipe est a votre disposition du lundi au vendredi.",
      details: ["Lun-Ven : 9h-18h", "Par telephone", "Par email", "Chat en ligne"],
    },
  ];

  return (
    <div>
      <section className="bg-accent py-12">
        <div className="samsonite-container">
          <h1 className="text-3xl font-bold tracking-wider">SERVICES</h1>
          <p className="text-muted-foreground mt-2">
            Nous vous accompagnons avant, pendant et apres votre achat.
          </p>
        </div>
      </section>

      <section className="samsonite-container py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <div key={service.title} className="border border-border p-6 space-y-4 hover:shadow-md transition-shadow">
              <service.icon className="h-8 w-8" />
              <h2 className="text-lg font-bold">{service.title}</h2>
              <p className="text-sm text-muted-foreground">{service.desc}</p>
              <ul className="space-y-1.5">
                {service.details.map((detail) => (
                  <li key={detail} className="text-sm flex items-center gap-2">
                    <span className="w-1 h-1 bg-foreground rounded-full" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Services;

import { Link } from "react-router-dom";
import { HelpCircle, Mail, MapPin, MessageSquareText, Phone } from "lucide-react";

import { useLanguage } from "@/lib/i18n";

const ContactFaq = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const contacts = isEn
    ? [
        { icon: Phone, title: "Phone support", desc: "For order confirmation, availability and store information.", value: "26 528 103 / 71 809 209" },
        { icon: Mail, title: "Email and social", desc: "Send the product name, color, size or order reference for faster help.", value: "Facebook / Instagram" },
        { icon: MapPin, title: "Stores", desc: "Visit a store for product advice, warranty guidance or pickup.", value: "See addresses" },
      ]
    : [
        { icon: Phone, title: "Assistance telephone", desc: "Pour confirmer une commande, une disponibilite ou une information boutique.", value: "26 528 103 / 71 809 209" },
        { icon: Mail, title: "Email et reseaux sociaux", desc: "Envoyez le nom du produit, la couleur, la taille ou la reference pour une reponse plus rapide.", value: "Facebook / Instagram" },
        { icon: MapPin, title: "Boutiques", desc: "Passez en boutique pour un conseil produit, une garantie ou un retrait.", value: "Voir les adresses" },
      ];

  const faqs = isEn
    ? [
        { q: "How do I know if a product is available?", a: "Availability is shown on the product page and can be confirmed by phone before delivery." },
        { q: "Can I change the delivery method after ordering?", a: "Yes, contact customer care quickly with your order reference before preparation starts." },
        { q: "What information should I send for warranty support?", a: "Send the product name, photos of the issue, proof of purchase and your contact details." },
        { q: "Can I reserve a product in store?", a: "Store reservation depends on stock. Call the store or customer care before visiting." },
        { q: "How can I track my order?", a: "The team confirms your order and gives the next steps by phone or message." },
      ]
    : [
        { q: "Comment savoir si un produit est disponible ?", a: "La disponibilite est affichee sur la page produit et peut etre confirmee par telephone avant livraison." },
        { q: "Puis-je changer le mode de livraison apres commande ?", a: "Oui, contactez rapidement le service client avec votre reference avant le debut de preparation." },
        { q: "Quelles informations envoyer pour une garantie ?", a: "Envoyez le nom du produit, des photos du probleme, la preuve d'achat et vos coordonnees." },
        { q: "Puis-je reserver un produit en boutique ?", a: "La reservation depend du stock. Appelez la boutique ou le service client avant de vous deplacer." },
        { q: "Comment suivre ma commande ?", a: "L'equipe confirme votre commande et communique les prochaines etapes par telephone ou message." },
      ];

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            {isEn ? "Help center" : "Centre d'aide"}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            {isEn ? "Contact and FAQ" : "Contact et FAQ"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            {isEn
              ? "Find the quickest way to get help before or after your order."
              : "Trouvez rapidement le bon contact avant ou apres votre commande."}
          </p>
        </div>
      </section>

      <section className="samsonite-container grid gap-5 py-14 md:grid-cols-3">
        {contacts.map((contact) => (
          <article key={contact.title} className="border border-border p-6">
            <contact.icon className="h-7 w-7" />
            <h2 className="mt-5 text-lg font-black uppercase">{contact.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{contact.desc}</p>
            <p className="mt-5 text-sm font-black">{contact.value}</p>
          </article>
        ))}
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-10 py-14 lg:grid-cols-[320px_1fr]">
          <div>
            <HelpCircle className="h-8 w-8" />
            <h2 className="mt-4 text-2xl font-black uppercase">{isEn ? "Frequently asked questions" : "Questions frequentes"}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isEn
                ? "Clear answers for the questions customers ask most often."
                : "Des reponses claires aux questions les plus frequentes des clients."}
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border border-border bg-white p-5">
                <summary className="cursor-pointer list-none text-sm font-black uppercase">
                  {faq.q}
                </summary>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="flex flex-col gap-5 border border-border bg-black p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <MessageSquareText className="h-7 w-7" />
            <h2 className="mt-4 text-2xl font-black uppercase">{isEn ? "Need personal assistance?" : "Besoin d'une assistance personnalisee ?"}</h2>
            <p className="mt-2 text-sm text-white/70">
              {isEn ? "Prepare your product name or order reference before contacting us." : "Preparez le nom du produit ou la reference de commande avant de nous contacter."}
            </p>
          </div>
          <Link to="/magasins" className="inline-flex justify-center border border-white px-6 py-3 text-sm font-black uppercase tracking-wide">
            {isEn ? "Find a store" : "Trouver une boutique"}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default ContactFaq;

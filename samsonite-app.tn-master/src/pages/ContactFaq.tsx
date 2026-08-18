import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, HelpCircle, Mail, MapPin, MessageSquareText, Phone, Printer, Send } from "lucide-react";

import { createContactMessage, listContactSubjects, type ContactSubject } from "@/lib/contact";
import { useLanguage } from "@/lib/i18n";

const ContactFaq = () => {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [subjects, setSubjects] = useState<ContactSubject[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const infoCards = isEn
    ? [
        {
          icon: MapPin,
          title: "Information",
          lines: ["Samsonite", "9, Rue 8601 Zone Industrielle", "Charguia 1", "2035 Ariana", "Tunisia"],
        },
        {
          icon: Phone,
          title: "Call us",
          lines: ["26 528 103 / 71 809 209"],
        },
        {
          icon: Printer,
          title: "Fax",
          lines: ["71 809 080"],
        },
        {
          icon: Mail,
          title: "Send us an email",
          lines: ["Use the contact form and include your order reference if available."],
        },
      ]
    : [
        {
          icon: MapPin,
          title: "Informations",
          lines: ["Samsonite", "9, Rue 8601 Zone Industrielle", "Charguia 1", "2035 Ariana", "Tunisie"],
        },
        {
          icon: Phone,
          title: "Appelez-nous",
          lines: ["26 528 103 / 71 809 209"],
        },
        {
          icon: Printer,
          title: "Fax",
          lines: ["71 809 080"],
        },
        {
          icon: Mail,
          title: "Envoyez-nous un e-mail",
          lines: ["Utilisez le formulaire de contact et indiquez votre référence de commande si disponible."],
        },
      ];

  const faqs = isEn
    ? [
        { q: "Which subject should I choose?", a: "Choose Customer service for orders, product availability, delivery, returns or after-sales support." },
        { q: "What should I include in my message?", a: "Add the product name, color, size, order reference and phone number so the team can answer faster." },
        { q: "Can I attach a document?", a: "Yes, attach a photo, proof of purchase or any document that helps explain your request." },
      ]
    : [
        { q: "Quel sujet choisir ?", a: "Choisissez Service client pour les commandes, disponibilites, livraisons, retours ou demandes apres-vente." },
        { q: "Que faut-il indiquer dans le message ?", a: "Ajoutez le nom du produit, la couleur, la taille, la référence de commande et votre téléphone pour une réponse plus rapide." },
        { q: "Puis-je joindre un document ?", a: "Oui, ajoutez une photo, une preuve d'achat ou tout document utile pour expliquer votre demande." },
      ];


  const fallbackSubjects = ["Service client", "Suivi de commande", "Service apres-vente", "Disponibilite produit"];
  const subjectOptions = subjects.length
    ? subjects.map((subject) => subject.labelFr)
    : fallbackSubjects;

  useEffect(() => {
    let cancelled = false;
    listContactSubjects(false)
      .then((items) => {
        if (!cancelled) setSubjects(items);
      })
      .catch(() => {
        if (!cancelled) setSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setSending(true);
    setError("");
    setSent(false);

    try {
      if (attachmentFile && attachmentFile.size > 5 * 1024 * 1024) {
        throw new Error(isEn ? "Attachment is too large (max 5 MB)" : "Piece jointe trop volumineuse (max 5 Mo)");
      }
      const attachment = attachmentFile
        ? {
            name: attachmentFile.name,
            type: attachmentFile.type || "application/octet-stream",
            data: await fileToDataUrl(attachmentFile),
          }
        : undefined;
      await createContactMessage({
        subject: String(formData.get("subject") || ""),
        email: String(formData.get("email") || ""),
        message: String(formData.get("message") || ""),
        attachmentName,
        attachment,
      });
      form.reset();
      setAttachmentName("");
      setAttachmentFile(null);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? "Unable to send the message" : "Impossible d'envoyer le message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white">
      <section className="border-b border-border bg-[#f7f7f5]">
        <div className="samsonite-container py-14">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">
            {isEn ? "Customer contact" : "Contact client"}
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase tracking-tight md:text-5xl">
            {isEn ? "Contact us" : "Contactez-nous"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
            {isEn
              ? "Need information about an order, a product, delivery or after-sales service? Send us your request and our team will guide you."
              : "Besoin d'une information sur une commande, un produit, la livraison ou le service apres-vente ? Envoyez votre demande et notre equipe vous orientera."}
          </p>
        </div>
      </section>

      <section className="samsonite-container grid gap-10 py-14 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          {infoCards.map((card) => (
            <article key={card.title} className="border border-border p-6">
              <card.icon className="h-7 w-7" />
              <h2 className="mt-5 text-lg font-black uppercase">{card.title}</h2>
              <div className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
                {card.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </article>
          ))}
        </aside>

        <div className="border border-border bg-white p-6 md:p-8">
          <div className="mb-7 flex items-center gap-3">
            <MessageSquareText className="h-7 w-7" />
            <h2 className="text-2xl font-black uppercase">
              {isEn ? "Send a message" : "Contactez-nous"}
            </h2>
          </div>

          {sent && (
            <div role="status" className="mb-5 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {isEn
                ? "Your message has been sent. Our team will get back to you."
                : "Votre message a été envoyé. Notre équipe vous répondra prochainement."}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                {isEn ? "Subject" : "Sujet"}
              </label>
              <select name="subject" className="h-12 w-full border border-border bg-white px-3 text-sm focus:border-black focus:outline-none">
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                {isEn ? "Email address" : "Adresse e-mail"}
              </label>
              <input
                required
                name="email"
                type="email"
                className="h-12 w-full border border-border bg-white px-3 text-sm focus:border-black focus:outline-none"
                placeholder={isEn ? "your@email.com" : "votre@email.com"}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                {isEn ? "Attachment" : "Document joint"}
                <span className="ml-2 font-semibold normal-case text-muted-foreground">
                  {isEn ? "optional" : "optionnel"}
                </span>
              </label>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 border border-dashed border-border px-4 text-sm text-muted-foreground transition-colors hover:border-black hover:text-foreground">
                <FileText className="h-5 w-5" />
                <span>{attachmentName || (isEn ? "Attach a document or photo" : "Joindre un document ou une photo")}</span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setAttachmentFile(file);
                    setAttachmentName(file?.name || "");
                  }}
                />
              </label>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                {isEn ? "Message" : "Message"}
              </label>
              <textarea
                required
                name="message"
                className="min-h-40 w-full resize-none border border-border bg-white p-3 text-sm focus:border-black focus:outline-none"
                placeholder={
                  isEn
                    ? "Describe your request. Add product name, order reference or phone number if needed."
                    : "Décrivez votre demande. Ajoutez le nom du produit, la référence de commande ou votre téléphone si besoin."
                }
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center justify-center gap-2 bg-black px-7 py-3 text-sm font-black uppercase tracking-wide text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {sending ? (isEn ? "Sending..." : "Envoi...") : isEn ? "Send" : "Envoyer"}
            </button>
          </form>
        </div>
      </section>

      <section className="border-y border-border bg-[#f7f7f5]">
        <div className="samsonite-container grid gap-10 py-14 lg:grid-cols-[320px_1fr]">
          <div>
            <HelpCircle className="h-8 w-8" />
            <h2 className="mt-4 text-2xl font-black uppercase">
              {isEn ? "Before contacting us" : "Avant de nous contacter"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {isEn
                ? "These details help the team process your request faster."
                : "Ces informations aident l'equipe a traiter votre demande plus rapidement."}
            </p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <details key={faq.q} className="group border border-border bg-white p-5">
                <summary className="cursor-pointer list-none text-sm font-black uppercase">{faq.q}</summary>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="samsonite-container py-14">
        <div className="flex flex-col gap-5 border border-border bg-black p-8 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <MapPin className="h-7 w-7" />
            <h2 className="mt-4 text-2xl font-black uppercase">
              {isEn ? "Prefer visiting a store?" : "Vous preferez passer en boutique ?"}
            </h2>
            <p className="mt-2 text-sm text-white/70">
              {isEn
                ? "Find the nearest Samsonite store and get direct assistance."
                : "Retrouvez la boutique Samsonite la plus proche et obtenez une assistance directe."}
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

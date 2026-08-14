import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Mail, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import {
  createContactSubject,
  deleteContactSubject,
  listContactMessages,
  listContactSubjects,
  updateContactMessageStatus,
  updateContactSubject,
  type ContactMessage,
  type ContactMessageStatus,
  type ContactSubject,
} from "@/lib/contact";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { toast } from "@/components/ui/sonner";

const statusLabels: Record<ContactMessageStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  closed: "Traite",
};

type StatusFilter = "all" | ContactMessageStatus;

const statusClasses: Record<ContactMessageStatus, string> = {
  new: "border-blue-100 bg-blue-50 text-blue-700",
  read: "border-amber-100 bg-amber-50 text-amber-700",
  closed: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));

const getAttachmentHref = (url?: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url
    .split("/")
    .map((segment, index) => (index === 0 ? segment : encodeURIComponent(segment)))
    .join("/");
};

const isImageAttachment = (name?: string, url?: string) =>
  /\.(png|jpe?g|webp|gif|avif)$/i.test(`${name || ""} ${url || ""}`);

const AdminMessages = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<ContactSubject[]>([]);
  const [subjectForm, setSubjectForm] = useState({ labelFr: "" });
  const [savingSubject, setSavingSubject] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");
      const [nextMessages, nextSubjects] = await Promise.all([
        listContactMessages(),
        listContactSubjects(true),
      ]);
      setMessages(nextMessages);
      setSubjects(nextSubjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return messages.filter((message) => {
      if (statusFilter !== "all" && message.status !== statusFilter) return false;
      if (subjectFilter !== "all" && message.subject !== subjectFilter) return false;
      if (!query) return true;
      return [message.subject, message.email, message.message, message.attachmentName || ""]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [messages, search, statusFilter, subjectFilter]);


  const handleStatusChange = async (id: number, status: ContactMessageStatus) => {
    try {
      setUpdatingId(id);
      const updated = await updateContactMessageStatus(id, status);
      setMessages((previous) => previous.map((message) => (message.id === id ? updated : message)));
      setSelected((previous) => (previous?.id === id ? updated : previous));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le statut");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateSubject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSavingSubject(true);
      setError("");
      const created = await createContactSubject({
        labelFr: subjectForm.labelFr,
        position: subjects.length + 1,
      });
      setSubjects((previous) => [...previous, created].sort((a, b) => a.position - b.position));
      setSubjectForm({ labelFr: "" });
      toast.success(`Sujet de message "${created.labelFr}" ajout\u00e9 avec succ\u00e8s.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le sujet");
    } finally {
      setSavingSubject(false);
    }
  };

  const handleToggleSubject = async (subject: ContactSubject) => {
    try {
      const updated = await updateContactSubject(subject.id, { active: !subject.active });
      setSubjects((previous) => previous.map((item) => (item.id === subject.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le sujet");
    }
  };

  const handleDeleteSubject = async (subject: ContactSubject) => {
    try {
      await deleteContactSubject(subject.id);
      setSubjects((previous) => previous.filter((item) => item.id !== subject.id));
      if (subjectFilter === subject.labelFr) setSubjectFilter("all");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer le sujet");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages contact</h1>
          <p className="mt-1 text-sm text-gray-500">Demandes envoyees depuis la page Nous contacter.</p>
        </div>
        <button
          type="button"
          onClick={loadMessages}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Rafraichir
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setSubjectsOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
          aria-expanded={subjectsOpen}
        >
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">Sujets de message</h2>
            <p className="mt-1 text-xs text-gray-500">Gerer les choix disponibles dans le formulaire Contact.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700">
            Gerer
            <ChevronDown className={`h-4 w-4 transition-transform ${subjectsOpen ? "rotate-180" : ""}`} />
          </span>
        </button>

        {subjectsOpen && (
          <div className="border-t border-gray-100 p-5">
            <form onSubmit={handleCreateSubject} className="flex flex-col gap-3 sm:flex-row">
              <input
                value={subjectForm.labelFr}
                onChange={(event) => setSubjectForm({ labelFr: event.target.value })}
                placeholder="Ex: Service client"
                className="h-11 flex-1 rounded-md border border-gray-300 px-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
              />
              <button
                type="submit"
                disabled={savingSubject}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-5 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            </form>

            <div className="mt-5 divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200">
              {subjects.length === 0 ? (
                <p className="px-4 py-5 text-sm text-gray-500">Aucun sujet configure.</p>
              ) : (
                subjects.map((subject) => (
                  <div key={subject.id} className="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{subject.labelFr}</p>
                      <p className="mt-1 text-xs text-gray-500">{subject.active ? "Visible dans le formulaire" : "Masque du formulaire"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ConfirmDeleteDialog
                        title={subject.active ? "Désactiver ce sujet ?" : "Activer ce sujet ?"}
                        description={
                          subject.active
                            ? `Le sujet "${subject.labelFr}" ne sera plus proposé dans le formulaire Contact. Les messages déjà reçus avec ce sujet resteront conservés.`
                            : `Le sujet "${subject.labelFr}" sera de nouveau proposé dans le formulaire Contact.`
                        }
                        confirmLabel={subject.active ? "Désactiver" : "Activer"}
                        pendingLabel="Mise à jour..."
                        tone={subject.active ? "warning" : "info"}
                        onConfirm={() => handleToggleSubject(subject)}
                      >
                        {(openDialog) => (
                          <button
                            type="button"
                            onClick={openDialog}
                            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${subject.active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-gray-200 bg-gray-50 text-gray-500"
                              }`}
                          >
                            {subject.active ? "Actif" : "Inactif"}
                          </button>
                        )}
                      </ConfirmDeleteDialog>
                      <ConfirmDeleteDialog
                        title="Supprimer ce sujet ?"
                        description={`Le sujet "${subject.labelFr}" sera supprimé de la liste des choix.`}
                        onConfirm={() => handleDeleteSubject(subject)}
                      >
                        {(openDialog) => (
                          <button
                            type="button"
                            onClick={openDialog}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-100 text-red-600 hover:bg-red-50"
                            aria-label="Supprimer le sujet"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </ConfirmDeleteDialog>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher par sujet, email ou message..."
              className="h-10 w-full rounded-md border border-gray-300 pl-10 pr-3 text-sm focus:border-black focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
              className="h-9 rounded-full border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 focus:border-black focus:outline-none"
            >
              <option value="all">Tous les sujets</option>
              {subjects
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((subject) => (
                  <option key={subject.id} value={subject.labelFr}>{subject.labelFr}</option>
                ))}
            </select>
            {([
              ["all", "Tous"],
              ["new", statusLabels.new],
              ["read", statusLabels.read],
              ["closed", statusLabels.closed],
            ] as Array<[StatusFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition-colors ${statusFilter === value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-gray-300" />
          <p className="font-medium text-gray-700">Chargement des messages...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <Mail className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">Aucun message trouve</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className={`divide-y divide-gray-100 ${filteredMessages.length > 4 ? "max-h-[520px] overflow-y-auto" : ""}`}>
              {filteredMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => setSelected(message)}
                  className={`block w-full px-5 py-4 text-left transition-colors hover:bg-gray-50 ${
                    selected?.id === message.id ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900">{message.subject}</p>
                      <p className="mt-1 text-xs text-gray-500">{message.email}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{message.message}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[message.status]}`}>
                      {statusLabels[message.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">{formatDate(message.createdAt)}</p>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            {selected ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Message #{selected.id}</p>
                    <h2 className="mt-1 text-lg font-bold text-gray-900">{selected.subject}</h2>
                    <p className="mt-1 text-sm text-gray-500">{formatDate(selected.createdAt)}</p>
                  </div>
                  <select
                    value={selected.status}
                    onChange={(event) => handleStatusChange(selected.id, event.target.value as ContactMessageStatus)}
                    disabled={updatingId === selected.id}
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[selected.status]}`}
                  >
                    {Object.entries(statusLabels).map(([status, label]) => (
                      <option key={status} value={status}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Email</p>
                  <a className="text-sm font-semibold text-gray-900 hover:underline" href={`mailto:${selected.email}`}>
                    {selected.email}
                  </a>
                </div>
                {selected.attachmentName && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Document joint</p>
                    {selected.attachmentUrl ? (
                      <div className="mt-2 space-y-3">
                        {isImageAttachment(selected.attachmentName, selected.attachmentUrl) && (
                          <a
                            href={getAttachmentHref(selected.attachmentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="block overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                          >
                            <img
                              src={getAttachmentHref(selected.attachmentUrl)}
                              alt={selected.attachmentName}
                              className="max-h-72 w-full object-contain"
                            />
                          </a>
                        )}
                        <a
                          href={getAttachmentHref(selected.attachmentUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {selected.attachmentName}
                        </a>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-gray-900">{selected.attachmentName}</p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Message</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{selected.message}</p>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-gray-500">Selectionnez un message pour voir le detail.</div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};


export default AdminMessages;











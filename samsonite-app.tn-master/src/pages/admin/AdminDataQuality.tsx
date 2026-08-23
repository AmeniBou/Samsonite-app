import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    Boxes,
    Database,
    FolderTree,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Tag,
} from "lucide-react";
import {
    fetchDataQualityReport,
    type DataQualityEntityType,
    type DataQualityIssue,
    type DataQualityReport,
    type DataQualitySeverity,
} from "@/lib/admin-api";
import AdminTablePagination from "@/components/admin/AdminTablePagination";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import {
    AdminActiveFilter,
    AdminFilterChip,
    AdminFilterSearch,
    AdminFiltersPanel,
    adminFilterActionClass,
    adminFilterLabelClass,
} from "@/components/admin/AdminFilters";
import { toast } from "@/components/ui/sonner";

const severityLabels: Record<DataQualitySeverity | "all", string> = {
    all: "Tous",
    critical: "Critique",
    warning: "À vérifier",
    info: "Info",
};

const entityLabels: Record<DataQualityEntityType | "all", string> = {
    all: "Tous les types",
    product: "Produits",
    variant: "Variantes",
    category: "Catégories",
    brand: "Marques",
    order: "Commandes",
    contact: "Messages",
};

const severityStyles: Record<DataQualitySeverity, string> = {
    critical: "bg-red-50 text-red-700 ring-red-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
};

const entityStyles: Record<DataQualityEntityType, string> = {
    product: "bg-neutral-100 text-neutral-700",
    variant: "bg-purple-50 text-purple-700",
    category: "bg-emerald-50 text-emerald-700",
    brand: "bg-blue-50 text-blue-700",
    order: "bg-orange-50 text-orange-700",
    contact: "bg-pink-50 text-pink-700",
};

const AdminDataQuality = () => {
    const [report, setReport] = useState<DataQualityReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [severityFilter, setSeverityFilter] = useState<DataQualitySeverity | "all">("all");
    const [entityFilter, setEntityFilter] = useState<DataQualityEntityType | "all">("all");
    const [issuesPage, setIssuesPage] = useState(1);
    const [issuesPageSize, setIssuesPageSize] = useState(10);

    const loadReport = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await fetchDataQualityReport();
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur de chargement du rapport");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const filteredIssues = useMemo(() => {
        const query = search.trim().toLowerCase();
        return (report?.issues || []).filter((issue) => {
            const matchesSeverity = severityFilter === "all" || issue.severity === severityFilter;
            const matchesEntity = entityFilter === "all" || issue.entityType === entityFilter;
            const matchesSearch =
                !query ||
                [issue.title, issue.description, issue.entityName, String(issue.entityId || "")]
                    .join(" ")
                    .toLowerCase()
                    .includes(query);

            return matchesSeverity && matchesEntity && matchesSearch;
        });
    }, [entityFilter, report?.issues, search, severityFilter]);

    const issueCounts = useMemo(() => {
        const issues = report?.issues || [];
        return {
            all: issues.length,
            critical: issues.filter((issue) => issue.severity === "critical").length,
            warning: issues.filter((issue) => issue.severity === "warning").length,
            info: issues.filter((issue) => issue.severity === "info").length,
        };
    }, [report?.issues]);

    useEffect(() => setIssuesPage(1), [search, severityFilter, entityFilter, issuesPageSize]);
    const safeIssuesPage = Math.min(issuesPage, Math.max(1, Math.ceil(filteredIssues.length / issuesPageSize)));
    const paginatedIssues = filteredIssues.slice((safeIssuesPage - 1) * issuesPageSize, safeIssuesPage * issuesPageSize);

    const groupedByType = useMemo(() => {
        const issues = report?.issues || [];
        return Object.keys(entityLabels)
            .filter((key) => key !== "all")
            .map((key) => ({
                key: key as DataQualityEntityType,
                count: issues.filter((issue) => issue.entityType === key).length,
            }));
    }, [report?.issues]);

    return (
        <div className="p-4 sm:p-5 lg:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-950">Qualité des données</h1>
                    <p className="mt-1 max-w-3xl text-xs text-gray-600">
                        Repère les produits, variantes, catégories et messages qui risquent de casser l'affichage ou de
                        rendre le catalogue incohérent.
                    </p>
                </div>

                <button
                    onClick={loadReport}
                    disabled={loading}
                    className="inline-flex h-9 items-center justify-center gap-2 border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Actualiser
                </button>
            </div>


            {loading && !report ? (
                <div className="border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
                    Analyse de la base en cours...
                </div>
            ) : report ? (
                <>
                    <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            icon={<ShieldAlert className="h-4 w-4" />}
                            label="Problèmes critiques"
                            value={report.summary.criticalIssues}
                            tone="red"
                        />
                        <SummaryCard
                            icon={<AlertTriangle className="h-4 w-4" />}
                            label="Points à vérifier"
                            value={report.summary.warningIssues}
                            tone="amber"
                        />
                        <SummaryCard
                            icon={<Boxes className="h-4 w-4" />}
                            label="Produits / variantes"
                            value={`${report.summary.products} / ${report.summary.variants}`}
                            tone="gray"
                        />
                        <SummaryCard
                            icon={<FolderTree className="h-4 w-4" />}
                            label="Catégories menu"
                            value={`${report.summary.mainMenuCategories}/7`}
                            tone="blue"
                        />
                    </div>

                    <AdminFiltersPanel
                        title="Filtres de qualité"
                        summary={`${filteredIssues.length} résultat${filteredIssues.length !== 1 ? "s" : ""} sur ${(report.issues || []).length} problème${(report.issues || []).length !== 1 ? "s" : ""}`}
                        className="mb-4"
                        actions={(
                            <button
                                type="button"
                                onClick={() => { setSearch(""); setSeverityFilter("all"); setEntityFilter("all"); }}
                                disabled={!search.trim() && severityFilter === "all" && entityFilter === "all"}
                                className={`${adminFilterActionClass} border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                                Réinitialiser
                            </button>
                        )}
                    >
                        <label className={adminFilterLabelClass}>
                            Recherche globale
                            <AdminFilterSearch
                                label="Rechercher dans les problèmes de qualité"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Produit, catégorie, message ou ID..."
                            />
                        </label>

                        <div className="mt-3 grid gap-3 xl:grid-cols-2">
                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-gray-600">Sévérité</span>
                                <div className="flex flex-wrap gap-2">
                                    {(Object.keys(severityLabels) as Array<DataQualitySeverity | "all">).map((severity) => (
                                        <AdminFilterChip key={severity} active={severityFilter === severity} onClick={() => setSeverityFilter(severity)}>
                                            {severityLabels[severity]} ({issueCounts[severity]})
                                        </AdminFilterChip>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="mb-1.5 block text-xs font-semibold text-gray-600">Type d’élément</span>
                                <div className="flex flex-wrap gap-2">
                                    <AdminFilterChip active={entityFilter === "all"} onClick={() => setEntityFilter("all")}>
                                        Tous les types
                                    </AdminFilterChip>
                                    {groupedByType.map((item) => (
                                        <AdminFilterChip key={item.key} active={entityFilter === item.key} onClick={() => setEntityFilter(item.key)}>
                                            {entityLabels[item.key]} ({item.count})
                                        </AdminFilterChip>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {(severityFilter !== "all" || entityFilter !== "all") && (
                        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
                            {severityFilter !== "all" && <AdminActiveFilter label={`Sévérité : ${severityLabels[severityFilter]}`} onRemove={() => setSeverityFilter("all")} />}
                            {entityFilter !== "all" && <AdminActiveFilter label={`Type : ${entityLabels[entityFilter]}`} onRemove={() => setEntityFilter("all")} />}
                        </div>
                        )}
                    </AdminFiltersPanel>

                    <div className="overflow-hidden border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5">
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-wide text-gray-950">
                                    Problèmes détectés
                                </h2>
                                <p className="text-[11px] text-gray-500">
                                    Dernière analyse : {new Date(report.generatedAt).toLocaleString("fr-FR")}
                                </p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-bold text-gray-600">
                                {filteredIssues.length} résultat(s)
                            </span>
                        </div>

                        {filteredIssues.length === 0 ? (
                            <AdminEmptyState
                                icon={ShieldCheck}
                                title={(report.issues || []).length === 0 ? "Aucun problème détecté" : "Aucun problème trouvé"}
                                description={(report.issues || []).length === 0
                                    ? "La dernière analyse n’a détecté aucun problème de qualité des données."
                                    : "Aucun problème ne correspond à la recherche ou aux filtres sélectionnés."}
                            />
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {paginatedIssues.map((issue) => (
                                    <IssueRow key={issue.id} issue={issue} />
                                ))}
                            </div>
                        )}
                        {filteredIssues.length > 0 && <AdminTablePagination page={safeIssuesPage} pageSize={issuesPageSize} totalItems={filteredIssues.length} onPageChange={setIssuesPage} onPageSizeChange={(pageSize) => { setIssuesPageSize(pageSize); setIssuesPage(1); }} />}
                    </div>
                </>
            ) : null}
        </div>
    );
};

const SummaryCard = ({
    icon,
    label,
    value,
    tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    tone: "red" | "amber" | "gray" | "blue";
}) => {
    const tones = {
        red: "bg-red-50 text-red-700 ring-red-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
        gray: "bg-gray-50 text-gray-800 ring-gray-100",
        blue: "bg-sky-50 text-sky-700 ring-sky-100",
    };

    return (
        <div className="border border-gray-200 bg-white p-3">
            <div className={`mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 ${tones[tone]}`}>
                {icon}
            </div>
            <p className="text-xl font-black text-gray-950">{value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
        </div>
    );
};

const IssueRow = ({ issue }: { issue: DataQualityIssue }) => {
    return (
        <div className="grid gap-3 px-3 py-3 lg:grid-cols-[165px_1fr_auto] lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ring-1 ${severityStyles[issue.severity]}`}>
                    {severityLabels[issue.severity]}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${entityStyles[issue.entityType]}`}>
                    {entityLabels[issue.entityType]}
                </span>
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-gray-950">{issue.title}</h3>
                    {issue.entityId && (
                        <span className="text-[11px] font-semibold text-gray-400">ID {issue.entityId}</span>
                    )}
                </div>
                {issue.entityName && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-gray-700">
                        <Tag className="h-3 w-3" />
                        {issue.entityName}
                    </p>
                )}
                <p className="mt-1 text-xs text-gray-600">{issue.description}</p>
            </div>

            {issue.fixUrl ? (
                <Link
                    to={issue.fixUrl}
                    className="inline-flex h-9 items-center justify-center gap-2 border border-gray-300 bg-white px-3 text-xs font-bold text-gray-900 transition-colors hover:border-gray-950"
                >
                    Corriger
                </Link>
            ) : (
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <Database className="h-3.5 w-3.5" />
                    Base
                </span>
            )}
        </div>
    );
};

export default AdminDataQuality;

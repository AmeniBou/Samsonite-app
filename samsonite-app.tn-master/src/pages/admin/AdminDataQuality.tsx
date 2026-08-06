import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import {
    AlertTriangle,
    Boxes,
    CheckCircle2,
    Database,
    FolderTree,
    RefreshCw,
    Search,
    ShieldAlert,
    Tag,
} from "lucide-react";
import {
    fetchDataQualityReport,
    type DataQualityEntityType,
    type DataQualityIssue,
    type DataQualityReport,
    type DataQualitySeverity,
} from "@/lib/admin-api";

const severityLabels: Record<DataQualitySeverity | "all", string> = {
    all: "Tous",
    critical: "Critique",
    warning: "A verifier",
    info: "Info",
};

const entityLabels: Record<DataQualityEntityType | "all", string> = {
    all: "Tous les types",
    product: "Produits",
    variant: "Variantes",
    category: "Categories",
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

    const loadReport = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await fetchDataQualityReport();
            setReport(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erreur chargement rapport");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, []);

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
        <div className="p-6 lg:p-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Backoffice</p>
                    <h1 className="mt-2 text-3xl font-black text-gray-950">Qualite des donnees</h1>
                    <p className="mt-2 max-w-3xl text-sm text-gray-600">
                        Repere les produits, variantes, categories et messages qui risquent de casser l'affichage ou de
                        rendre le catalogue incoherent.
                    </p>
                </div>

                <button
                    onClick={loadReport}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Actualiser
                </button>
            </div>

            {error && (
                <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                </div>
            )}

            {loading && !report ? (
                <div className="border border-gray-200 bg-white p-8 text-center text-gray-500">
                    Analyse de la base en cours...
                </div>
            ) : report ? (
                <>
                    <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            icon={<ShieldAlert className="h-5 w-5" />}
                            label="Problemes critiques"
                            value={report.summary.criticalIssues}
                            tone="red"
                        />
                        <SummaryCard
                            icon={<AlertTriangle className="h-5 w-5" />}
                            label="Points a verifier"
                            value={report.summary.warningIssues}
                            tone="amber"
                        />
                        <SummaryCard
                            icon={<Boxes className="h-5 w-5" />}
                            label="Produits / variantes"
                            value={`${report.summary.products} / ${report.summary.variants}`}
                            tone="gray"
                        />
                        <SummaryCard
                            icon={<FolderTree className="h-5 w-5" />}
                            label="Categories menu"
                            value={`${report.summary.mainMenuCategories}/7`}
                            tone="blue"
                        />
                    </div>

                    <div className="mb-6 border border-gray-200 bg-white p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Rechercher un produit, une categorie, un ID..."
                                    className="w-full border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition-colors focus:border-gray-900"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(severityLabels) as Array<DataQualitySeverity | "all">).map((severity) => (
                                    <button
                                        key={severity}
                                        onClick={() => setSeverityFilter(severity)}
                                        className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                                            severityFilter === severity
                                                ? "bg-gray-950 text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {severityLabels[severity]} ({issueCounts[severity]})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                onClick={() => setEntityFilter("all")}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                    entityFilter === "all" ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-600"
                                }`}
                            >
                                Tous les types
                            </button>
                            {groupedByType.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => setEntityFilter(item.key)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                        entityFilter === item.key ? "bg-gray-950 text-white" : entityStyles[item.key]
                                    }`}
                                >
                                    {entityLabels[item.key]} ({item.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-hidden border border-gray-200 bg-white">
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-wide text-gray-950">
                                    Issues detectees
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Derniere analyse : {new Date(report.generatedAt).toLocaleString("fr-FR")}
                                </p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                                {filteredIssues.length} resultat(s)
                            </span>
                        </div>

                        {filteredIssues.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                <div>
                                    <p className="font-bold text-gray-950">Aucun probleme pour ces filtres</p>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Change les filtres ou relance l'analyse pour verifier la base.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {filteredIssues.map((issue) => (
                                    <IssueRow key={issue.id} issue={issue} />
                                ))}
                            </div>
                        )}
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
        <div className="border border-gray-200 bg-white p-4">
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full ring-1 ${tones[tone]}`}>
                {icon}
            </div>
            <p className="text-2xl font-black text-gray-950">{value}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
        </div>
    );
};

const IssueRow = ({ issue }: { issue: DataQualityIssue }) => {
    return (
        <div className="grid gap-3 px-4 py-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${severityStyles[issue.severity]}`}>
                    {severityLabels[issue.severity]}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${entityStyles[issue.entityType]}`}>
                    {entityLabels[issue.entityType]}
                </span>
            </div>

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-gray-950">{issue.title}</h3>
                    {issue.entityId && (
                        <span className="text-xs font-semibold text-gray-400">ID {issue.entityId}</span>
                    )}
                </div>
                {issue.entityName && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-gray-700">
                        <Tag className="h-3.5 w-3.5" />
                        {issue.entityName}
                    </p>
                )}
                <p className="mt-1 text-sm text-gray-600">{issue.description}</p>
            </div>

            {issue.fixUrl ? (
                <Link
                    to={issue.fixUrl}
                    className="inline-flex items-center justify-center gap-2 border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900 transition-colors hover:border-gray-950"
                >
                    Corriger
                </Link>
            ) : (
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400">
                    <Database className="h-4 w-4" />
                    Base
                </span>
            )}
        </div>
    );
};

export default AdminDataQuality;

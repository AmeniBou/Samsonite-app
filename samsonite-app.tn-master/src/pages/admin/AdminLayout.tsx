import { useState } from "react";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
    LogOut,
    ArrowLeft,
    PackageCheck,
    Package,
    Mail,
    FolderTree,
    ShieldAlert,
    BadgeCheck,
    BadgePercent,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";

const sidebarTitleStyle = { fontSize: "15px", color: "#ffffff" };
const sidebarMetaStyle = { fontSize: "12px", color: "#c7d7f2" };
const sidebarSectionStyle = { fontSize: "10px", color: "#9fb2d1" };
const sidebarTextStyle = { fontSize: "13px", color: "#d7e5ff" };

const AdminLayout = () => {
    const { isAuthenticated, username, loading, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <p className="text-gray-500">Chargement...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/admin/login" replace />;
    }

    const navItems = [
        { to: "/admin/produits", icon: Package, label: "Produits" },
        { to: "/admin/commandes", icon: PackageCheck, label: "Commandes" },
        { to: "/admin/messages", icon: Mail, label: "Messages" },
        { to: "/admin/categories", icon: FolderTree, label: "Catégories" },
        { to: "/admin/marques", icon: BadgeCheck, label: "Marques" },
        { to: "/admin/promotions", icon: BadgePercent, label: "Promotions" },
        { to: "/admin/qualite-donnees", icon: ShieldAlert, label: "Qualité données" },
    ];

    return (
        <div className="flex min-h-screen bg-gray-100">
            <aside
                className={`relative flex min-h-screen shrink-0 flex-col border-r border-blue-900 bg-blue-950 text-white shadow-xl transition-[width] duration-200 ${
                    collapsed ? "w-[68px]" : "w-64"
                }`}
                style={{
                    backgroundColor: "#07162f",
                    borderColor: "#14294a",
                    color: "#ffffff",
                }}
            >
                <div className={`border-b border-blue-900/70 ${collapsed ? "px-2 py-4" : "px-4 py-4"}`}>
                    <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
                        <div className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7357ff] text-sm font-black tracking-tight text-white shadow-sm shadow-black/20">
                                S
                            </div>
                            {!collapsed && (
                                <div className="min-w-0">
                                    <h2 className="font-black tracking-tight" style={sidebarTitleStyle}>Samsonite Administration</h2>
                                    <p className="mt-0.5 font-bold" style={sidebarMetaStyle}>Connecté : {username}</p>
                                </div>

                            )}
                        </div>
                        {!collapsed && (
                            <button
                                type="button"
                                onClick={() => setCollapsed(true)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-900/60 text-white transition-colors hover:bg-blue-800"
                                aria-label="Replier la sidebar"
                                title="Replier"
                            >
                                <PanelLeftClose className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    {collapsed && (
                        <button
                            type="button"
                            onClick={() => setCollapsed(false)}
                            className="absolute -right-3 top-9 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg shadow-black/30 ring-1 ring-white/20 transition-colors hover:bg-blue-800"
                            aria-label="Ouvrir la sidebar"
                            title="Ouvrir"
                        >
                            <PanelLeftOpen className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <nav className={`block space-y-2 overflow-y-visible px-3 py-3 ${collapsed ? "px-2 pt-5" : ""}`}>
                    {!collapsed && (
                        <p className="px-3 pb-2 pt-1 font-black uppercase tracking-[0.22em]" style={sidebarSectionStyle}>
                            Navigation
                        </p>
                    )}
                    {navItems.map((item) => {
                        const active = item.exact
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to);

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                title={collapsed ? item.label : undefined}
                                className={`group relative flex shrink-0 items-center rounded-xl font-bold transition-colors ${
                                    collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "gap-3 px-3 py-2.5"
                                }`}
                                style={{
                                    backgroundColor: active ? "#15396b" : "transparent",
                                    color: active ? "#ffffff" : "#d7e5ff",
                                    fontSize: sidebarTextStyle.fontSize,
                                }}
                            >
                                <span
                                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                                    style={{ color: active ? "#ffffff" : "#d7e5ff" }}
                                >
                                    <item.icon className="h-4 w-4" />
                                </span>
                                {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className={`space-y-2 border-t border-blue-900/70 px-3 py-3 ${collapsed ? "mt-auto md:px-2" : ""}`}>
                    <Link
                        to="/"
                        target="_blank"
                        rel="noreferrer"
                        title={collapsed ? "Aller au site" : undefined}
                        className={`group flex items-center rounded-xl font-bold transition-colors hover:text-white ${
                            collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "gap-3 px-3 py-2.5"
                        }`}
                        style={sidebarTextStyle}
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors group-hover:text-white" style={{ color: "#d7e5ff" }}>
                            <ArrowLeft className="h-4 w-4" />
                        </span>
                        {!collapsed && "Aller au site"}
                    </Link>
                    <button
                        onClick={logout}
                        title={collapsed ? "Déconnexion" : undefined}
                        className={`group flex w-full items-center rounded-xl font-bold transition-colors hover:text-white ${
                            collapsed ? "mx-auto h-11 w-11 justify-center p-0" : "gap-3 px-3 py-2.5"
                        }`}
                        style={sidebarTextStyle}
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors group-hover:text-white" style={{ color: "#d7e5ff" }}>
                            <LogOut className="h-4 w-4" />
                        </span>
                        {!collapsed && "Déconnexion"}
                    </button>
                </div>
            </aside>

            <main className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-screen">
                <div className="admin-reference flex-1 overflow-auto bg-gray-50">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;

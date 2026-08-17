import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LayoutDashboard, PlusCircle, LogOut, ArrowLeft, PackageCheck, Mail, FolderTree, ShieldAlert } from "lucide-react";

const AdminLayout = () => {
    const { isAuthenticated, username, loading, logout } = useAuth();
    const location = useLocation();

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
        { to: "/admin", icon: LayoutDashboard, label: "Tableau de bord", exact: true },
        { to: "/admin/commandes", icon: PackageCheck, label: "Commandes" },
        { to: "/admin/messages", icon: Mail, label: "Messages" },
        { to: "/admin/categories", icon: FolderTree, label: "Categories" },
        { to: "/admin/qualite-donnees", icon: ShieldAlert, label: "Qualite donnees" },
        { to: "/admin/produits/nouveau", icon: PlusCircle, label: "Ajouter produit" },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
            {/* Sidebar */}
            <aside className="flex w-full shrink-0 flex-col bg-gray-900 text-white md:w-64">
                <div className="p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold">Samsonite Admin</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Admin : {username}</p>
                </div>

                <div className="p-2 border-b border-gray-700 space-y-1">
                    <Link
                        to="/"
                        className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white rounded-md transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Retour au site
                    </Link>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Déconnexion
                    </button>
                </div>

                <nav className="flex flex-1 gap-1 overflow-x-auto px-2 py-3 md:block md:space-y-1 md:px-2 md:py-4">
                    {navItems.map((item) => {
                        const active = item.exact
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to);

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active
                                    ? "bg-white/10 text-white"
                                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                                    }`}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main content */}
            <main className="flex min-h-0 min-w-0 flex-1 flex-col md:min-h-screen">
                <div className="flex-1 overflow-auto bg-gray-50">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;

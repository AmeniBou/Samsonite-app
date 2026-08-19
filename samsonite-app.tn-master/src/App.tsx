import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { CartProvider } from "@/hooks/useCart";
import { LanguageProvider } from "@/lib/i18n";
import Layout from "@/components/layout/Layout";
import Home from "./pages/Home";
import Category from "./pages/Category";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Search from "./pages/Search";
import Brand from "./pages/Brand";
import Services from "./pages/Services";
import PrestashopConfig from "./pages/PrestashopConfig";
import Stores from "./pages/Stores";
import Account from "./pages/Account";
import Shipping from "./pages/Shipping";
import Returns from "./pages/Returns";
import Newsletter from "./pages/Newsletter";
import DataError from "./pages/DataError";
import ContactFaq from "./pages/ContactFaq";
import SiteMap from "./pages/SiteMap";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBrands from "./pages/admin/AdminBrands";
import AdminDataQuality from "./pages/admin/AdminDataQuality";
import AdminPromotions from "./pages/admin/AdminPromotions";
import OrderConfirmation from "./pages/OrderConfirmation";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.title = "Samsonite Tunisie | Bagages, Valises, Sacs";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              {/* Admin routes - layout séparé sans header/footer public */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="commandes" element={<AdminOrders />} />
                <Route path="messages" element={<AdminMessages />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="marques" element={<AdminBrands />} />
                <Route path="promotions" element={<AdminPromotions />} />
                <Route path="qualite-donnees" element={<AdminDataQuality />} />
                <Route path="produits/nouveau" element={<AdminProductForm />} />
                <Route path="produits/modifier/:id" element={<AdminProductForm />} />
              </Route>

              {/* Public routes - layout avec header/footer */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/categorie/:slug" element={<Category />} />
                <Route path="/produit/:slug" element={<Product />} />
                <Route path="/panier" element={<Cart />} />
                <Route path="/commande" element={<Checkout />} />
                <Route path="/commande/confirmation/:id" element={<OrderConfirmation />} />
                <Route path="/recherche" element={<Search />} />
                <Route path="/la-marque" element={<Brand />} />
                <Route path="/a-propos" element={<Brand />} />
                <Route path="/services" element={<Services />} />
                <Route path="/magasins" element={<Stores />} />
                <Route path="/compte" element={<Account />} />
                <Route path="/livraison" element={<Shipping />} />
                <Route path="/retours" element={<Returns />} />
                <Route path="/contact-faq" element={<ContactFaq />} />
                <Route path="/nous-contacter" element={<ContactFaq />} />
                <Route path="/plan-du-site" element={<SiteMap />} />
                <Route path="/newsletter" element={<Newsletter />} />
                <Route path="/erreur" element={<DataError />} />
                <Route path="/config" element={<PrestashopConfig />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </LanguageProvider>
      </CartProvider>
    </QueryClientProvider>
  );
};

export default App;

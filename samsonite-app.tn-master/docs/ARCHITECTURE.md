# Architecture

## Vue generale

Le projet est separe en deux parties :

- Frontend React dans `src/`
- Backend Express dans `server/`

Le frontend appelle le backend via les routes `/api/...`. En developpement, Vite sert l'application sur `localhost:8080` et le backend tourne sur le port defini dans `server/.env`, actuellement `3002`.

## Frontend

Pages publiques principales :

- `src/pages/Home.tsx` : page d'accueil.
- `src/pages/Category.tsx` : liste produits par categorie.
- `src/pages/Product.tsx` : fiche produit avec variantes, images, prix, stock et caracteristiques.
- `src/pages/Cart.tsx` : panier.
- `src/pages/Checkout.tsx` : passage de commande.
- `src/pages/OrderConfirmation.tsx` : confirmation de commande.
- `src/pages/ContactFaq.tsx` : contact et FAQ.
- `src/pages/Stores.tsx` : boutiques/adresses.

Pages backoffice :

- `src/pages/admin/AdminLayout.tsx` : layout backoffice et sidebar.
- `src/pages/admin/AdminDashboard.tsx` : tableau de bord produits.
- `src/pages/admin/AdminProductForm.tsx` : ajout/modification produit.
- `src/pages/admin/AdminCategories.tsx` : categories.
- `src/pages/admin/AdminBrands.tsx` : marques.
- `src/pages/admin/AdminOrders.tsx` : commandes.
- `src/pages/admin/AdminMessages.tsx` : messages clients.
- `src/pages/admin/AdminPromotions.tsx` : promotions.
- `src/pages/admin/AdminDataQuality.tsx` : qualite des donnees.

## Backend

Routes principales :

- `server/src/routes/catalog.routes.ts` : catalogue public.
- `server/src/routes/products.routes.ts` : backoffice produits, categories, marques, promotions.
- `server/src/routes/orders.routes.ts` : commandes.
- `server/src/routes/contact.routes.ts` : messages contact.
- `server/src/routes/auth.routes.ts` : authentification admin.

Services principaux :

- `catalog.service.ts` : lecture et mapping catalogue.
- `orders.service.ts` : creation commandes, stock, statuts.
- `contact.service.ts` : messages et pieces jointes.
- `promotions.service.ts` : regles de promotions et calcul des remises.
- `prestashop.service.ts` : compatibilite/import Prestashop.

## Flux principaux

### Catalogue

1. Le frontend demande les produits au backend.
2. Le backend lit `Product`, `ProductVariant`, `ProductImage`, `Category`, `Brand`.
3. Les promotions actives sont calculees cote backend.
4. Le frontend recoit deja les prix publics a afficher.

### Commande

1. Le client ajoute un produit/variante au panier.
2. Le checkout envoie la commande au backend.
3. Le backend recalcule les prix cote serveur.
4. Le backend decremente le stock de la variante ou du produit.
5. La commande est stockee dans PostgreSQL.
6. Le backoffice affiche la commande et son historique.

### Promotions

1. L'admin cree une promotion avec pourcentage, periode, priorite et cible.
2. La cible peut etre : produits, marques, categories, ou combinaison marque + categorie.
3. Les produits correspondant aux regles recoivent automatiquement le prix remise cote catalogue.
4. Les commandes conservent le prix original, le prix applique et le nom de promotion.

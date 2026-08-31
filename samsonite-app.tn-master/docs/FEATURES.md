# Fonctionnalites metier

## Catalogue public

- Affichage des produits par categorie.
- Filtres par marque, prix, stock, couleur et caracteristiques selon les donnees disponibles.
- Badges de disponibilite.
- Badges et prix remises lorsque des promotions sont actives.

## Fiche produit

La fiche produit affiche galerie d'images, variante selectionnee, prix, disponibilite, couleur, dimensions, volume, poids, caracteristiques techniques et ajout au panier.

Quand l'utilisateur change de couleur ou de variante, la page doit mettre a jour les images, le prix, le stock et les caracteristiques liees a la variante.

## Panier

Le panier contient produit, image, couleur, dimensions, quantite, prix unitaire, total ligne et bouton de suppression avec confirmation.

## Checkout

Le checkout est organise en etapes : confirmation panier, informations personnelles, adresse, livraison, paiement et confirmation.

Controles importants : telephone tunisien a 8 chiffres, champs obligatoires marques, date de naissance via champ date, methode de paiement limitee aux options disponibles.

## Commande recue

La page de confirmation doit rassurer le client avec numero de commande, resume, delai de livraison, contact et bouton d'impression.

## Stock

Le stock est decremente lors de la validation de commande cote backend.

Si une commande est annulee avant confirmation definitive, le stock doit etre restitue selon la logique metier definie.

## Promotions

Les promotions peuvent cibler des produits precis, marques, categories ou combinaison marque + categorie.

Si un nouveau produit correspond a une regle active, la remise doit s'appliquer automatiquement car le calcul se fait au moment de charger le catalogue.

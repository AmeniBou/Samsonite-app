# Backoffice

URL locale :

```text
http://localhost:8080/admin
```

## Authentification

Les utilisateurs admin sont stockes dans la table `AdminUser`. Le login appelle le backend via `/api/auth/login` et recoit un token JWT.

## Produits

La page produits permet d'afficher le catalogue, filtrer par marque/categorie/statut/stock, ajouter ou modifier un produit, gerer les variantes, importer des images depuis l'ordinateur et previsualiser la fiche produit avant validation.

Un produit doit avoir au moins une variante pour etre coherent avec le systeme actuel.

## Variantes

Chaque variante peut contenir couleur, dimensions, dimensions extensibles, volume, poids, prix, stock et images.

Le frontend utilise les variantes pour afficher les bonnes images, le bon prix et le bon stock.

## Categories

La page categories permet d'ajouter une categorie principale, ajouter une sous-categorie, activer/desactiver une categorie, choisir l'affichage dans le menu principal, choisir l'affichage sous Explorer et modifier le slug.

Regles importantes :

- Le menu principal ne doit pas depasser 7 categories.
- Le slug doit etre unique.
- Une sous-categorie ne doit pas devenir une sous-sous-categorie.

## Marques

La page marques permet de gerer les marques du catalogue. Les marques alimentent les fiches produits, les filtres catalogue et les promotions.

## Commandes

La page commandes permet de rechercher une commande, filtrer par statut/date/paiement, changer le statut avec une logique controlee, consulter l'historique et exporter une commande ou une liste.

La logique de statut evite les retours incoherents. Par exemple, une commande livree ne doit pas redevenir nouvelle.

## Messages

La page messages permet de lire les messages contact, filtrer par statut, filtrer par sujet, gerer les sujets disponibles dans le formulaire public et ouvrir les pieces jointes.

## Promotions

La page promotions permet de creer une regle de remise, cibler des produits/marques/categories, definir une periode, definir une priorite, activer/desactiver une regle et voir les produits concernes.

Les prix remises sont calcules cote backend pour eviter que le frontend applique une remise incorrecte.

## Qualite des donnees

La page qualite des donnees sert a reperer les produits sans variante, variantes sans image, categories mal configurees, donnees incompletes et incoherences de menu.

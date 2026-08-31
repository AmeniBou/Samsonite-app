# Base de donnees

## Technologie

La base de donnees est PostgreSQL. Prisma est utilise comme ORM.

Fichiers importants :

```text
server/prisma/schema.prisma
server/prisma/migrations/
server/.env
```

## Modeles principaux

### Product

Produit principal du catalogue. Il contient le nom, la reference, la description, le prix de base, la disponibilite, les dimensions generales, la marque, les images, les variantes, les categories et les caracteristiques.

### ProductVariant

Variante d'un produit. Elle contient la couleur, les dimensions, les dimensions extensibles, le volume, le poids, le prix specifique, le stock et les images.

Une fiche produit peut donc changer d'images, de prix et de stock selon la couleur ou la variante selectionnee.

### Brand

Marques du catalogue : Samsonite, American Tourister, Lipault, Disney.

### Category

Categories et sous-categories.

Champs importants :

- `isActive` : affiche ou masque la categorie.
- `showInMainMenu` : permet d'afficher une categorie principale dans le menu.
- `parentId` : indique si la categorie est une sous-categorie.
- `slug` : partie lisible et unique utilisee dans l'URL.

### Order

Commande client avec reference unique, statut, informations client, adresse, livraison, paiement, totaux, articles et historique.

### OrderItem

Ligne de commande. Elle garde une copie des informations au moment de l'achat : nom produit, image, couleur, quantite, prix unitaire applique, prix original si promotion, pourcentage de remise et nom de promotion.

### PromotionRule

Regle de promotion avec nom, pourcentage, statut, periode, priorite et cibles : marques, categories ou produits.

## Export de la base

Creer un dump :

```powershell
$env:PGPASSWORD='mot_de_passe'
& 'C:\Program Files\PostgreSQL\15\bin\pg_dump.exe' -h localhost -p 5432 -U postgres -d samsonite -F c -b -v -f 'C:\Users\ameni\Desktop\samsonite_backup.dump'
```

Restaurer chez un collegue :

```powershell
createdb -h localhost -p 5432 -U postgres samsonite
pg_restore -h localhost -p 5432 -U postgres -d samsonite -v 'C:\chemin\samsonite_backup.dump'
```

## Points d'attention

- Le dump contient les donnees, mais pas les images uploadees si elles sont stockees comme fichiers.
- Pour transferer un environnement complet, envoyer aussi `server/public/images` et `server/public/attachments` si necessaire.
- Ne jamais partager un `.env` contenant un vrai mot de passe public.

# Installation, transfert et reprise du projet

## Installer le projet sur un autre ordinateur

1. Installer Node.js.
2. Installer PostgreSQL.
3. Cloner le depot Git.
4. Installer les dependances frontend :

```bash
npm install
```

5. Installer les dependances backend :

```bash
cd server
npm install
```

6. Creer `server/.env` :

```env
DATABASE_URL="postgresql://postgres:mot_de_passe@localhost:5432/samsonite"
PORT=3002
```

7. Restaurer la base de donnees.
8. Generer le client Prisma :

```bash
cd server
npx prisma generate
```

9. Demarrer le backend :

```bash
npm run dev
```

10. Demarrer le frontend :

```bash
npm run dev
```

## Transferer la base de donnees

Creer un dump :

```powershell
$env:PGPASSWORD='mot_de_passe'
& 'C:\Program Files\PostgreSQL\15\bin\pg_dump.exe' -h localhost -p 5432 -U postgres -d samsonite -F c -b -v -f 'C:\Users\ameni\Desktop\samsonite_backup.dump'
```

Restaurer :

```powershell
createdb -h localhost -p 5432 -U postgres samsonite
pg_restore -h localhost -p 5432 -U postgres -d samsonite -v 'C:\chemin\samsonite_backup.dump'
```

## Transferer les fichiers uploades

La base contient les chemins des fichiers, mais les fichiers eux-memes sont dans le dossier backend.

A envoyer si necessaire :

```text
server/public/images
server/public/attachments
server/public/order-emails
```

## Checklist pour un collegue

- PostgreSQL installe.
- Base restauree.
- `server/.env` cree.
- `npm install` execute a la racine et dans `server/`.
- `npx prisma generate` execute dans `server/`.
- Backend lance sur `3002`.
- Frontend lance sur `8080`.

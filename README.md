# Assistant de Facturation - AUTO PIECE ADAROCH S.A.R.L

Application web qui remplace la création manuelle de factures par un assistant IA.
L'employé discute avec l'assistant, qui pose une question à la fois. Une fois toutes
les informations collectées, la facture est générée automatiquement en **DOCX** et **PDF**,
en respectant fidèlement la mise en page du modèle original de la boutique.

---

## 1. Technologies utilisées

- HTML / CSS / JavaScript vanille (frontend)
- Node.js + Express.js (backend)
- OpenAI GPT-4.1 nano (assistant conversationnel)
- `docxtemplater` + `pizzip` (remplissage du modèle Word)
- `libreoffice-convert` (conversion DOCX → PDF)

Aucun framework frontend (pas de React/Vue/Angular), aucune base de données.

---

## 2. Prérequis

- **Node.js** version 18 ou supérieure
- **LibreOffice** installé sur la machine qui exécute le serveur (nécessaire pour la
  conversion DOCX → PDF). Sur la plupart des distributions Linux :
  ```bash
  sudo apt install libreoffice
  ```
  Sur macOS : `brew install --cask libreoffice`. Sur Windows : installez LibreOffice
  et assurez-vous que `soffice` est accessible dans le PATH.
- Une **clé API OpenAI** valide (https://platform.openai.com/api-keys)

---

## 3. Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer votre fichier d'environnement
cp .env.example .env
```

Ouvrez `.env` et renseignez votre clé :

```
OPENAI_API_KEY=sk-votre-cle-ici
PORT=3000
```

---

## 4. Démarrage

```bash
npm start
```

Puis ouvrez votre navigateur à l'adresse : http://localhost:3000

---

## 5. Utilisation

1. L'assistant vous accueille et demande le **numéro de facture** (ex: `FC001`).
2. Répondez dans le champ de texte en bas du panneau de discussion.
3. L'assistant continue avec :
   - Le **client** (`Client Divers` ou un nom de société, ex: `STE BJD`)
   - Le **mode de règlement** (`ESP` ou `CHQ`)
   - La **date de la facture** (ex: `01/07/2026`)
   - Le **montant total TTC** (ex: `1700`)
4. Une fois les 5 informations réunies, la facture est générée automatiquement :
   - Le **HT** et la **TVA** sont calculés (HT = TTC / 1.20)
   - Entre 4 et 6 lignes de pièces détachées sont générées aléatoirement, dont la
     somme correspond **exactement** au montant TTC saisi
   - Le montant est écrit en toutes lettres en français
5. L'aperçu de la facture s'affiche à droite. Vous pouvez télécharger :
   - Le fichier **DOCX** (modifiable, garde la mise en page exacte du modèle)
   - Le fichier **PDF** (identique visuellement au DOCX)

Pour créer une nouvelle facture, rafraîchissez la page.

---

## 6. Structure du projet

```
/adaroch-invoice-app
    /public
        index.html        Interface (page unique)
        style.css          Style de l'interface
        app.js             Logique du chat et de l'aperçu (frontend)
    /routes
        chat.js            Route POST /api/chat (discussion avec l'IA)
        invoice.js          Routes POST /api/generate-invoice + GET /api/download
    /services
        openaiService.js   Appel sécurisé à l'API OpenAI (clé jamais exposée au navigateur)
        partsGenerator.js  Génération aléatoire des lignes de pièces détachées
        invoiceService.js  Remplissage du modèle DOCX + conversion en PDF
    /utils
        calculations.js    Calcul HT / TVA
        numberToWords.js   Conversion d'un montant en lettres françaises
    /templates
        modele-facture-adaroch.docx   Modèle Word original de la facture
    /generated                        Factures générées (créé automatiquement)
    .env.example
    package.json
    server.js
    README.md
```

---

## 7. Variables d'environnement

| Variable          | Description                                   | Obligatoire |
|-------------------|------------------------------------------------|-------------|
| `OPENAI_API_KEY`  | Clé API OpenAI utilisée par le serveur          | Oui         |
| `PORT`            | Port d'écoute du serveur (défaut : `3000`)      | Non         |

La clé API n'est **jamais** envoyée au navigateur : tous les appels à OpenAI passent
par le backend Express.

---

## 8. Notes sur la génération des pièces détachées

Le backend sélectionne aléatoirement entre 4 et 6 pièces parmi un catalogue fixe
(Tete cardan, Amortisseur, Huile moteur, Filter huile/air/gazoil, Disque et
Plaquette frein, Colier, Thermostat, Pompe eau, Kit embrayage, Volant moteur,
Courroie distribution, Support cardan/moteur), en respectant la fourchette de prix
unitaire autorisée pour chaque pièce. L'algorithme réessaie automatiquement jusqu'à
ce que la somme des lignes corresponde **exactement** au montant TTC saisi par
l'employé. Dans les cas extrêmes (montant très faible incompatible avec les prix
minimums du catalogue), une ligne unique garantit tout de même l'exactitude du total.

---

## 9. Dépannage

- **"OPENAI_API_KEY manquant"** : vérifiez que le fichier `.env` existe bien à la
  racine du projet et contient une clé valide.
- **Erreur lors de la conversion PDF** : vérifiez que LibreOffice (`soffice`) est
  bien installé et accessible dans le PATH de votre système.
- **Le port 3000 est déjà utilisé** : changez la valeur de `PORT` dans `.env`.

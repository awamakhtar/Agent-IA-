# Africa Shopping - Agent Marketing IA (V1)

Projet de départ : interface de chat Next.js + backend PHP + IA gratuite (Google Gemini).

## Structure

```
agent-marketing-ai/
├── .gitignore                 → exclut config.php et .env.local du dépôt
├── backend/
│   ├── config.example.php     → modèle SANS clé réelle (à commiter)
│   ├── config.php             → ⚠️ ta vraie clé API — JAMAIS commité (généré localement)
│   ├── knowledge-loader.php   → charge et concatène knowledge/*.md
│   ├── chat.php                → endpoint principal (POST)
│   ├── system-prompt.md        → prompt système de l'agent
│   └── knowledge/              → base de connaissances Africa Shopping
└── frontend/
    ├── app/
    │   ├── layout.js
    │   └── page.js              → interface de chat
    ├── package.json
    ├── next.config.js
    └── .env.local.example
```

## 1. Récupérer une clé API Gemini (gratuite)

1. Va sur https://aistudio.google.com/apikey
2. Connecte-toi avec un compte Google
3. Clique sur "Create API Key" — aucune carte bancaire requise
4. Copie la clé générée

## 2. Configurer le backend

⚠️ **Ne mets jamais ta vraie clé dans `config.example.php`** — ce fichier est commité sur GitHub.

Copie le fichier exemple vers ton propre fichier local (celui-ci est ignoré par git, cf. `.gitignore`) :
```bash
cd backend
cp config.example.php config.php
```

Puis ouvre `config.php` et remplace :
```php
define('GEMINI_API_KEY', getenv('GEMINI_API_KEY') ?: 'COLLE_TA_CLE_GEMINI_ICI');
```
soit en collant directement ta clé à la place de `COLLE_TA_CLE_GEMINI_ICI`,
soit (recommandé, surtout en production) en définissant une variable d'environnement
`GEMINI_API_KEY` avant de lancer PHP — dans ce cas tu n'as même pas besoin d'écrire
la clé dans le fichier.

## 3. Lancer le backend PHP

Depuis le dossier `backend/`, lance le serveur PHP intégré :
```bash
cd backend
php -S localhost:8000
```
Ton endpoint est maintenant accessible sur `http://localhost:8000/chat.php`.

Teste-le rapidement avec curl :
```bash
curl -X POST http://localhost:8000/chat.php \
  -H "Content-Type: application/json" \
  -d '{"message": "Prépare une campagne pour les uniformes scolaires."}'
```

## 4. Lancer le frontend Next.js

Depuis le dossier `frontend/` :
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
Ouvre http://localhost:3000 — l'interface de chat est prête.

## 5. Tester

Essaie les exemples du cahier des charges :
- « Prépare une campagne pour les uniformes scolaires. »
- « Donne-moi 10 idées de Reels pour promouvoir les toges. »
- « Analyse cette campagne Facebook et propose des améliorations : Budget 30 000 FCFA, Portée 45 000, Clics 1 250, Messages 87, Commandes 12 »

## Prochaines étapes (V2)

- Calendrier éditorial
- Analyse de campagnes avec données structurées
- Recherche web / veille marketing
- Sélection intelligente de la base de connaissances (au lieu de tout charger) quand elle grossira

## Publier sur GitHub sans exposer ta clé API

Le `.gitignore` fourni exclut déjà `backend/config.php` et `frontend/.env.local` — donc si tu
initialises le dépôt Git **après** avoir créé ces fichiers, tu ne risques rien :

```bash
git init
git add .
git status   # vérifie ici que config.php et .env.local n'apparaissent PAS dans la liste
git commit -m "Premier commit — Agent Marketing IA V1"
git remote add origin https://github.com/<ton-compte>/<ton-repo>.git
git push -u origin main
```

**Vérification avant de pusher** : lance `git status` et assure-toi que seul
`config.example.php` apparaît, jamais `config.php`. Si `config.php` apparaît quand même dans
la liste, c'est que le `.gitignore` n'est pas pris en compte (vérifie qu'il est bien à la racine
du dépôt, au même niveau que `.git/`).

⚠️ **Si tu as déjà pushé ta clé par erreur avant de lire ceci** : régénère-la immédiatement sur
https://aistudio.google.com/apikey (supprime l'ancienne, crée-en une nouvelle) — une clé qui a
été publiée sur GitHub doit être considérée comme compromise, même si tu la retires ensuite,
car elle reste visible dans l'historique des commits.

## Notes

- CORS est ouvert à `*` dans `chat.php` pour le développement — restreins-le à ton domaine en production.
- Le modèle utilisé est `gemini-2.5-flash` (gratuit, ~1500 requêtes/jour). Pour changer de fournisseur
  (Groq, Mistral, OpenAI...), il suffit de modifier `GEMINI_API_URL`, `GEMINI_API_KEY` et `GEMINI_MODEL`
  dans `config.php` — le reste du code ne bouge pas grâce au format compatible OpenAI.

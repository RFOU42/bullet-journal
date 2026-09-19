# bullet. — journal numérique personnalisable

Implémentation des maquettes validées dans `../project/Bullet Journal.dc.html`
(direction visuelle « carnet papier », option **2a**).

## Démarrer

```bash
cp .env.example .env   # renseigne ton projet Supabase — voir "Backend" plus bas
npm install             # installe aussi le hook pre-commit, voir "Tests" plus bas
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
```

## Tests

```bash
npm test              # une fois (vitest run) — c'est ce que lance le hook
npm run test:watch    # en continu pendant que tu codes
npm run test:coverage
```

72 tests (Vitest + Testing Library), tous sur la logique pure et l'état le
plus fragile de l'app :

- `src/lib/{dates,compute,modules,storage,wizardSteps}.test.ts` — calcul de
  dates, règles de remplissage/résumé par suivi, correspondance
  qualité-du-sommeil ↔ ressenti mobile, stats de sommeil, fusion d'un
  document importé/chargé sur les réglages par défaut (`reconcile`), et
  l'ordre des pages de l'assistant mobile.
- `src/state/JournalContext.test.tsx` — teste directement les deux bugs de
  séquencement trouvés (et corrigés) pendant le développement : un
  chargement asynchrone qui se ré-écrivait lui-même vers Supabase juste
  après avoir chargé, et un changement de compte qui pouvait sauvegarder les
  données de l'ancien utilisateur sous l'id du nouveau.

**S'exécute automatiquement à chaque commit** — `npm install` configure
`core.hooksPath` vers `.githooks/` (à la racine du dépôt, au-dessus de
`app/`) via le script `prepare` ; le hook `pre-commit` lance `typecheck` puis
`test` et bloque le commit si l'un des deux échoue. Pas Husky : sa CLI exige
un `.git` dans le répertoire courant sans jamais remonter, ce qui échoue
systématiquement ici puisque `package.json` vit dans `app/`, un niveau
en dessous de la racine du dépôt — configuration `git config` directe à la
place, plus simple et sans cette limite.

Pour un commit ponctuel qui doit passer sans attendre les tests :
`SKIP_HOOKS=1 git commit …`. Pour désactiver durablement :
`git config --unset core.hooksPath`.

## Ce qui est implémenté

| Écran | Maquette | Fichier |
|---|---|---|
| Connexion | `8a` | `src/screens/AuthLogin.tsx` |
| Créer un compte | `9a` | `src/screens/AuthSignup.tsx` |
| Premier lancement (3 étapes) | `3d` | `src/screens/Onboarding.tsx` |
| Aujourd'hui — le fil du jour | `6a` (= `5b` cliquable) | `src/screens/PageScreen.tsx` + `src/components/DayFil.tsx` |
| Pages de modules | `2a` avec saisie directe de `4a` | `src/screens/PageScreen.tsx` + `src/components/ModuleCard.tsx` |
| Vue hebdo | `3c` | `src/screens/WeekScreen.tsx` |
| Détail d'un module | `3b` | `src/screens/DetailScreen.tsx` |
| Personnaliser | `3a` | `src/screens/CustomizeScreen.tsx` |
| Fil du jour, mobile | `7a` | `src/screens/MobileToday.tsx` + `src/components/MobileTabBar.tsx` |
| Saisie par suivi, mobile | `10a/b/c` | `src/screens/MobileWizard.tsx` |

Le fil du jour suit la mécanique retenue dans la conversation : chaque suivi est
rangé sous son moment (au réveil / dans la journée / le soir), se remplit dans
l'ordre qu'on veut, et un suivi non renseigné reste visible. La navigation
`‹ ›` change de jour, et un rappel en haut de page mène directement au champ
manquant d'une journée passée.

**Sous 720px**, la même mécanique passe en plein écran : taper un suivi ouvre
sa page dédiée (`10`) plutôt que de le déplier en place, enchaînée par
« Enregistrer et continuer » — sommeil → humeur → douleur → habitudes et
gratitude (regroupées sur la page de clôture, comme dans `10c`). La page
humeur n'était pas fournie dans l'export ; elle reprend le langage visuel des
pages données.

## Backend — Supabase

Le compte est **obligatoire** (décision explicite, en rupture avec le PRD
d'origine « tout en local, pas de serveur ») : le carnet vit dans Supabase,
pas dans le navigateur.

- **Projet** : `bullet-journal` (`ikdhmhzrnglikjvpqaku`, région `eu-west-3`),
  créé dans ton organisation Supabase. Gratuit (tier Free, 0 €/mois).
- **Schéma** : une seule table, `public.journals` — une ligne par utilisateur
  (`user_id`, clé étrangère vers `auth.users`), un document `jsonb` qui
  contient l'intégralité de `JournalData` (réglages, entrées, collections).
  C'est le pendant cloud du blob `localStorage` d'avant : le code client n'a
  presque pas changé, un `upsert` remplace un `setItem`.
- **Sécurité** : Row Level Security activée, trois politiques
  (`select`/`insert`/`update` restreintes à `auth.uid() = user_id`), aucune
  politique de suppression — vérifié via `get_advisors` (aucune alerte).
- **Authentification** : e-mail/mot de passe (actif par défaut sur tout
  projet Supabase) + Google OAuth.

### Activer la connexion Google

Je ne peux pas le faire à ta place — la configuration d'un fournisseur OAuth
n'est pas exposée par l'API que j'utilise, seulement par le dashboard :

1. Supabase Dashboard → *Authentication* → *Providers* → **Google** → actif,
   colle ton *Client ID* et ton *Client Secret*.
2. Dans Google Cloud Console, sur ce client OAuth, ajoute cette URL aux
   *Authorized redirect URIs* :
   ```
   https://ikdhmhzrnglikjvpqaku.supabase.co/auth/v1/callback
   ```
3. Ajoute aussi `http://localhost:5173` (dev) et l'URL de prod éventuelle aux
   *Authorized JavaScript origins*.

Tant que ce n'est pas fait, le bouton Google affiche une erreur lisible
(« La connexion Google n'est pas encore activée ») au lieu d'échouer
silencieusement.

### Pourquoi je n'ai pas pu tester en conditions réelles

Cette session tourne derrière un proxy réseau qui **bloque explicitement**
les appels sortants vers `*.supabase.co` (politique d'organisation — confirmé
via `/root/.ccr/README.md` et le point de statut du proxy). Résultat :
navigateur comme `curl`, aucune requête ne sort d'ici vers Supabase. J'ai donc
validé ce que je pouvais depuis cette position :

- Le schéma et les politiques RLS, directement via l'API Supabase (MCP), qui
  emprunte un autre chemin réseau que ce bac à sable.
- Le code : `tsc -b` et `vite build` passent sans erreur.
- Une relecture ciblée du flux auth ↔ stockage, qui a trouvé et corrigé un
  vrai bug avant de te le livrer : le chargement du carnet étant maintenant
  asynchrone (un appel réseau, plus une lecture `localStorage` synchrone),
  le garde-fou qui évitait de ré-écrire les données juste après les avoir
  chargées ne fonctionnait plus correctement — il aurait renvoyé chaque
  connexion dans un aller-retour d'écriture inutile vers Supabase.

Ce que je n'ai **pas** pu faire : ouvrir l'app et cliquer à travers un vrai
inscription/connexion. Il te faudra être le premier test réel — lance
`npm run dev` depuis ton propre réseau (qui n'a pas cette restriction) et
dis-moi ce qui coince.

## Données

Export et import d'un fichier JSON restent disponibles depuis
**Personnaliser** — une sauvegarde manuelle, en plus de la synchronisation
automatique.

## Structure

```
src/
  lib/         modèle de données, catalogue des modules, dates, calculs, stockage (Supabase)
  state/       AuthContext (session) + JournalContext (le carnet, synchronisé au fil de l'eau)
  components/  briques réutilisables (fil du jour, cartes, éditeurs de suivi)
  screens/     un fichier par écran, y compris connexion / inscription
  test/        setup partagé des tests (jsdom, cleanup, matchers)
  styles.css   les tokens du carnet papier et les classes de composants
Root.tsx       la porte d'entrée : session en cours de résolution → connexion → carnet
```

Chaque module de `src/lib/*.ts` a son `*.test.ts` à côté ; les composants React
n'en ont pas systématiquement — seul `JournalContext` porte assez de logique
de séquencement pour mériter un test dédié.

Ajouter un module se fait dans `src/lib/modules.ts` (le catalogue) puis dans
`src/lib/compute.ts` (`isFilled` / `summaryValue` / `dailySeries`) et
`src/components/TrackerEditor.tsx` (le contrôle de saisie).

## Portée

V1 du PRD : personnel et bien-être. Les suivis professionnels et créatifs
(projets, idées, temps passé) restent hors périmètre, comme prévu.

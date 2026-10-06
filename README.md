# Players3P

Lecteur audio web en JavaScript natif, sans framework ni dépendance : synthétiseur intégré, égaliseur 3 bandes, spectre en direct et bibliothèque personnelle.

**Démo :** https://ekar-071.github.io/players3p/

## Fonctionnalités

- Lecture, pause, précédent/suivant, barre de progression, volume, aléatoire, répétition (désactivée, liste, morceau)
- Trois morceaux originaux générés dans le navigateur : lead, basse, batterie et écho, rendus en WAV
- Égaliseur à trois bandes (graves, médiums, aigus) avec `BiquadFilterNode`
- Spectre de fréquences en temps réel avec `AnalyserNode` et `<canvas>`
- Ajout de fichiers audio par sélection ou glisser-déposer (traités localement, rien n'est envoyé)
- Recherche, favoris, préférences conservées dans `localStorage` (volume, égaliseur, modes, favoris)
- Contrôles système et écran de verrouillage via la Media Session API
- Raccourcis clavier : `espace`, `←` `→`, `↑` `↓`, `N`, `P`, `S`, `R`, `M`
- Thème clair/sombre automatique, navigation au clavier, attributs ARIA

## Architecture

| Fichier | Rôle |
|---|---|
| `index.html` | Structure et accessibilité |
| `style.css` | Thème, mise en page responsive |
| `app.js` | Synthèse audio, lecteur, bibliothèque, visualiseur |

Principe clé : chaque morceau synthétique est rendu hors ligne par un `OfflineAudioContext`, encodé en WAV, puis lu par un `<audio>` unique. Les morceaux générés et les fichiers de l'utilisateur passent donc par la même chaîne (égaliseur, analyseur), avec recherche de position et durée natives.

## Lancer

Ouvrir `index.html` dans un navigateur récent (Chrome, Edge, Firefox, Safari), ou activer GitHub Pages sur la branche `main`.

## Pistes d'évolution

Persistance des fichiers importés (IndexedDB), file d'attente réordonnable, PWA hors ligne, tests automatisés.

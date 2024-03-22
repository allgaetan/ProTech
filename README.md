# ProTech

Ce dépôt constitue le livrable de ce ProTech.

## Contenu du livrable :

- index.html : fichier HTML qui contient le code statique de la page d'accueil dans laquelle l’utilisateur choisit la base de données SKOS à visualiser. Son script relativement court à été directement intégré dans une balise HTML script et non un fichier Javascript externe.
- style.css : fichier CSS pour la mise en forme de cette même page
- index_main.html : fichier HTML qui contient le code statique de la page de visualisation des données SKOS.
- script_main.js : fichier Javascript qui contient le code dynamique de cette même page
- style_main.css : fichier CSS pour la mise en forme de cette même page
- Maquette.pdf : document PDF qui contient la maquette originale du site
- README.md : fichier qui contient cette fiche technique 
- .wot-catalogue/ : dossier qui contient une copie du dépôt GitHub du Web of Things Catalogue (https://github.com/vcharpenay/wot-catalogue)
- .icon/ : dossier qui contient les ressources nécessaires pour définir le favicon de la page web
- .vscode/ : dossier qui contient des paramètres spécifique au projet dans un fichier settings.json

## Fonctionnalités disponibles :

- Navigation dans la hiérarchie d’une base de données SKOS avec au sommet les Concept Schemes.
- Recherche d'un concept dans la base de données (recherche insensible à la casse et suggestion de complétion)
- Visualisation des relations entre les concepts dans un graphe réalisé avec Cytoscape.js
- Visualisation de tous les autres détails liés aux concepts (prefLabel, altLabel, ...)
- Choix de la base de données SKOS dans un fichier Turtle (.ttl) visualisée entre une base de donnée exemple (WOT Catalogue) et une base de donnée disponible sur le web.

> :warning:
> Le fait d’entrer une base de données disponible sur le web peut entraîner une erreur Cross-Origin Resource Sharing (CORS).

> :warning:
> L’importation d’une base de données locale n’est pas encore développée.

## Mise en place

Clonez le repository :
```
git clone https://gitlab.emse.fr/gaetan.allaire/protech
```
Lancez un serveur HTTP dans le dossier du projet :
```
http-server
```
Connectez vous au local host sur un navigateur avec l'URL http://localhost:8080/

Le type de fichier utilisé est par défaut fixé aux fichiers Turtle (.ttl). Cela peut être modifié à la ligne 11 de script_main.js : 
```ruby
const dataType = 'text/turtle';
```
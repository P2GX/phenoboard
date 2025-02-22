# hpocurator
HPO Curation with Phenopackets

## Setup

Install rust.

Install angular and components
```bash
npm install
npm install -g @angular/cli@^16
```

## Create angular app
```bash
ng new hpocurator
````

Choose
- CSS
- No Server-Side Rendering

## Build for development
```bash
npm start
```

## Install tauri
```bash
cd hpocurator
npm install @tauri-apps/cli
npx tauri init
````

Where are your web assets (HTML/CSS/JS) located, relative to the "<current dir>/src-tauri/tauri.conf.json" file that will be created? · ../dist
What is the url of your dev server? · http://localhost:4200
? What is your frontend dev command? › npm run dev
What is your frontend build command? · npm run build

## Configure  tauri.conf.json


## Adjusting Angular Configuration


## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).



To Build app installer

npx tauri build


### How was this created?

npm create tauri@latest

- choose typescript, angular, npm

run
```bash 
npm install
```

To start the app
```bash 
npm run tauri dev
```



TO create new component

ng generate component clipboard --standalone
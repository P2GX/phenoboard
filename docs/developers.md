# Developers

HPO Curator is a tauri application with a Rust backend and an Angular front end.

The application makes major use of the following rust crates.

- [ontololius](https://docs.rs/ontolius/latest/ontolius/){:target="\_blank"}
- [rphetools](https://github.com/P2GX/rphetools){:target="\_blank"}
- [rfenominal](https://github.com/P2GX/rfenominal){:target="\_blank"}


This page summarizes some of the angular and Rust/tauri commands that have been useful to create the application.


## Initial setup
These steps were used to initialize the application and do not need to be repeated
```bash 
npm create tauri@latest
```
The installer will ask questions about settings. We chose typescript, angular, npm.

Following this, run the following command.

```bash 
npm install
```

Note that we are using **standalone** components.

## Run the GUI application in development mode
```bash 
npm run tauri dev
```



### Creating new components
The standard command for creating a new component called ``<name>`` is
```bash 
ng generate component <name> --standalone
```
You need to run the Angular CLI command from the root of your Angular project — the directory that contains the angular.json file.
To create a component in a specific path, enter:
```bash 
ng generate component components/hpoloader --standalone --skip-import
```
Note that this may not work after updating to nx. In this case, create a directory where you want to put the new component, cd into the directory, and
enter this
```bash 
npx nx generate @nx/angular:component hpoloader --standalone
```
This will initialize the typical four files for an angular component.

### Added routing
```bash
ng add @angular/router
```

### Angular material
To install
```bash
npm install @angular/material
```

## Set up file system access
At the top level of the project, enter
```bash
npm install @tauri-apps/api
```

in the src-tauri folder, enter
```bash
cargo add tauri-plugin-fs
```

In the angular component, add 
```javascript
import { open } from '@tauri-apps/api/dialog';
import { readTextFile } from '@tauri-apps/api/fs';

```


## Port issues
If one gets the error message: ``Port 1420 is already in use``, then use the following command to obtain the process ID:
```bash
lsof -i :1420
COMMAND   PID  USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
node    32315 <user>   49u  IPv4 0xd9cc1bb0104a525f      0t0  TCP localhost:timbuktu-srv4 (LISTEN)
```
then end the process with
```bash
kill -9 <PID>
```

## Problems with tauri.conf.json

Try to get the latest version
```bash
cargo install tauri-cli --locked
npm install @tauri-apps/cli@latest
``` 
generate a new file
```bash
cargo tauri init
``` 


## file system (tauri v2)

npm run tauri add fs

npm run tauri add dialog

.
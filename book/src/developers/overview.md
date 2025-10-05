# Developers

GA4GH Phenoboard is a tauri application with a Rust backend and an Angular front end.
It is designed to curate cohorts of individuals diagnosed with genetic disease using
[Human Phenotype Ontology](https://hpo.jax.org/){:target="\_blank"} and [Global Alliance for Genomics and Health](https://www.ga4gh.org/){:target="\_blank"} [Phenopacket Schema](https://phenopacket-schema.readthedocs.io/en/latest/){:target="\_blank"}.

The application makes major use of the following rust crates.

- [ontololius](https://docs.rs/ontolius/latest/ontolius/){:target="\_blank"}
- [ga4ghphetools](https://github.com/P2GX/ga4ghphetools){:target="\_blank"}
- [fenominal](https://github.com/P2GX/fenominal){:target="\_blank"}


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
To generate a new component, navigate to the src/app folder, make a directory with the name of the component, cd into the new directory, 
and enter the following command.
```bash 
npx nx generate @nx/angular:component <name> --standalone
```
This will initialize the typical four files for an angular component.


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
This may also cause the typescript part of the app to not be updated when we run ``npm run tauri dev``.


## Run in browser
Can be useful with the DevTools panel
```bash
npm run start
```





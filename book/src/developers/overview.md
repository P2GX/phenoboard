# Developers

GA4GH Phenoboard is a tauri application with a Rust backend and an Angular front end.
It is designed to curate cohorts of individuals diagnosed with genetic disease using
[Human Phenotype Ontology](https://hpo.jax.org/){:target="\_blank"} and [Global Alliance for Genomics and Health](https://www.ga4gh.org/){:target="\_blank"} [Phenopacket Schema](https://phenopacket-schema.readthedocs.io/en/latest/){:target="\_blank"}.

The application makes major use of the following rust crates.

- [ontololius](https://docs.rs/ontolius/latest/ontolius/){:target="\_blank"}
- [ga4ghphetools](https://github.com/P2GX/ga4ghphetools){:target="\_blank"}
- [fenominal](https://github.com/P2GX/fenominal){:target="\_blank"}


This page summarizes some of the angular and Rust/tauri commands that have been useful to create the application.


## Running in development mode
Most users should use the provided installation programs. Developers can start the program in development mode as follows
```bash 
npm run tauri dev
```


## Creating installation program
To generate an installation program (for the current OS), run the following
```bash 
npm run tauri build
```
This will create an installer in the following location
```bash
src-tauri/target/release/bundle/dmg/phenoboard_0.3.1_aarch64.dmg
```

This can be attached to a release. Double-clicking the file will open a typical MacIntosh installation window.



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


## Documentation
We create documentation using the mdbook package. A local server can be started as follows.
```bash
cd book
mdbook serve --open
```




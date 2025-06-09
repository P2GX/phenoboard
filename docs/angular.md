# Angular tips

This page includes how-tos for some common operations.

## Create a component

We are using standalone architecture, and thus to make a new component, 
```bash
npx nx g @nx/angular:component navbar
````
the ``--project``argument is not working. Thus, manually create the directory (e.g., src/app/navbar), and move the created files there.
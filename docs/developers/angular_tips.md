# Angular tips

Some useful tips for working with angular.



## Reset cache
Sometimes Stale build artifacts or module cache may lead to errors. We can clean the cache as follows.

```bash
# Clean Angular/Nx cache
npx nx reset
# Clean node_modules and dist
rm -rf node_modules dist .angular .output .vite
# Clear package manager cache (optional but helpful)
npm cache clean --force
# Reinstall
npm install
```

## Incompatibilitie

Avoid BrowserAnimationsModule in standalone components.  Importing it seems to lead to the error
```bash
NG05100: Providers from the BrowserModule have already been loaded.
```
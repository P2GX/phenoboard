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

## Incompatibilities

Avoid BrowserAnimationsModule in standalone components.  Importing it seems to lead to the error
```bash
NG05100: Providers from the BrowserModule have already been loaded.
```

## Linting

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-import eslint-plugin-jsdoc eslint-plugin-prefer-arrow
npm install --save-dev @angular-eslint/template-parser @angular-eslint/eslint-plugin-template
npm install --save-dev eslint @eslint/js typescript-eslint angular-eslint@20.0.0 --legacy-peer-deps
```

Then add an .eslintrc.json file

Linting can now be performed with the followinh commands
```bash
npx eslint src/app/my-component/*.ts
npx eslint src/app/my-component/*.html
```



# Styles

This file records the design decisions taken for the SCSS.


## install and initialize tailwind
Install tailwind and sass to allow angular to use the library.

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
npm install -D sass
```

This creates a minimal tailwind.config.js in your project root. Adjust this file to include paths to the modules
that will use tailwind
```bash
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",  
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

In project.json, add the 
```bash
src/scss
````
to the styles.
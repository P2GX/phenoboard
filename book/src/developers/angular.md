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

## Polishing CSS

One challenge in improving the look and feel of an angular app is that one needs to run the app, add data, and then click through the to component to be worked on. Instead of this, we can use mock data (does not need to be kept around in git!), and then have the app start with only the specific componen

Here is a component that provides mock data
```javascript
import { MinedCell } from "../models/hpo_mapping_result";


export const MOCK_CELL: MinedCell = {
  cellText: "Patient presents with severe macrocephaly, intellectual disability, and occasional seizures.",
  rowIndexList: [1],
  mappedTermList: [
    { 
      hpoId: 'HP:0000256', 
      hpoLabel: 'Macrocephaly', 
      status: 'observed' as any, 
      onset: 'congenital' 
    },
    { 
      hpoId: 'HP:0001249', 
      hpoLabel: 'Intellectual disability', 
      status: 'observed' as any, 
      onset: 'early childhood' 
    }
  ]
};

export const MOCK_SHELF = [
  { id: 'HP:0001250', label: 'Seizures' },
  { id: 'HP:0000707', label: 'Abnormality of the nervous system' },
  { id: 'HP:0001263', label: 'Global developmental delay' },
  { id: 'HP:0002123', label: 'Generalized myoclonic seizures' },
  { id: 'HP:0004322', label: 'Short stature' },
  { id: 'HP:0001252', label: 'Hypotonia' },
  // A very long term to test CSS wrapping
  { id: 'HP:0001297', label: 'Abnormality of lateral ventricle morphology' }
];
```

We temporarily alter the component
```javascript
export class MinedCellEditorComponent {
  //cell = input.required<MinedCell>();
  //toExclude = input.required<{id: string, label: string}[]>();
  cell = input<MinedCell>(MOCK_CELL);
  toExclude = input<{id: string, label: string}[]>(MOCK_SHELF);
```


And temporarily alter the AppComponent:

```javascript
@Component({
  selector: 'app-root',
  standalone: true,
  //templateUrl: './app.component.html',
  template: `
    <div style="padding: 50px;">
      <app-mined-cell-editor />
    </div>
  `,
  styleUrls: ['./app.component.css', '../styles.scss'],
  imports: [
    NavbarComponent,
    RouterOutlet,
    FooterComponent,
    MinedCellEditorComponent
]
})
export class AppComponent {}
```

Following this, we run from the base source directory:
```bash
npm start
```
Then we open the system browser to view the page (http://localhost:1420/home). If we change the CSS/SCSS file of the component, we
should immediately see the effect. After we are finished, we can delete the mock data and revert the changes to the input of the component and to the main app.
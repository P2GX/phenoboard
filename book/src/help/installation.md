# Installation

Phenoboard will be offered as a prepackage Mac or Windows installer once the initial development phase is finished. For now, it can be installed and run as follows.

## Prerequisites

### Node.js (at least version 18) and npm (at least version 9). 

You can check if you have them installed via

```bash
node -v
npm -v
``` 

If necessary, go to [https://nodejs.org](nodejs) to install these programs.

### Rust and Cargo

See [https://rustup.rs](rustp.rs) if needed.

### Git 

If you do not have git installed, replace the cloning step with a download of the archive.

## Platform-specific code
Please report any dependencies not listed above.

# Running the app

1. Clone from GitHub
```bash 
git clone https://github.com/P2GX/phenoboard.git
cd phenoboard
```

2. Install npm dependencies
From within the phenoboard directory, enter
```bash
npm install
```

3. Running the app
```bash
npm run tauri dev
```

This will run the application.
# Installation

Phenoboard will be offered as a prepackage Mac or Windows installer once the initial development phase is finished. For now, it can be installed and run as follows.



## Running on macOS

Because this application is open-source and distributed for free, it is not signed or notarized by Apple.
That means macOS will warn you the first time you try to open it. Here’s how to open it:

1. Download the .dmg file from the Releases page.
2. Open the DMG and drag the app into your Applications folder.
3. When you try to open it, macOS will show a message:

4. “App can’t be opened because it is from an unidentified developer.”
5. Open System Settings → Privacy & Security.
6. Scroll down — you’ll see an “Open Anyway” button for this app.
7. Click Open Anyway, then confirm when prompted.
8. macOS will remember your choice — you won’t have to do this again.

## Running on Windows

1. Download the .msi installer from the Releases page.
2. Double-click to start the installer.
3. If Windows shows a blue SmartScreen dialog saying:

    “Windows protected your PC”

4. click “More info” → “Run anyway.”

Note:
Windows shows this for unsigned apps from new developers.
Once you install and run it, the warning will not reappear.

## Installing on linux

1. Download the .deb package  (Debian/Ubuntu).


```bash
sudo apt install ./yourapp.deb
```

For other distributions, you can build from source (see below).

## Build from source
This will work on any OS.

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
npm run tauri build
```
The built installers will appear under:
```bash
src-tauri/target/release/bundle/
``` 


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
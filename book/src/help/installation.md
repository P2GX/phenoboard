# Installation

Phenoboard is available as prepackaged installers for macOS, Windows, and Linux. Download the latest version from the [Releases](https://github.com/p2gx/phenoboard/releases) page.

## Installing on macOS

> **File to download:** `phenoboard_0.5.10_aarch64.dmg`  
> This is the macOS installer for Apple Silicon (M1/M2/M3/M4 Macs)

Because this application is open-source and distributed for free, it is not signed or notarized by Apple. macOS will warn you the first time you try to open it. Here's how to install:

1. Download the `.dmg` file from the [Releases](https://github.com/p2gx/phenoboard/releases) page
2. Open the DMG and drag the app into your Applications folder
3. When you try to open it, macOS may show an error message:  
   *"App can't be opened because it is from an unidentified developer"*
   or
   *“phenoboard” is damaged and can’t be opened. You should move it to the Trash*

This error happens because macOS applies strict security checks for programs downloaded from the Web that are not signed with a paid Apple Developers account. 
There are at least two ways of dealing with this. (Of course, do not move the app to the trash!)


**1) xattr**
- run in Terminal: 
```bash
xattr -cr /Applications/phenoboard.app
```

(to open the Terminal, search for Terminal in Spotlight and then paste the above text into it and press Enter)

**2) System Settings**
Depending on our OS version, you may also be able to do the following:
-  go to System Settings → Privacy & Security → click "Open Anyway"


## Installing on Windows

> **File to download:** `phenoboard_0.5.10_x64_en-US.msi`  
> Windows installer (MSI format)

1. Download the `.msi` installer from the [Releases](https://github.com/p2gx/phenoboard/releases) page
2. Double-click to start the installer
3. If Windows shows a blue SmartScreen dialog saying:  
   *"Windows protected your PC"*
4. Click **"More info"** → **"Run anyway"**

> **Note:** Windows shows this for unsigned apps from new developers. Once you install and run it, the warning will not reappear.

## Installing on Linux

### Debian/Ubuntu (recommended)

> **File to download:** `phenoboard_0.5.10_amd64.deb`  
> Debian/Ubuntu package

1. Download the `.deb` package from the [Releases](https://github.com/p2gx/phenoboard/releases) page
2. Install using:
```bash
sudo apt install ./phenoboard_0.5.10_amd64.deb
```

Or using dpkg:
```bash
sudo dpkg -i phenoboard_0.5.10_amd64.deb
```

### Other Linux Distributions

> **File to download:** `phenoboard_0.5.10_amd64.AppImage`  
> Universal Linux application (no installation needed)

1. Download the `.AppImage` file from the [Releases](https://github.com/p2gx/phenoboard/releases) page
2. Make it executable:
```bash
chmod +x phenoboard_0.5.10_amd64.AppImage
```

3. Run it:
```bash
./phenoboard_0.5.10_amd64.AppImage
```

---

## Building from Source

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
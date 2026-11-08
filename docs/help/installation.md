# Installation

Phenoboard is available as prepackaged installers for macOS, Windows, and Linux. Download the latest version from the [Releases](https://github.com/P2GX/phenoboard/releases) page.

## Installing on macOS

> **File to download:** `phenoboard_<version>_aarch64.dmg`  
> This is the macOS installer for Apple Silicon (M1/M2/M3/M4 Macs)

MacOS will warn you the first time you try to open it. Here's how to install:

1. Download the `.dmg` file from the [Releases](https://github.com/P2GX/phenoboard/releases) page
2. Open the DMG and drag the app into your Applications folder
3. When you try to open it, macOS will show the message:  
   *"'phenoboard' is an app downloaded from the Internet. Are you sure you want to open it?"*
 
If you confirm, the app will be installed into your `Àpplications` folder and started. From now on you can open phenoboard like any other application (e.g., using the Spotlight searchbar).


## Installing on Windows

**File to download (recommended):** `phenoboard_<version>_x64-setup.exe`
> Installs for the current user, no administrator rights needed.


## Installing on Linux

### Debian/Ubuntu (recommended)

> **File to download:** `phenoboard_<version>_amd64.deb`  
> Debian/Ubuntu package

1. Download the `.deb` package from the [Releases](https://github.com/P2GX/phenoboard/releases) page
2. Install using:
```bash
sudo apt install ./phenoboard_<version>_amd64.deb
```

Or using dpkg:
```bash
sudo dpkg -i phenoboard_<version>_amd64.deb
```
### Fedora, RHEL, openSUSE

> **File to download:** `phenoboard-<version>-1.x86_64.rpm`

```bash
sudo dnf install ./phenoboard-<version>-1.x86_64.rpm
```

### Arch-based distributions (EndeavourOS, Manjaro, etc.)

There is no native package. Either convert the `.deb` with `debtap`, or
[build from source](#building-from-source) and run the binary directly.


## Building from Source

This will work on any OS.

```bash
git clone https://github.com/P2GX/phenoboard.git
cd phenoboard
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

If necessary, go to [Node.js](https://nodejs.org) to install these programs.

### Rust and Cargo

See [rustup](https://rustup.rs) if needed.

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

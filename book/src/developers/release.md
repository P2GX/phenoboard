# Release

This page explains the release process whereby installers are added to a Release on the project GitHub page.

Following an important update, increment the Application version (we are using the same version number in Cargo.toml and package.json and tauri.conf.json).
The version number will be something like 0.5.12. 
The ``npm version patch`` script will increment patch version in Cargo.toml and ``package.json`` and create the tag. You will see the new
tag version on the shell. Use this (adjust ``v.0.5.???``) to push to origin. This will trigger a new release. 

```bash
git add .
git commit -m "<whatever>"
npm version patch  
git push origin <tag>
```

(e.g., `git push origin v0.5.129`)

If all goes well, this will add a new release with Mac, Windows, and Debian/Ubuntu installers.

### Git tags
Here are some tips for dealing with the tags.

1. Update the local tags
```bash
git fetch --prune --prune-tags origin
``` 
2. Show the available tags
```bash
git tag
```

3. Show latest tag
```bash
git describe --tags --abbrev=0
``` 

Note that we have run the following command
```bash
npm config set tag-version-prefix v
```



### Manual release
To create an installer locally (for the current OS), enter the following command
```bash
npm run tauri build
```

This will create an installer under ``src-tauri/target/release/bundle/``.

### Signing the apple installer
We need to sign the Apple installer (DMG) to avoid users being confronted with difficult to understand error messages when they try to install the app. Here is the general procedure.

We first create the dmg file
```bash
export APPLE_SIGNING_IDENTITY="<secret>"
export APPLE_API_KEY_PATH="<secret>.p8"
export APPLE_API_KEY_ID="<secret>"
export APPLE_API_ISSUER="<secret>"
# Run the build (Tauri will sign every inner binary and package it cleanly)
npm run tauri build
```

Assuming the version of the app is v0.5.148, this will create an installer and a dialog will pop up with which you can install the app locally (you can close this with no action). It will also create a file at

```bash

phenoboard/src-tauri/target/release/bundle/dmg/phenoboard_0.5.148_aarch64.dmg
```
Following this, the following commands will interact with the Apple server to sign the code and prepare it for release


```bash
#!/bin/bash
DMG_PATH="..../phenoboard/src-tauri/target/release/bundle/dmg/phenoboard_0.1.1_aarch64.dmg"
KEY_PATH="/<secret>.p8"

echo "Signing DMG..."
codesign --force --options runtime --timestamp --verbose --sign "Developer ID Application: Peter Robinson (GVFTJU76J6)" "$DMG_PATH"

echo "Submitting to Apple..."
xcrun notarytool submit "$DMG_PATH" --key "$KEY_PATH" --key-id "<secret>" --issuer "<secret>" --wait

echo "Stapling ticket..."
xcrun stapler staple "$DMG_PATH"

echo "Done! Ready for upload to GitHub release."
```

Finally, replace the DMG file from the new phenoboard release. The other installation files should work out of the box (Windows systems show a warning, but are not nearly as difficult to manage as with Apple).
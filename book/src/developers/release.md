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
git commit -m "version bump"
git push origin v0.5.???
```

If all goes well, this will add a new release with Mac, Windows, and Debian/Ubuntu installers.


### Manual release
To create an installer locally (for the current OS), enter the following command
```bash
npm run tauri build
```

This will create an installer under ``src-tauri/target/release/bundle/``.
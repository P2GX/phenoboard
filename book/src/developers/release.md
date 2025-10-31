# Release

This page explains the release process whereby installers are added to a Release on the project GitHub page.

Following an important update, increment the Application version (we are using the same version number in Cargo.toml and package.json).
The version number will be something like 0.5.12. Adjust the tag accordingly and enter the following commands.

```bash
git add .
git commit -m "<whatever>"
git push
git tag v0.5.12
git push origin v0.5.12
```

If all goes well, this will add a new release with Mac, Windows, and Debian/Ubuntu installers.


### Manual release
To create an installer locally (for the current OS), enter the following command
```bash
npm run tauri build
```

This will create an installer under ``src-tauri/target/release/bundle/``.
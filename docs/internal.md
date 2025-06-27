# Internal

The following commands are used by the development team.


## Documentation

These pages are generated with mkdocs.

To set things up, perform the following steps (substitute name of venv if needed).

```
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install mkdocs
pip install mkdocs-material
pip install mkdocs-material[imaging]
pip install pillow cairosvg
pip install mkdocs-material-extensions
pip install mkdocstrings[python]
```

To start a local server, enter:
```
mkdocs serve
```
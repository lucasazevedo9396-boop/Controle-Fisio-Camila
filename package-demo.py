from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
public = root / 'public'
target = root / 'artifacts' / 'camila-fisio-demo.zip'
target.parent.mkdir(exist_ok=True)
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(public.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(public))
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert {'index.html', 'app.js', 'finance.js', 'style.css', 'manifest.webmanifest', 'icon-180.png', '_headers'}.issubset(archive.namelist())
print(target)

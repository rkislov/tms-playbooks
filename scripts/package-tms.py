#!/usr/bin/env python3
"""Package an already built community plugin, excluding enterprise source/code."""
import hashlib
import json
import pathlib
import subprocess
import sys
import tarfile
import tempfile
import shutil

root = pathlib.Path(__file__).resolve().parents[1]
target = sys.argv[1] if len(sys.argv) == 2 else 'linux-arm64'
if target not in {'linux-amd64', 'linux-arm64', 'darwin-arm64', 'darwin-amd64'}:
    raise SystemExit('Unsupported target')
manifest = json.loads((root / 'plugin.json').read_text())
executable = f'server/dist/plugin-{target}'
if not (root / executable).is_file() or not (root / 'webapp/dist/main.js').is_file():
    raise SystemExit('Build server and webapp first')
manifest['server']['executables'] = {target: executable}
output = root / 'dist'
output.mkdir(exist_ok=True)
archive = output / f'tayga-playbooks-{manifest["version"]}-{target}.tar.gz'
with tempfile.TemporaryDirectory(prefix='tms-playbooks-package-') as tmp:
    plugin = pathlib.Path(tmp) / 'playbooks'
    plugin.mkdir()
    (plugin / 'plugin.json').write_text(json.dumps(manifest, indent=2) + '\n')
    for name in ('assets', 'LICENSE.txt', 'NOTICE.txt', 'README.md'):
        source = root / name
        if source.is_dir():
            shutil.copytree(source, plugin / name)
        else:
            shutil.copy2(source, plugin / name)
    for name in (executable, 'webapp/dist/main.js', 'webapp/dist/tms-host.js'):
        destination = plugin / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / name, destination)
    # Webpack's extracted notices are referenced by the minified bundles.
    # Include full dependency license texts too (including host runtime packages
    # that upstream classified as development dependencies).
    for notice in (root / 'webapp/dist').glob('*.js.LICENSE.txt'):
        shutil.copy2(notice, plugin / 'webapp/dist' / notice.name)
    listed = subprocess.run(['npm', 'ls', '--all', '--parseable'], cwd=root / 'webapp', text=True, capture_output=True)
    packages = [pathlib.Path(line) for line in listed.stdout.splitlines() if line.strip()]
    if len(packages) < 2:
        raise SystemExit('Installed dependency license inventory unavailable')
    third_party = plugin / 'THIRD-PARTY-NOTICES'
    third_party.mkdir()
    inventory = []
    notices = bytearray()
    for package in packages:
        if package == root / 'webapp' or not (package / 'package.json').is_file():
            continue
        meta = json.loads((package / 'package.json').read_text())
        name = meta.get('name', package.name)
        version = meta.get('version', 'unknown')
        notices.extend(('\n' + '=' * 72 + '\n' + name + '@' + version + '\n').encode())
        copied = []
        for item in package.iterdir():
            if item.is_file() and item.name.lower().startswith(('license', 'licence', 'notice', 'copying', 'copyright')):
                notices.extend(('\n--- ' + item.name + ' ---\n').encode())
                notices.extend(item.read_bytes())
                notices.extend(b'\n')
                copied.append(item.name)
        if not copied:
            for item in package.iterdir():
                if item.is_file() and item.name.lower().startswith('readme'):
                    notices.extend(('\n--- ' + item.name + ' ---\n').encode())
                    notices.extend(item.read_bytes())
                    notices.extend(b'\n')
                    copied.append(item.name)
        inventory.append({'name': name, 'version': version, 'license': meta.get('license'), 'files': copied})
    (third_party / 'licenses.txt').write_bytes(notices)
    (third_party / 'inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
    provenance = {
        'upstream_tag': 'v2.9.7',
        'upstream_commit': '47e06734cd71cfe0b01f57749aa116ac04006022',
        'fork_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
        'working_tree_modified': bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root)),
        'target': target,
        'enterprise_directory_included': False,
    }
    (plugin / 'TMS-PROVENANCE.json').write_text(json.dumps(provenance, indent=2) + '\n')
    entries = list(plugin.rglob('*'))
    if len(entries) + 1 > 2500 or sum(p.stat().st_size for p in entries if p.is_file()) > 256 << 20:
        raise SystemExit('Bundle exceeds TMS installer safety limits')
    with tarfile.open(archive, 'w:gz') as bundle:
        bundle.add(plugin, arcname='playbooks')
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix(archive.suffix + '.sha256').write_text(f'{digest}  {archive.name}\n')
print(archive)
print(digest)

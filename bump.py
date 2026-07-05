#!/usr/bin/env python3
"""Bump version in extensions/paper/manifest.json and frontend/package.json.
Usage: python bump.py [major|minor|patch]"""
import json, sys, pathlib

root = pathlib.Path(__file__).parent
manifest_path = root / 'extensions' / 'paper' / 'manifest.json'
pkg_path = root / 'frontend' / 'package.json'

arg = sys.argv[1] if len(sys.argv) > 1 else 'patch'

def bump(version: str) -> str:
    major, minor, patch = map(int, version.split('.'))
    if arg == 'major':
        return f'{major + 1}.0.0'
    elif arg == 'minor':
        return f'{major}.{minor + 1}.0'
    else:
        return f'{major}.{minor}.{patch + 1}'

manifest = json.loads(manifest_path.read_text())
new_version = bump(manifest['version'])
manifest['version'] = new_version
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

pkg = json.loads(pkg_path.read_text())
pkg['version'] = new_version
pkg_path.write_text(json.dumps(pkg, indent=2) + '\n')

print(f'bumped → {new_version}')

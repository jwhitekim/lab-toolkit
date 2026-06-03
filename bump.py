#!/usr/bin/env python3
"""Bump extension/manifest.json version. Usage: python bump.py [major|minor|patch]"""
import json, sys, pathlib

manifest = pathlib.Path(__file__).parent / 'extension' / 'manifest.json'
data = json.loads(manifest.read_text())
major, minor, patch = map(int, data['version'].split('.'))

arg = sys.argv[1] if len(sys.argv) > 1 else 'patch'
if arg == 'major':
    major, minor, patch = major + 1, 0, 0
elif arg == 'minor':
    major, minor, patch = major, minor + 1, 0
else:
    patch += 1

data['version'] = f'{major}.{minor}.{patch}'
manifest.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
print(f'bumped → {data["version"]}')

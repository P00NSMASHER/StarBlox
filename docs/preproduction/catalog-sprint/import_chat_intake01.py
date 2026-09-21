"""One-shot, hash-verified candidate import. Never edits the game or final manifest."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import struct
import urllib.request
import zipfile
import zlib

BATCH = 'chat-20260921-intake01'
PREFIX = f'public/assets/catalog-candidates/{BATCH}'
DOC = 'docs/preproduction/catalog-sprint'
META = f'{DOC}/chat-intake01.json'
IDS = ('companions-2','companions-3','companions-4','companions-5','companions-6','companions-7','companions-8','companions-10','companions-11','companions-12')
ARCHIVE_SHA = 'e0458a2e5d04662fb332ef9a8c194e890b19440aab2d98dccb641d8e5388fc69'
ARCHIVE_URL = 'https://at.adobe.com/eouJ6RN1WLwGaXYQ'
MOON = {
    'source': ('https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:97576533-bf30-4894-b1c8-a383cf5a812e', (410, 300)),
    'card': ('https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:61989cba-268e-49a6-9d9e-aed137c32cf2', (256, 256)),
}

def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def download(url: str, limit: int) -> bytes:
    request = urllib.request.Request(url, headers={'User-Agent': 'StarBlox-Candidate-Import/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
        if not response.geturl().startswith('https://'):
            raise ValueError('Refusing non-HTTPS redirect')
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Download exceeds allowed size')
    return data

def png_dimensions(data: bytes) -> tuple[int, int]:
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Not a PNG')
    pos, dimensions, found_end = 8, None, False
    while pos < len(data):
        if pos + 12 > len(data):
            raise ValueError('Truncated PNG chunk')
        length = struct.unpack('>I', data[pos:pos+4])[0]
        end = pos + 12 + length
        if end > len(data):
            raise ValueError('Truncated PNG content')
        kind = data[pos+4:pos+8]
        payload = data[pos+8:pos+8+length]
        crc = struct.unpack('>I', data[pos+8+length:end])[0]
        if zlib.crc32(kind + payload) & 0xffffffff != crc:
            raise ValueError('PNG CRC mismatch')
        if kind == b'IHDR':
            if dimensions is not None or length != 13:
                raise ValueError('Invalid PNG header')
            dimensions = struct.unpack('>II', payload[:8])
        pos = end
        if kind == b'IEND':
            found_end = True
            break
    if not dimensions or not found_end or pos != len(data):
        raise ValueError('Invalid PNG structure')
    return dimensions

def stage(root: Path, files: dict[str, bytes]) -> None:
    """Validate all targets before writing; never replace a differing existing file."""
    resolved = root.resolve()
    for name, data in files.items():
        relative = PurePosixPath(name)
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe path')
        target = root.joinpath(*relative.parts)
        if not target.resolve().is_relative_to(resolved):
            raise ValueError('Path escapes workspace')
        if target.exists() and target.read_bytes() != data:
            raise ValueError(f'Refusing to overwrite {name}')
    for name, data in files.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if not target.exists():
            with target.open('xb') as handle:
                handle.write(data)

def import_archive(root: Path, archive: Path) -> dict:
    raw = archive.read_bytes()
    if digest(raw) != ARCHIVE_SHA:
        raise ValueError('Archive hash mismatch')
    allowed_images = {f'{PREFIX}/{item}-{variant}.{ext}' for item in IDS for variant, ext in [('source','png'),('card','webp'),('detail','webp')]}
    staged = {}
    with zipfile.ZipFile(archive) as bundle:
        if set(bundle.namelist()) != allowed_images | {META} or len(bundle.infolist()) != 31:
            raise ValueError('Unexpected archive entries')
        if sum(entry.file_size for entry in bundle.infolist()) > 30_000_000:
            raise ValueError('Expanded archive too large')
        metadata = json.loads(bundle.read(META))
        records = {entry['path']: entry for entry in metadata['files']}
        if set(records) != allowed_images or len(metadata['files']) != 30:
            raise ValueError('Unexpected image inventory')
        if {item['itemId'] for item in metadata['items']} != set(IDS):
            raise ValueError('Unexpected item IDs')
        for entry in bundle.infolist():
            if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Symlinks forbidden')
            data = bundle.read(entry.filename)
            if entry.filename in allowed_images:
                record = records[entry.filename]
                if len(data) != record['bytes'] or digest(data) != record['sha256']:
                    raise ValueError(f'Asset integrity mismatch: {entry.filename}')
                if record['format'] == 'PNG' and list(png_dimensions(data)) != record['dimensions']:
                    raise ValueError('PNG dimensions mismatch')
                if record['format'] == 'WEBP' and not (data[:4] == b'RIFF' and data[8:12] == b'WEBP' and struct.unpack('<I', data[4:8])[0] + 8 == len(data)):
                    raise ValueError('WEBP container mismatch')
            staged[entry.filename] = data
    if len({digest(staged[name]) for name in allowed_images}) != 30:
        raise ValueError('Exact duplicate image bytes')
    stage(root, staged)
    return {'companionItemsImported': 10, 'companionImageFilesImported': 30, 'archiveSha256': ARCHIVE_SHA, 'checks': 'Outer archive SHA, per-file SHA/size, safe paths, PNG CRC/dimensions, WebP RIFF length; local Pillow full decode previously passed.'}

def import_moon(root: Path) -> dict:
    staged, records = {}, []
    for variant, (url, expected) in MOON.items():
        data = download(url, 5_000_000)
        dimensions = png_dimensions(data)
        if dimensions != expected:
            raise ValueError('Moon Chair crop dimensions changed')
        path = f'{PREFIX}/seating-11-{variant}.png'
        staged[path] = data
        records.append({'path': path, 'variant': variant, 'bytes': len(data), 'sha256': digest(data), 'dimensions': list(dimensions), 'format': 'PNG'})
    stage(root, staged)
    return {'itemId': 'seating-11', 'name': 'Moon Chair', 'tier': 4, 'theme': 'Galaxy Glow', 'collectionId': 'seating', 'status': 'READY_FOR_INDEPENDENT_REVIEW', 'files': records, 'provenance': 'Individual crop from an image-generated sheet after an Adobe edit; the sheet as a whole failed the requested batch brief. Crop and 256px padding inspected in chat. No generated labels/counters are used. Not canonical or independently accepted.'}

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--include-moon', action='store_true')
    args = parser.parse_args()
    if os.environ.get('GITHUB_ACTIONS') == 'true' and os.environ.get('GITHUB_REF') != 'refs/heads/screenshot-match-preproduction':
        raise SystemExit('Wrong branch; no writes allowed')
    archive = args.archive
    if archive is None:
        archive = Path(os.environ.get('RUNNER_TEMP', '/tmp')) / 'starblox-intake01.zip'
        archive.write_bytes(download(ARCHIVE_URL, 25_000_000))
    report = {'batchId': BATCH, 'status': 'CANDIDATES_ONLY', 'canonicalFinalCountDelta': 0, 'canonicalManifestChanged': False, 'runtimeChanged': False, 'replitUpdated': False, 'sourceHead': os.environ.get('SOURCE_HEAD'), **import_archive(args.root, archive)}
    if args.include_moon:
        try:
            report['moonCandidate'] = import_moon(args.root)
        except Exception as error:
            report['moonImportStatus'] = 'BLOCKED'
            report['moonImportError'] = type(error).__name__
    report['independentVisualReview'] = 'PENDING'
    report['storeBrowserAndMobileScrolling'] = 'NOT_TESTED_IN_THIS_IMPORT'
    path = args.root / DOC / 'chat-intake01-import.json'
    path.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()

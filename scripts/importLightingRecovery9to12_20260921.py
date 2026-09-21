"""One-batch byte transport for Workstream 04 Lighting 9-12. Never edits images, catalog mappings, gameplay, or player state."""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REQUEST = ROOT / 'docs/preproduction/catalog-sprint/chat-lighting-recovery-9-12-20260921.json'
REPORT = ROOT / 'docs/preproduction/catalog-sprint/chat-lighting-recovery-9-12-result.json'
ORIGINALS = ROOT / 'docs/preproduction/catalog-sprint/recovered-originals/lighting-9-12-20260921'
EXPECTED_IDS = ['lighting-9', 'lighting-10', 'lighting-11', 'lighting-12']
BRANCH = 'screenshot-match-preproduction'
MAX_BYTES = 12 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def blob(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def current_head() -> str:
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()


def guard() -> None:
    actual = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    if actual != BRANCH or os.environ.get('GITHUB_REF', 'refs/heads/' + BRANCH) != 'refs/heads/' + BRANCH:
        raise RuntimeError('Only the authorized preproduction branch may run this intake')


def fetch_bytes(url: str) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'at.adobe.com':
        raise ValueError('Only connector-returned Adobe HTTPS links are allowed')
    request = urllib.request.Request(url, headers={'User-Agent': 'StarBlox-Authorized-Asset-Intake/1.0'})
    with urllib.request.urlopen(request, timeout=45) as response:
        if urllib.parse.urlparse(response.url).scheme != 'https':
            raise ValueError('Non-HTTPS redirect rejected')
        data = response.read(MAX_BYTES + 1)
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Empty or oversized asset response')
    return data


def image_info(data: bytes) -> dict:
    with Image.open(io.BytesIO(data)) as image:
        fmt = image.format
        width, height = image.size
        image.verify()
    if fmt not in {'PNG', 'JPEG', 'WEBP'} or width != height or not 512 <= width <= 4096:
        raise ValueError(f'Unsupported or non-square catalog image: {fmt} {width}x{height}')
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        extrema = image.getextrema()
        bands = extrema if isinstance(extrema[0], tuple) else [extrema]
        if all(lo == hi for lo, hi in bands):
            raise ValueError('Blank constant-color image rejected')
    return {'format': fmt, 'dimensions': [width, height], 'bytes': len(data), 'sha256': sha(data), 'gitBlobSha': blob(data)}


def store_metadata() -> dict:
    code = "import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    items = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=ROOT, text=True))
    if len(items) != 192 or len({item['id'] for item in items}) != 192:
        raise ValueError('Authoritative Store no longer has exactly 192 unique IDs')
    return {item['id']: item for item in items}


def immutable_write(path: Path, data: bytes) -> None:
    path = path.resolve()
    if ROOT not in path.parents or path.is_symlink():
        raise ValueError('Unsafe output path')
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError('Conflicting existing output; refusing overwrite: ' + str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + '.intake-tmp')
    temporary.write_bytes(data)
    temporary.replace(path)
    if path.read_bytes() != data:
        raise ValueError('Byte readback mismatch')


def verify_stored(report: dict, metadata: dict) -> None:
    if [item['id'] for item in report['items']] != EXPECTED_IDS:
        raise ValueError('Stored report ID mismatch')
    hashes = set()
    for item in report['items']:
        for key in ['name', 'collectionId', 'type', 'tier', 'theme', 'price', 'starReq']:
            if item[key] != metadata[item['id']][key]:
                raise ValueError(f"{item['id']}: current Store {key} drift")
        for record in [item, item['original']]:
            data = (ROOT / record['repositoryPath']).read_bytes()
            if sha(data) != record['sha256'] or blob(data) != record['gitBlobSha']:
                raise ValueError('Stored asset hash mismatch')
        image_info((ROOT / item['repositoryPath']).read_bytes())
        hashes.add(item['sha256'])
    if len(hashes) != 4:
        raise ValueError('Duplicate image bytes across four candidate IDs')


def main() -> None:
    guard()
    request = json.loads(REQUEST.read_text())
    if [item['id'] for item in request['items']] != EXPECTED_IDS:
        raise ValueError('This importer accepts only Lighting 9-12')
    metadata = store_metadata()
    if REPORT.exists():
        report = json.loads(REPORT.read_text())
        verify_stored(report, metadata)
        print('4/4 stored candidate/source pairs reverified; no downloads or regeneration')
        return
    prepared = []
    for item in request['items']:
        real = metadata[item['id']]
        for key in ['name', 'collectionId', 'type', 'tier', 'theme', 'price', 'starReq']:
            if item[key] != real[key]:
                raise ValueError(f"{item['id']}: requested {key} does not match actual Store")
        candidate_path = ROOT / item['candidateRepositoryPath']
        expected_path = ROOT / f"public/assets/catalog/{item['id']}-w04-recovered-v2.jpg"
        if candidate_path != expected_path:
            raise ValueError('Unexpected candidate destination')
        rendition = fetch_bytes(item['renditionUrl'])
        info = image_info(rendition)
        if info['format'] != 'JPEG':
            raise ValueError('Rendition is not JPEG; refusing misleading .jpg extension')
        source = fetch_bytes(item['sourceUrl'])
        try:
            source_info = image_info(source)
            extension = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}[source_info['format']]
            source_info['validation'] = 'DECODED_IMAGE_PASS'
        except Exception:
            if not source.startswith(b'PK\x03\x04'):
                raise ValueError('Source is neither a supported image nor a preserved generation container')
            extension = '.ffgenimg'
            source_info = {'format': 'PRESERVED_GENERATION_CONTAINER', 'bytes': len(source), 'sha256': sha(source), 'gitBlobSha': blob(source), 'validation': 'CONTAINER_BYTES_PRESERVED_NOT_IMAGE_DECODED'}
        original_path = ORIGINALS / (item['id'] + '-' + item['assetId'].rsplit(':', 1)[-1] + extension)
        prepared.append((item, rendition, info, source, source_info, candidate_path, original_path))
    if len({entry[2]['sha256'] for entry in prepared}) != 4:
        raise ValueError('Duplicate candidates across item IDs')
    for _, rendition, _, source, _, candidate_path, original_path in prepared:
        for path, data in [(candidate_path, rendition), (original_path, source)]:
            if path.exists() and path.read_bytes() != data:
                raise ValueError('Conflicting output found before publication')
    results = []
    for item, rendition, info, source, source_info, candidate_path, original_path in prepared:
        immutable_write(candidate_path, rendition)
        immutable_write(original_path, source)
        real = metadata[item['id']]
        result = {key: real[key] for key in ['id', 'name', 'collectionId', 'collectionName', 'type', 'tier', 'theme', 'price', 'starReq']}
        result.update(info)
        result.update({'producer': '04', 'transportHelper': 'CHAT', 'independentReviewer': '14', 'assetId': item['assetId'], 'repositoryPath': str(candidate_path.relative_to(ROOT)), 'assetPath': '/' + str(candidate_path.relative_to(ROOT / 'public')), 'status': 'READY_FOR_REVIEW', 'readback': 'PASS', 'transformation': 'None: exact Adobe rendition response bytes copied; no crop, recolor, resize, recompression or regeneration', 'original': {**source_info, 'repositoryPath': str(original_path.relative_to(ROOT))}})
        results.append(result)
        print(f"{item['id']}: {info['format']} {info['dimensions']} {info['bytes']} bytes; {info['gitBlobSha']}")
    report = {'schemaVersion': 1, 'batchId': request['batchId'], 'status': 'STAGED_READY_FOR_INDEPENDENT_REVIEW', 'sourceHead': current_head(), 'workflowRunId': os.environ.get('GITHUB_RUN_ID'), 'producer': '04', 'transportHelper': 'CHAT', 'independentReviewer': '14', 'canonicalWriter': '08', 'newGenerations': 0, 'storedCandidateCount': 4, 'storedOriginalCount': 4, 'independentAcceptsThisIntake': 0, 'canonicalPromotionsThisIntake': 0, 'duplicateCandidateContent': 0, 'metadataSource': 'src/gameModel.js store export', 'items': results, 'checks': {'metadata': 'PASS_4_OF_4', 'exactByteReadback': 'PASS_8_OF_8', 'candidateDecode': 'PASS_4_OF_4', 'repeatBehavior': 'PENDING_SECOND_RUN', 'independentVisualReview': 'PENDING_14'}, 'freeze': {'replitTouched': False, 'flootTouched': False, 'mainTouched': False, 'canonicalMappingsTouched': False, 'gameplayChanged': False}, 'handoff': '04: preserve these stored versions. 14: inspect exact candidate hashes at card/detail scale. 08: only wire after independent ACCEPT. 15: byte-transfer blocker cleared for Lighting 9-12.'}
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    verify_stored(report, metadata)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Lighting 9-12 intake FAILED: ' + str(error), file=sys.stderr)
        raise

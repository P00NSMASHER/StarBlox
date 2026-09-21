"""Recover the four existing Workstream-02 Bed generations into versioned repository paths.
No image regeneration, creative edits, catalog mapping changes, gameplay changes, or player-state changes.
"""
from __future__ import annotations

import copy
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
LANE = ROOT / 'docs/preproduction/catalog-sprint/lane-02.json'
REPORT = ROOT / 'docs/preproduction/catalog-sprint/chat-beds-recovery-1-4-result.json'
EXPECTED_IDS = ['beds-1', 'beds-2', 'beds-3', 'beds-4']
BRANCH = 'screenshot-match-preproduction'
MAX_BYTES = 16 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def guard_branch() -> None:
    actual = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    expected_ref = 'refs/heads/' + BRANCH
    if actual != BRANCH or os.environ.get('GITHUB_REF', expected_ref) != expected_ref:
        raise RuntimeError('Only the authorized screenshot-match-preproduction branch may run this intake')


def fetch_exact(url: str) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'photoshop-api.adobe.io':
        raise ValueError('Only the producer-recorded Adobe Photoshop HTTPS short URL is allowed')
    request = urllib.request.Request(url, headers={'User-Agent': 'StarBlox-Authorized-Asset-Intake/1.0'})
    with urllib.request.urlopen(request, timeout=60) as response:
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
    if fmt != 'PNG':
        raise ValueError(f'Expected exact PNG generation bytes, received {fmt}')
    if width != height or not 512 <= width <= 4096:
        raise ValueError(f'Unexpected catalog image dimensions: {width}x{height}')
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        extrema = image.getextrema()
        bands = extrema if isinstance(extrema[0], tuple) else [extrema]
        if all(lo == hi for lo, hi in bands):
            raise ValueError('Blank constant-color image rejected')
    return {
        'format': fmt,
        'dimensions': [width, height],
        'bytes': len(data),
        'sha256': sha256(data),
        'gitBlobSha': git_blob_sha(data),
    }


def store_metadata() -> dict:
    code = "import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    items = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', code], cwd=ROOT, text=True))
    if len(items) != 192 or len({item['id'] for item in items}) != 192:
        raise ValueError('Authoritative Store no longer has exactly 192 unique IDs')
    return {item['id']: item for item in items}


def repo_path_from_intended(value: str) -> Path:
    if not value.startswith('/assets/catalog-candidates/w02-beds-20260921-b01/'):
        raise ValueError('Unexpected Bed candidate destination')
    path = ROOT / 'public' / value.lstrip('/')
    resolved = path.resolve()
    if ROOT not in resolved.parents or resolved.is_symlink():
        raise ValueError('Unsafe output path')
    return resolved


def immutable_write(path: Path, data: bytes) -> None:
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError('Conflicting existing candidate bytes: ' + str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + '.intake-tmp')
    tmp.write_bytes(data)
    tmp.replace(path)
    if path.read_bytes() != data:
        raise ValueError('Candidate byte readback mismatch')


def verify_lane_candidate(candidate: dict, real: dict) -> None:
    expected = {
        'itemId': real['id'],
        'name': real['name'],
        'tier': real['tier'],
        'theme': real['theme'],
    }
    for key, value in expected.items():
        if candidate.get(key) != value:
            raise ValueError(f"{real['id']}: lane {key} disagrees with authoritative Store")


def verify_stored(lane: dict, report: dict, metadata: dict) -> None:
    items = report.get('items', [])
    if [item['id'] for item in items] != EXPECTED_IDS:
        raise ValueError('Stored report ID mismatch')
    hashes = set()
    by_id = {c['itemId']: c for c in lane['batch']['candidates']}
    for item in items:
        real = metadata[item['id']]
        for key in ['name', 'collectionId', 'collectionName', 'type', 'tier', 'theme', 'price', 'starReq']:
            if item[key] != real[key]:
                raise ValueError(f"{item['id']}: stored report {key} drift")
        p = ROOT / item['repositoryPath']
        data = p.read_bytes()
        info = image_info(data)
        if info['sha256'] != item['sha256'] or info['gitBlobSha'] != item['gitBlobSha']:
            raise ValueError(f"{item['id']}: stored candidate hash mismatch")
        lane_item = by_id[item['id']]
        if lane_item.get('repositoryPath') != item['repositoryPath'] or lane_item.get('gitBlobSha') != item['gitBlobSha']:
            raise ValueError(f"{item['id']}: lane/report readback mismatch")
        hashes.add(item['sha256'])
    if len(hashes) != 4:
        raise ValueError('Duplicate candidate image bytes across Beds 1-4')


def main() -> None:
    guard_branch()
    lane = json.loads(LANE.read_text())
    candidates = lane.get('batch', {}).get('candidates', [])
    if [c.get('itemId') for c in candidates] != EXPECTED_IDS:
        raise ValueError('Lane-02 no longer contains the expected Beds 1-4 batch')
    metadata = store_metadata()

    if REPORT.exists() and lane.get('batch', {}).get('status') == 'STAGED_READY_FOR_REVIEW_05':
        report = json.loads(REPORT.read_text())
        verify_stored(lane, report, metadata)
        print('Beds 1-4 already staged; exact bytes and lane/report hashes reverified without redownload')
        return

    prepared = []
    for candidate in candidates:
        real = metadata[candidate['itemId']]
        verify_lane_candidate(candidate, real)
        destination = repo_path_from_intended(candidate['intendedRepositoryPath'])
        data = fetch_exact(candidate['remoteSourceUrl'])
        info = image_info(data)
        prepared.append((candidate, real, destination, data, info))

    if len({info['sha256'] for _, _, _, _, info in prepared}) != 4:
        raise ValueError('Duplicate image bytes across Beds 1-4')

    for _, _, destination, data, _ in prepared:
        immutable_write(destination, data)

    results = []
    by_id = {candidate['itemId']: candidate for candidate in candidates}
    for candidate, real, destination, data, info in prepared:
        rel = str(destination.relative_to(ROOT))
        asset_path = '/' + str(destination.relative_to(ROOT / 'public'))
        candidate.update({
            'repositoryPath': rel,
            'assetPath': asset_path,
            'gitBlobSha': info['gitBlobSha'],
            'sha256': info['sha256'],
            'bytes': info['bytes'],
            'dimensions': info['dimensions'],
            'status': 'READY_FOR_REVIEW_05',
            'readback': 'PASS',
            'transformation': 'None: exact producer-recorded Adobe Firefly PNG response bytes copied; no crop, resize, recompression, recolor, or regeneration',
        })
        item = {key: real[key] for key in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
        item.update(info)
        item.update({
            'producer': '02',
            'transportHelper': 'CHAT',
            'independentReviewer': '05',
            'repositoryPath': rel,
            'assetPath': asset_path,
            'generationRequestId': candidate['generationRequestId'],
            'remoteSourceUrl': candidate['remoteSourceUrl'],
            'status': 'READY_FOR_REVIEW_05',
            'readback': 'PASS',
            'transformation': candidate['transformation'],
        })
        results.append(item)
        print(f"{real['id']}: PNG {info['dimensions']} {info['bytes']} bytes; {info['gitBlobSha']}")

    previous_staging = copy.deepcopy(lane.get('staging', {}))
    history = lane.setdefault('stagingHistory', [])
    if previous_staging and previous_staging.get('status') != 'PASS_BEDS_1_4_EXACT_BYTES_STAGED':
        if not history or history[-1] != previous_staging:
            history.append(previous_staging)
    lane['status'] = 'BEDS_1_4_STAGED_READY_FOR_REVIEW_05'
    lane['batch']['status'] = 'STAGED_READY_FOR_REVIEW_05'
    lane['batch']['readyForIndependentReview'] = True
    lane['staging'] = {
        'status': 'PASS_BEDS_1_4_EXACT_BYTES_STAGED',
        'method': 'Authorized GitHub Actions download from the producer-recorded Adobe HTTPS short URLs',
        'exactByteReadback': 'PASS_4_OF_4',
        'metadata': 'PASS_4_OF_4_AGAINST_CURRENT_GAME_MODEL',
        'duplicateCandidateContent': 0,
        'independentVisualReview': 'PENDING_05',
        'canonicalIntegration': 'PENDING_08_AFTER_ACCEPT',
    }

    report = {
        'schemaVersion': 1,
        'batchId': lane['batch']['batchId'],
        'status': 'STAGED_READY_FOR_INDEPENDENT_REVIEW_05',
        'sourceHead': subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'workflowRunId': os.environ.get('GITHUB_RUN_ID'),
        'producer': '02',
        'transportHelper': 'CHAT',
        'independentReviewer': '05',
        'canonicalWriter': '08',
        'newGenerations': 0,
        'storedCandidateCount': 4,
        'duplicateCandidateContent': 0,
        'metadataSource': 'src/gameModel.js store export',
        'items': results,
        'checks': {
            'metadata': 'PASS_4_OF_4',
            'exactByteReadback': 'PASS_4_OF_4',
            'candidateDecode': 'PASS_4_OF_4',
            'repeatBehavior': 'PENDING_SECOND_RUN',
            'independentVisualReview': 'PENDING_05',
        },
        'freeze': {
            'replitTouched': False,
            'flootTouched': False,
            'mainTouched': False,
            'canonicalMappingsTouched': False,
            'gameplayChanged': False,
            'playerDataTouched': False,
        },
        'handoff': '05: independently inspect exact Bed 1-4 hashes at card/detail scale. 08: integrate only after qualified ACCEPT. 02: preserve these exact versions pending review.',
    }

    LANE.write_text(json.dumps(lane, indent=2) + '\n')
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    verify_stored(lane, report, metadata)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Beds 1-4 intake FAILED: ' + str(error), file=sys.stderr)
        raise

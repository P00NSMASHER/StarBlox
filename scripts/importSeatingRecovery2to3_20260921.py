"""Recover exact existing Workstream-01 Seating 2-3 Firefly assets into versioned repository paths.
No regeneration, creative edits, canonical mapping changes, gameplay changes, or player-state changes.
"""
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
REQUEST = ROOT / 'docs/preproduction/catalog-sprint/chat-seating-recovery-2-3-20260921.json'
LANE = ROOT / 'docs/preproduction/catalog-sprint/lane-01.json'
REPORT = ROOT / 'docs/preproduction/catalog-sprint/chat-seating-recovery-2-3-result.json'
ORIGINALS = ROOT / 'docs/preproduction/catalog-sprint/recovered-originals/seating-2-3-20260921'
EXPECTED_IDS = ['seating-2', 'seating-3']
BRANCH = 'screenshot-match-preproduction'
MAX_BYTES = 16 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def current_head() -> str:
    return subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()


def guard_branch() -> None:
    actual = subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip()
    expected_ref = 'refs/heads/' + BRANCH
    if actual != BRANCH or os.environ.get('GITHUB_REF', expected_ref) != expected_ref:
        raise RuntimeError('Only the authorized preproduction branch may run this intake')


def fetch_exact(url: str) -> bytes:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'at.adobe.com':
        raise ValueError('Only connector-resolved Adobe HTTPS links are allowed')
    req = urllib.request.Request(url, headers={'User-Agent': 'StarBlox-Authorized-Asset-Intake/1.0'})
    with urllib.request.urlopen(req, timeout=60) as response:
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


def immutable_write(path: Path, data: bytes) -> None:
    resolved = path.resolve()
    if ROOT not in resolved.parents or resolved.is_symlink():
        raise ValueError('Unsafe output path')
    if path.exists():
        if path.read_bytes() != data:
            raise ValueError('Conflicting existing output; refusing overwrite: ' + str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.intake-tmp')
    temp.write_bytes(data)
    temp.replace(path)
    if path.read_bytes() != data:
        raise ValueError('Byte readback mismatch')


def verify_stored(lane: dict, report: dict, metadata: dict) -> None:
    if [item['id'] for item in report.get('items', [])] != EXPECTED_IDS:
        raise ValueError('Stored report ID mismatch')
    lane_assets = {x['id']: x for x in lane.get('generatedRepairBatch', {}).get('assets', [])}
    hashes = set()
    for item in report['items']:
        real = metadata[item['id']]
        for key in ['name', 'collectionId', 'collectionName', 'type', 'tier', 'theme', 'price', 'starReq']:
            if item[key] != real[key]:
                raise ValueError(f"{item['id']}: stored report {key} drift")
        asset = lane_assets.get(item['id'])
        if not asset:
            raise ValueError(f"{item['id']}: missing lane asset")
        p = ROOT / item['repositoryPath']
        data = p.read_bytes()
        info = image_info(data)
        if info['sha256'] != item['sha256'] or info['gitBlobSha'] != item['gitBlobSha']:
            raise ValueError(f"{item['id']}: stored candidate hash mismatch")
        if asset.get('repositoryPath') != item['repositoryPath'] or asset.get('gitBlobSha') != item['gitBlobSha']:
            raise ValueError(f"{item['id']}: lane/report handoff mismatch")
        source_path = ROOT / item['original']['repositoryPath']
        source_bytes = source_path.read_bytes()
        if sha256(source_bytes) != item['original']['sha256'] or git_blob_sha(source_bytes) != item['original']['gitBlobSha']:
            raise ValueError(f"{item['id']}: preserved source hash mismatch")
        hashes.add(item['sha256'])
    if len(hashes) != 2:
        raise ValueError('Duplicate candidate content across Seating 2-3')


def main() -> None:
    guard_branch()
    request = json.loads(REQUEST.read_text())
    lane = json.loads(LANE.read_text())
    if [x['id'] for x in request.get('items', [])] != EXPECTED_IDS:
        raise ValueError('This importer accepts only Seating 2-3')
    assets = {x['id']: x for x in lane.get('generatedRepairBatch', {}).get('assets', [])}
    if set(assets) != set(EXPECTED_IDS):
        raise ValueError('Lane-01 generated repair batch no longer matches Seating 2-3')
    metadata = store_metadata()

    if REPORT.exists() and lane.get('generatedRepairBatch', {}).get('status') == 'STAGED_READY_FOR_REVIEW_02':
        report = json.loads(REPORT.read_text())
        verify_stored(lane, report, metadata)
        print('Seating 2-3 already staged; exact bytes and hashes reverified without redownload')
        return

    prepared = []
    for req in request['items']:
        item_id = req['id']
        real = metadata[item_id]
        lane_asset = assets[item_id]
        for key in ['name', 'tier', 'theme']:
            if lane_asset.get(key) != real[key]:
                raise ValueError(f"{item_id}: lane {key} disagrees with authoritative Store")
        if lane_asset.get('adobeGenAIAssetId') != req['assetId']:
            raise ValueError(f"{item_id}: asset URN mismatch")
        candidate_path = ROOT / req['candidateRepositoryPath']
        expected_name = f"{item_id}-w01-recovered-v2.jpg"
        if candidate_path.name != expected_name or candidate_path.parent != ROOT / 'public/assets/catalog':
            raise ValueError(f"{item_id}: unexpected candidate destination")

        rendition = fetch_exact(req['renditionUrl'])
        info = image_info(rendition)
        if info['format'] != 'JPEG':
            raise ValueError(f"{item_id}: rendition is not JPEG; refusing misleading .jpg extension")

        source = fetch_exact(req['sourceUrl'])
        try:
            source_info = image_info(source)
            ext = {'PNG': '.png', 'JPEG': '.jpg', 'WEBP': '.webp'}[source_info['format']]
            source_info['validation'] = 'DECODED_IMAGE_PASS'
        except Exception:
            if not source.startswith(b'PK\x03\x04'):
                raise ValueError(f"{item_id}: source is neither a supported image nor preserved generation container")
            ext = '.ffgenimg'
            source_info = {
                'format': 'PRESERVED_GENERATION_CONTAINER',
                'bytes': len(source),
                'sha256': sha256(source),
                'gitBlobSha': git_blob_sha(source),
                'validation': 'CONTAINER_BYTES_PRESERVED_NOT_IMAGE_DECODED',
            }
        source_path = ORIGINALS / (item_id + '-' + req['assetId'].rsplit(':', 1)[-1] + ext)
        prepared.append((req, lane_asset, real, candidate_path, rendition, info, source_path, source, source_info))

    if len({entry[5]['sha256'] for entry in prepared}) != 2:
        raise ValueError('Duplicate candidate content across Seating 2-3')

    for _, _, _, candidate_path, rendition, _, source_path, source, _ in prepared:
        immutable_write(candidate_path, rendition)
        immutable_write(source_path, source)

    results = []
    for req, lane_asset, real, candidate_path, rendition, info, source_path, source, source_info in prepared:
        rel = str(candidate_path.relative_to(ROOT))
        public_path = '/' + str(candidate_path.relative_to(ROOT / 'public'))
        lane_asset.update({
            'repositoryReadback': 'PASS',
            'repositoryPath': rel,
            'assetPath': public_path,
            'gitBlobSha': info['gitBlobSha'],
            'sha256': info['sha256'],
            'bytes': info['bytes'],
            'candidateDimensions': info['dimensions'],
            'status': 'READY_FOR_REVIEW_02',
            'transformation': 'None: exact Adobe rendition response bytes copied; no crop, resize, recompression, recolor, or regeneration',
        })
        record = {key: real[key] for key in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
        record.update(info)
        record.update({
            'producer': '01',
            'transportHelper': 'CHAT',
            'independentReviewer': '02',
            'assetId': req['assetId'],
            'repositoryPath': rel,
            'assetPath': public_path,
            'status': 'READY_FOR_REVIEW_02',
            'readback': 'PASS',
            'transformation': lane_asset['transformation'],
            'original': {**source_info, 'repositoryPath': str(source_path.relative_to(ROOT))},
        })
        results.append(record)
        print(f"{record['id']}: {info['format']} {info['dimensions']} {info['bytes']} bytes; {info['gitBlobSha']}")

    lane['status'] = 'SEATING_2_3_STAGED_READY_FOR_REVIEW_02_HOME_SCENE_V1_REWORK_REVIEWED'
    lane['generatedRepairBatch']['status'] = 'STAGED_READY_FOR_REVIEW_02'
    lane['generatedRepairBatch']['repositoryStoredCount'] = 2
    lane['binaryStagingBlocker'] = {
        'status': 'CLEARED_SEATING_2_3',
        'resolution': 'Authorized coordination-owned Adobe-to-Git recovery staged exact existing rendition/source bytes with immutable readback.',
        'independentReview': 'PENDING_02',
        'canonicalIntegration': 'PENDING_08_AFTER_ACCEPT',
    }
    lane['checks']['repositoryPersistence'] = 'PASS_2_OF_2_STAGED_READBACK'
    lane['checks']['independentReview'] = 'PENDING_02_EXACT_HASH'
    lane['handoff']['02'] = 'Seating 2-3 exact replacement bytes are now repository-staged and hash-bound. Review these exact current hashes at card/detail scale; legacy REWORK does not transfer.'
    lane['handoff']['15'] = 'Seating 2-3 byte-transfer blocker cleared; no regeneration needed. Reviewer 02 owns the next decision.'

    report = {
        'schemaVersion': 1,
        'batchId': request['batchId'],
        'status': 'STAGED_READY_FOR_INDEPENDENT_REVIEW_02',
        'sourceHead': current_head(),
        'workflowRunId': os.environ.get('GITHUB_RUN_ID'),
        'producer': '01',
        'transportHelper': 'CHAT',
        'independentReviewer': '02',
        'canonicalWriter': '08',
        'newGenerations': 0,
        'storedCandidateCount': 2,
        'storedOriginalCount': 2,
        'duplicateCandidateContent': 0,
        'metadataSource': 'src/gameModel.js store export',
        'items': results,
        'checks': {
            'metadata': 'PASS_2_OF_2',
            'exactByteReadback': 'PASS_4_FILES_CANDIDATE_PLUS_ORIGINAL',
            'candidateDecode': 'PASS_2_OF_2',
            'repeatBehavior': 'PENDING_SECOND_RUN',
            'independentVisualReview': 'PENDING_02',
        },
        'freeze': {
            'replitTouched': False,
            'flootTouched': False,
            'mainTouched': False,
            'canonicalMappingsTouched': False,
            'gameplayChanged': False,
            'playerDataTouched': False,
        },
        'handoff': '02: independently inspect exact Seating 2-3 current hashes. 08: integrate only after qualified ACCEPT. 01: preserve these exact versions pending review.',
    }
    LANE.write_text(json.dumps(lane, indent=2) + '\n')
    REPORT.write_text(json.dumps(report, indent=2) + '\n')
    verify_stored(lane, report, metadata)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Seating 2-3 intake FAILED: ' + str(error), file=sys.stderr)
        raise

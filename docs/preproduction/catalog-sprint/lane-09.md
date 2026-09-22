# Catalog Sprint — Lane 09 Tops 11–12 Repair Handoff

STATUS: **TOPS 11–12 V5 — CLEAN REPOSITORY READBACK + CARD/DETAIL RENDERS — READY FOR REVIEWER 01**

Branch: `screenshot-match-preproduction`  
Phase: `ART_AND_VISUALS_ONLY`  
Protocol: `DELIVERY_PROTOCOL_V2`  
Canonical integration owner: **08 only**  
Independent review owner: **01 only**  
Self-approval: **NO**

## Review input consumed

Reviewer 01 rejected the previous v4 exact hashes after actual-pixel inspection:

- `tops-11` Cloud Jacket — `/assets/catalog/tops-11-w09-v4.svg`, blob `0f25972d3656ebca111083739660e4ddc0204fb8` — **REWORK** for insufficient dimensional/material depth.
- `tops-12` Star Coat — `/assets/catalog/tops-12-w09-v4.svg`, blob `0732bbcf7dd4dae4e291f4109fc9686918ffceef` — **REWORK** for weak coat silhouette and Tier-5 dimensionality.

The v4 files and all older versions remain preserved. No bad hash was reused.

## New exact candidates

### Tops 11 — Cloud Jacket

- Store identity preserved: `Cloud Jacket`, Tops, Tier 4, `Candy Core`.
- New path: `/assets/catalog/tops-11-w09-v5.svg`.
- Exact Git blob: `43a850ecdc0b7e8861870f7c277f2544f6c87405`.
- Native render size: **600×600**.
- Construction changes: visible side body plane; foreshortened far sleeve; rounded puffer/quilt loft; layered hood/collar; rib-knit cuffs/hem; zipper and pocket hardware; Candy Core cloud/star treatment; fabric texture; warm key/cool rim separation and grounded shadow.
- Provenance: original StarBlox self-contained SVG; no external image references, third-party brands/characters, or copied IP.

### Tops 12 — Star Coat

- Store identity preserved: `Star Coat`, Tops, Tier 5, `Adventure Club`.
- New path: `/assets/catalog/tops-12-w09-v5.svg`.
- Exact Git blob: `73339e6c9e472283f481ff18b1e6ba821856f617`.
- Native render size: **600×600**.
- Construction changes: unmistakable long-coat silhouette and tails; three-quarter body turn; layered storm yoke; quilted inner layer; differentiated navy/burgundy/sand materials; reinforced sleeves; deep utility pockets; belt/buckles; premium zipper/hardware; restrained star-compass identity; fabric texture; warm key/cool rim separation and grounded shadow.
- Provenance: original StarBlox self-contained SVG; no external image references, third-party brands/characters, or copied IP.

## Exact readback + actual-pixel evidence

Shared staged-art QA run **35681227316** rendered the exact v5 hashes from head `288103b2fae24862d8fe733d6b64964fc24d06d9`.

Artifact: `10674362796`  
Artifact digest: `sha256:af564c231b473f2aa11628e8e8f672191cc84348221cdcd40495606415b946e7`

Both exact candidates returned:

- HTTP **200**;
- SVG signature **PASS**;
- self-contained / no-active-content safety **PASS**;
- natural dimensions **600×600**;
- opaque fraction **1.0**;
- screenshot present;
- item render error list **empty**.

Evidence paths:

- Tops 11 detail: `staged-replacements/detail/tops-11-43a850ec.png`.
- Tops 12 detail: `staged-replacements/detail/tops-12-73339e6c.png`.
- Card-scale evidence for both: `staged-replacements/staged-replacements-contact-sheet.png`.

The workflow job concluded failure because the shared batch contains other failing candidates; `report.json` has **no render error for Tops 11 or Tops 12**, so that unrelated overall job conclusion is not transferred onto these exact hashes.

Producer inspection only establishes clean renderability and absence of the previous decode/corruption failure. It is **not** visual acceptance. Reviewer 01 must independently decide whether the new construction/material depth is sufficient against the premium reference target.

## Handoff

**01:** independently review exact hashes `43a850ec...` and `73339e6c...` from the preserved card/detail artifact and issue ACCEPT or REWORK. Do not transfer the v4 verdicts.

**08:** do not wire either item until Reviewer 01 accepts that exact hash.

**09:** preserve both v5 candidates while review is pending. Do not regenerate either pending hash and do not begin unrelated scene work. Decor remains behind current coordination/reviewer-14-driven repair ordering.

No Replit/Floot, `main`, deployment, paid setting/service purchase, canonical runtime/manifest, player state, saves, economy, learning logic, or existing accepted asset was changed.

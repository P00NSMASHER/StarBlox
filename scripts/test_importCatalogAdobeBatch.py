#!/usr/bin/env python3
from importCatalogAdobeBatch import ROOT, repo_path


def main():
    candidate = ROOT / "public" / "assets" / "catalog" / "desks-9-example.jpg"
    original = ROOT / "docs" / "preproduction" / "catalog-sprint" / "source.png"
    assert repo_path(candidate) == "public/assets/catalog/desks-9-example.jpg"
    assert repo_path(candidate, ROOT / "public") == "assets/catalog/desks-9-example.jpg"
    assert repo_path(original) == "docs/preproduction/catalog-sprint/source.png"
    assert "\\" not in repo_path(candidate)
    print("CATALOG_ADOBE_IMPORT_CONTRACT_TEST=PASS")


if __name__ == "__main__":
    main()

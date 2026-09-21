"""Regression checks for immutable screenshot intake; no player state is loaded."""
import io
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
import import_reference_screenshots as intake


class ReferenceIntakeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        root = Path(os.environ.get("STARBLOX_REFERENCE_FIXTURE_ROOT", "."))
        cls.originals = root / intake.OUT / "originals"
        cls.source_bytes = {row[0]: (cls.originals / f"{row[0]}-1448x1086.jpeg").read_bytes()
                            for row in intake.SOURCES}

    def source_dir(self, temp):
        source = Path(temp) / "input"
        source.mkdir()
        for screen, filename, *_ in intake.SOURCES:
            (source / filename).write_bytes(self.source_bytes[screen])
        return source

    def test_all_original_hashes_dimensions_and_unique_content(self):
        hashes = set()
        for screen, _, size, digest, *_ in intake.SOURCES:
            image = intake.validate_original(self.source_bytes[screen], size, digest)
            self.assertEqual(image.size, (1448, 1086))
            hashes.add(intake.sha256(self.source_bytes[screen]))
        self.assertEqual(len(hashes), 3)

    def test_tampered_source_rejected(self):
        _, _, size, digest, *_ = intake.SOURCES[0]
        bad = bytearray(self.source_bytes["home"])
        bad[-10] ^= 1
        with self.assertRaises(ValueError):
            intake.validate_original(bytes(bad), size, digest)

    def test_truncated_source_rejected(self):
        _, _, size, digest, *_ = intake.SOURCES[0]
        with self.assertRaises(ValueError):
            intake.validate_original(self.source_bytes["home"][:-1], size, digest)

    def test_normalization_is_deterministic_and_not_cropped(self):
        _, _, size, digest, *_ = intake.SOURCES[0]
        original = intake.validate_original(self.source_bytes["home"], size, digest)
        a = intake.normalized_png(original)
        self.assertEqual(a, intake.normalized_png(original))
        self.assertEqual(Image.open(io.BytesIO(a)).size, (1408, 1056))
        self.assertEqual(1448 * 1056, 1086 * 1408)

    def test_repeat_intake_uses_stored_bytes_without_network(self):
        with tempfile.TemporaryDirectory() as temp:
            source = self.source_dir(temp)
            output = Path(temp) / "out"
            first = intake.prepare(output, source)
            with patch("urllib.request.urlopen", side_effect=AssertionError("unexpected network")):
                second = intake.prepare(output)
            self.assertEqual(first, second)
            self.assertEqual(second["checks"]["catalogArtCompleted"], 0)
            self.assertEqual(second["referenceCoverage"], {"desktop": 3, "tablet": 0, "phone": 0})

    def test_conflicting_reference_is_not_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            source = self.source_dir(temp)
            output = Path(temp) / "out"
            target = output / intake.OUT / "home-desktop-1408x1056.png"
            target.parent.mkdir(parents=True)
            target.write_bytes(b"existing different reference")
            with self.assertRaises(ValueError):
                intake.prepare(output, source)
            self.assertEqual(target.read_bytes(), b"existing different reference")
            self.assertFalse((output / intake.OUT / "originals").exists())

    def test_one_bad_input_prevents_partial_publication(self):
        with tempfile.TemporaryDirectory() as temp:
            source = self.source_dir(temp)
            output = Path(temp) / "out"
            (source / intake.SOURCES[2][1]).write_bytes(b"bad quest")
            with self.assertRaises(ValueError):
                intake.prepare(output, source)
            self.assertFalse((output / intake.OUT).exists())


if __name__ == "__main__":
    unittest.main()

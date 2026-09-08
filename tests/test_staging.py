"""The test desk must include its test framework or fail before staging."""

import pathlib
import subprocess
import tempfile
import unittest


SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "bin/stage-desk.sh"


class StagingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.source = self.root / "source"
        self.source.mkdir()
        self.base = self.root / "base"
        (self.base / "lib").mkdir(parents=True)
        self.output = self.root / "staged"

    def stage(self):
        return subprocess.run(
            ["bash", str(SCRIPT), "--src", str(self.source),
             "--base", str(self.base), "--no-kelvin", str(self.output)],
            capture_output=True, text=True,
        )

    def test_missing_framework_preserves_existing_output(self):
        self.output.mkdir()
        sentinel = self.output / "existing"
        sentinel.write_text("keep")
        result = self.stage()
        self.assertEqual(result.returncode, 3)
        self.assertIn("required dependency missing:", result.stderr)
        self.assertIn("lib/test.hoon", result.stderr)
        self.assertEqual(sentinel.read_text(), "keep")

    def test_framework_is_materialized(self):
        framework = self.root / "test.hoon"
        framework.write_text("|%\n--\n")
        (self.base / "lib/test.hoon").symlink_to(framework)
        result = self.stage()
        self.assertEqual(result.returncode, 0, result.stderr)
        staged = self.output / "lib/test.hoon"
        self.assertFalse(staged.is_symlink())
        self.assertEqual(staged.read_bytes(), framework.read_bytes())


if __name__ == "__main__":
    unittest.main()

"""Manual sync must preserve application files and detect local drift."""
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class SyncTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = pathlib.Path(temp.name)
        self.source = root / "urui"
        self.dest = root / "consumer"
        for base in (self.source, self.dest):
            (base / "desk/lib").mkdir(parents=True)
        (self.source / "desk/sur").mkdir()
        (self.source / "desk/sur/urui.hoon").write_text("contract")
        (self.source / "desk/lib/urui-http.hoon").write_text("first")
        (self.source / "desk/lib/test.hoon").write_text("source framework")
        (self.dest / "desk/lib/test.hoon").write_text("consumer framework")
        (self.dest / "desk/lib/app.hoon").write_text("app")
        (self.source / "bin").mkdir()
        shutil.copy(ROOT / "bin/sync.py", self.source / "bin/sync.py")

    def run_sync(self, operation="sync", *args):
        return subprocess.run(
            ["python3", str(self.source / "bin/sync.py"), operation,
             "--dest", str(self.dest), *args], capture_output=True, text=True,
        )

    def test_sync_replaces_link_and_preserves_consumer_files(self):
        target = self.dest / "desk/lib/urui-http.hoon"
        target.symlink_to(self.source / "desk/lib/urui-http.hoon")
        result = self.run_sync()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(target.is_symlink())
        self.assertEqual(target.read_text(), "first")
        self.assertEqual((self.dest / "desk/lib/app.hoon").read_text(), "app")
        self.assertEqual((self.dest / "desk/lib/test.hoon").read_text(),
                         "consumer framework")
        self.assertEqual(self.run_sync("verify", "--strict").returncode, 0)

    def test_drift_states_and_manual_resync(self):
        self.assertEqual(self.run_sync().returncode, 0)
        source = self.source / "desk/lib/urui-http.hoon"
        target = self.dest / "desk/lib/urui-http.hoon"
        source.write_text("second")
        stale = self.run_sync("verify")
        self.assertEqual(stale.returncode, 0)
        self.assertIn("stale", stale.stdout)
        self.assertEqual(self.run_sync("verify", "--strict").returncode, 1)
        target.write_text("local edit")
        self.assertIn("modified-locally", self.run_sync("verify").stdout)
        target.unlink()
        self.assertIn("missing", self.run_sync("verify").stdout)
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertEqual(target.read_text(), "second")
        self.assertEqual(self.run_sync("verify", "--strict").returncode, 0)

    def test_new_library_is_included_automatically(self):
        (self.source / "desk/lib/urui-new.hoon").write_text("new")
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertEqual((self.dest / "desk/lib/urui-new.hoon").read_text(),
                         "new")

    def test_directory_link_is_refused(self):
        shutil.rmtree(self.dest / "desk/lib")
        (self.dest / "desk/lib").symlink_to(self.source / "desk/lib")
        result = self.run_sync()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("symlinked destination directory", result.stderr)

    def test_removed_source_deletes_only_its_previous_copy(self):
        self.assertEqual(self.run_sync().returncode, 0)
        (self.source / "desk/lib/urui-http.hoon").unlink()
        self.assertEqual(self.run_sync().returncode, 0)
        self.assertFalse((self.dest / "desk/lib/urui-http.hoon").exists())
        self.assertEqual((self.dest / "desk/lib/app.hoon").read_text(), "app")

    def test_removed_source_preserves_a_local_edit(self):
        self.assertEqual(self.run_sync().returncode, 0)
        (self.source / "desk/lib/urui-http.hoon").unlink()
        target = self.dest / "desk/lib/urui-http.hoon"
        target.write_text("local edit")
        self.assertNotEqual(self.run_sync().returncode, 0)
        self.assertEqual(target.read_text(), "local edit")


if __name__ == "__main__":
    unittest.main()

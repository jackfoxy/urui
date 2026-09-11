"""Manual source sync and checksum-based drift reporting (no watcher)."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
STATE = ".urui-sync.json"
ACE = (
    "ace.js", "theme-github.js", "theme-monokai.js", "ext-beautify.js",
    "ext-prompt.js", "ext-searchbox.js", "ext-settings-menu.js",
    "license.txt", "README.md",
)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def manifest():
    paths = ["desk/sur/urui.hoon"]
    paths += [p.relative_to(ROOT).as_posix()
              for p in sorted((ROOT / "desk/lib").glob("*.hoon"))
              if p.name != "test.hoon"]
    # Assets and browser support activate when their extraction lands.
    if (ROOT / "desk/web/ace/ace.js").is_file():
        paths += ["desk/web/ace/" + name for name in ACE]
    if (ROOT / "tests/browser/doubles/index.js").is_file():
        paths += [p.relative_to(ROOT).as_posix() for p in sorted(
            (ROOT / "tests/browser/doubles").rglob("*")) if p.is_file()]
    shortcut = "tests/browser/ace-win-linux-shortcuts.json"
    if (ROOT / shortcut).is_file():
        paths.append(shortcut)
    return paths


def read_state(dest):
    path = dest / STATE
    return json.loads(path.read_text()) if path.exists() else {}


def destination(dest, relative):
    path = Path(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"invalid managed path: {relative}")
    target = dest / relative
    # Do not follow a consumer directory link into another checkout.
    for parent in target.parents:
        if parent == dest:
            break
        if parent.is_symlink():
            raise ValueError(f"symlinked destination directory: {parent}")
    return target


def symlinks(root):
    found = []
    for directory, directories, files in os.walk(root, followlinks=False):
        base = Path(directory)
        for name in directories + files:
            path = base / name
            if path.is_symlink():
                found.append(path.relative_to(root).as_posix())
    return sorted(found)


def synchronize(dest, paths):
    checksums = {}
    for relative in paths:
        source = ROOT / relative
        if source.is_symlink() or not source.is_file():
            raise ValueError(f"source must be a regular file: {source}")
        checksums[relative] = digest(source)
        destination(dest, relative)
    previous = read_state(dest)
    removed = []
    for relative in sorted(set(previous) - set(paths)):
        target = destination(dest, relative)
        if target.is_symlink() or (target.exists() and (
                not target.is_file() or digest(target) != previous[relative])):
            raise ValueError(f"removed source has local changes: {relative}")
        if target.exists():
            removed.append(target)
    # Convert only the previously linked files in the active manifest.
    for relative in paths:
        target = destination(dest, relative)
        if target.is_symlink():
            target.unlink()
    (ROOT / "bin/sync-manifest.txt").write_text("\n".join(paths) + "\n")
    subprocess.run([
        "rsync", "-a", "--checksum", "--files-from=" + str(
            ROOT / "bin/sync-manifest.txt"), str(ROOT) + "/", str(dest) + "/",
    ], check=True)
    for relative, expected in checksums.items():
        target = dest / relative
        if target.is_symlink() or digest(target) != expected:
            raise ValueError(f"sync verification failed: {relative}")
    # Only prior manifest entries may be removed, never neighboring files.
    for target in removed:
        target.unlink()
    # Store content hashes, not a revision pin: revision policy is external.
    with tempfile.NamedTemporaryFile(mode="w", dir=dest, delete=False) as out:
        temporary = Path(out.name)
        json.dump(checksums, out, indent=2, sort_keys=True)
        out.write("\n")
    os.replace(temporary, dest / STATE)
    print(f"synced {len(paths)} files into {dest}")


def verify(dest, paths, strict, quiet):
    previous = read_state(dest)
    failed = False
    for relative in sorted(set(paths) | set(previous)):
        source, target = ROOT / relative, destination(dest, relative)
        current = digest(source) if source.is_file() else None
        actual = digest(target) if target.is_file() else None
        if target.is_symlink():
            status = "modified-locally"
        elif actual is None:
            status = "missing"
        elif current is not None and actual == current:
            status = "in-sync"
        elif actual == previous.get(relative):
            status = "stale"
        else:
            status = "modified-locally"
        failed |= status != "in-sync"
        if not quiet or status != "in-sync":
            print(f"{status:16} {relative}")
    if strict:
        for relative in symlinks(dest):
            failed = True
            print(f"{'symlink':16} {relative}")
    return int(strict and failed)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("sync", "verify"))
    parser.add_argument("--dest", type=Path, default=Path.cwd())
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    dest = args.dest.resolve()
    if dest == ROOT or ROOT in dest.parents or dest in ROOT.parents:
        parser.error("destination must be a separate consumer checkout")
    if not dest.is_dir():
        parser.error(f"destination not found: {dest}")
    try:
        paths = manifest()
        if args.operation == "sync":
            synchronize(dest, paths)
            return 0
        return verify(dest, paths, args.strict, args.quiet)
    except (OSError, ValueError, subprocess.CalledProcessError) as cause:
        parser.exit(1, f"{cause}\n")


if __name__ == "__main__":
    raise SystemExit(main())

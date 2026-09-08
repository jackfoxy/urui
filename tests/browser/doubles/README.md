# Doubles

This directory is where the DOM, Ace, fetch, storage, and media doubles land
in **W4.2**, moved from `graph-viz/tests/browser/doubles/` and consumed back
by graph-viz through the `tests/browser/doubles` symlink (plan §4.1).

It is deliberately empty now. Copying the doubles here while graph-viz still
owns them would create two copies to keep in step for a whole phase, and the
generic/app split they need has not happened yet — the scenarios that will
exercise them arrive in the same work item.

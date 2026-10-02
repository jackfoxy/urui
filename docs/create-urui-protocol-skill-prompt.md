# Prompt: create the `urui-protocol` skill

Create a repository-local Codex skill at
`.agents/skills/urui-protocol/` that enables an agent to understand, extend,
review, and safely change the urui API without repeatedly reverse-engineering
the implementation.

Use `$skill-creator`, `$hoon-expert-assistant`, `$hoon-style-guide`,
`$sail-markup`, and `$type-system`. Read `.codex/AGENTS.md` and each selected
skill's complete `SKILL.md` before acting. Follow repository instructions and
preserve all existing work, including untracked files.

## Scope

Create only the skill and its supporting resources. Do not refactor or modify
the urui implementation as part of this task. The skill must be grounded in
the repository's current source, not in a generic description of frontend,
Sail, Hoon, or Gall development.

The skill should activate for requests that inspect, integrate, extend, debug,
or change urui and its protocol boundaries. It should not activate for
unrelated Graphviz layout, DOT parsing, or generic browser work.

## Required source study

Read the complete contents of the urui implementation:

- `desk/sur/urui.hoon`: Hoon-side public data contract.
- `desk/lib/urui-config.hoon`: Hoon molds to `window.URUI_CONFIG` JSON.
- `desk/lib/urui-shell.hoon`: Sail document and DOM contract.
- `desk/lib/urui-js.hoon`: stable `window.urui` facade, consumer hooks,
  runtime internals, persistence, files, shortcuts, and Ace adapter.
- `desk/lib/urui-css.hoon`: composable CSS sections and ordering rules.
- `desk/lib/urui-ace.hoon`: emitted Ace loader configuration.
- `desk/lib/urui-http.hoon`: shared HTTP asset/response/auth primitives.
- `desk/lib/urui-clay.hoon`: path validation and Clay browse JSON.

Then trace every import, call site, generated asset route, and relevant test.
At minimum inspect:

- `desk/app/graph-viz-web.hoon`
- `desk/lib/gviz-web.hoon`
- `tests/browser/`
- `README.md`, `RELEASE.md`, `package.json`, and `check.sh`

Verify whether Graph Viz currently consumes the extracted urui libraries or
still embeds the earlier implementation. Treat embedded or historical code as
evidence only after comparing it with the current urui source. Explicitly
document test coverage gaps and do not claim that existing browser tests
exercise extracted code unless the call graph proves it.

Use `rg` to find references and read nearby code in context. Do not infer a
contract from names alone. For each important assertion, retain a local source
path and a stable symbol, arm, object, or section name so future agents can
quickly verify it. Avoid brittle line-number-only references.

## Model the whole protocol

The resulting skill must make these boundaries and their dependency direction
clear:

```text
consumer Hoon
  -> app-config / shell-spec molds
  -> emitted JSON, Sail DOM, CSS, and scripts
  -> stable window.urui facade
  -> installed consumer hooks and createRuntime options
  -> runtime-owned tabs, explorer, session, shortcuts, dialogs, layout,
     file operations, and editor adapters
  -> consumer HTTP/Clay routes and application behavior
```

Do not collapse distinct API layers. In particular, distinguish:

- the Hoon data contract in `sur/urui.hoon`;
- emitted JSON key names and null/number/string encodings;
- shell-owned DOM IDs, roles, data attributes, and structural assumptions;
- the stable frozen `window.urui` facade and one-time `boot` lifecycle;
- the hook object installed by the consumer;
- options accepted by `createRuntime` and `createAceEditorAdapter`;
- the larger internal object returned by `createRuntime`;
- HTTP/Clay wire behavior, authentication policy, and failure behavior;
- persisted session format, slot ownership, validation, versioning, and
  migration behavior.

Capture the non-obvious invariants that must remain synchronized across files.
These include Hoon-to-JavaScript field mappings, document-kind names, slot
shapes and owners, endpoint transport modes and headers, shell selectors used
by the runtime, CSS section ordering, shortcut contexts, Ace host metadata,
source-size limits, tab/ref relationships, and storage key/version semantics.

## Skill contents

Keep `SKILL.md` concise and useful as a router. Put substantial reference
material in `references/`. A suitable structure is:

```text
.agents/skills/urui-protocol/
|-- SKILL.md
|-- agents/openai.yaml
`-- references/
    |-- architecture.md
    |-- contracts.md
    |-- extension-workflows.md
    `-- validation.md
```

Use a smaller or differently split structure only if it is demonstrably easier
to navigate. Do not add a README, changelog, placeholders, or copied generic
tutorials.

`SKILL.md` must provide:

- a discriminating name and description;
- when to use the skill and when not to use it;
- a source-first operating workflow;
- routing to the minimum relevant reference for the requested change;
- the rules to inspect consumers before changing shared contracts, preserve
  dependency direction (`consumer -> urui`), make the smallest coherent
  change, and validate every affected boundary;
- guidance to use the Hoon, type-system, and Sail companion skills only when
  their axis is actually involved.

The references must collectively provide:

1. An architecture map showing ownership, initialization order, dependency
   direction, and data/event flow.
2. A contract inventory mapping each public field or operation through its
   Hoon definition, generated JSON or DOM representation, JavaScript consumer,
   hook/runtime method, persistence impact, and tests.
3. A public-versus-internal API classification. State what is genuinely stable,
   what is a consumer extension seam, and what is an implementation detail.
4. Exact behavioral contracts for tabs, explorers/docs/refs, sessions, files,
   shortcuts, dialogs, layout/theme/status, and the Ace adapter.
5. Change-impact guidance for at least these tasks:
   - add or change an `app-config` or `shell-spec` field;
   - add a stable `window.urui` method or hook;
   - add runtime-only behavior;
   - add a document kind, area, control, or shell element;
   - add or change an HTTP/Clay operation or transport field;
   - add or change a persisted slot or storage version;
   - add a CSS section or change required DOM/CSS coupling;
   - make an intentional breaking API change.
6. For each change type: affected files and symbols, compatibility hazards,
   required consumer updates, and the smallest meaningful validation path.
7. A validation matrix covering Hoon compilation, generated JavaScript/JSON,
   DOM behavior, browser tests, persistence round trips, transport variants,
   failure cases, accessibility/focus behavior, and responsive layout where
   applicable. Clearly separate currently available commands from proposed
   tests that do not yet exist.
8. Debugging entry points: what to inspect first for config mismatch, missing
   DOM selectors, boot/hook failures, malformed saved sessions, file transport
   errors, tab/ref desynchronization, shortcut conflicts, Ace loading, and
   Hoon type failures.

Prefer tables for exact cross-boundary mappings and short procedures for
change workflows. Include compact code excerpts only when they clarify a
fragile contract; otherwise link to source symbols to avoid duplicating code.
Label facts, inferred intent, legacy behavior, and uncovered behavior
distinctly.

## Quality bar

A future agent using the skill should be able to answer, from the skill and the
routed source files:

- Where is this behavior owned?
- Is the requested surface public, a hook, runtime-internal, DOM-coupled, or a
  wire/storage contract?
- Which files and consumers must change together?
- Which compatibility and Hoon type risks apply?
- Which exact checks establish that the change works?

The skill must not imply that changing one layer is sufficient when another
layer consumes the same contract. It must not invent APIs, consumers, tests,
or guarantees absent from source.

Initialize the skill with the bundled skill-creator tooling if useful. Validate
the finished skill with:

```bash
python3 /home/nativeplanet/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .agents/skills/urui-protocol
```

Also check every referenced local path, verify that all conditional references
are reachable from `SKILL.md`, inspect the final tree, and report the files
created plus any implementation or test ambiguity the skill explicitly
records.

#!/usr/bin/env python3
"""Validate an agent skill against the Agent Skills spec plus the practical
rules in skill-writer/SKILL.md.

Usage:
    python scripts/validate_skill.py path/to/skill-directory

Exits 1 if any ERROR is found, 0 otherwise. WARNs are judgement calls, not
spec violations - read them, then decide.

Standard library only; no third-party YAML parser required.
"""

import os
import re
import sys

SPEC_FIELDS = {
    "name",
    "description",
    "license",
    "compatibility",
    "metadata",
    "allowed-tools",
}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
RESOURCE_DIRS = ("references", "scripts", "assets")

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def split_frontmatter(text):
    """Return (frontmatter_text, body_text) or (None, text) if absent."""
    if not text.startswith("---"):
        return None, text
    end = re.search(r"^---\s*$", text[3:], re.M)
    if not end:
        return None, text
    return text[3 : 3 + end.start()], text[3 + end.end() :]


def parse_frontmatter(fm):
    """Minimal YAML subset: top-level `key: value`, block scalars (>, |),
    and one level of nesting under a key. Enough for skill frontmatter."""
    top = {}
    nested = {}
    current_key = None
    block_indent = None
    lines = fm.split("\n")
    for raw in lines:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        if indent == 0:
            m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", raw)
            if not m:
                continue
            current_key, value = m.group(1), m.group(2).strip()
            block_indent = None
            if value in (">", "|", ">-", "|-", ""):
                top[current_key] = ""
                if value in (">", "|", ">-", "|-"):
                    block_indent = "pending"
            else:
                top[current_key] = strip_quotes(value)
        elif current_key:
            child = re.match(r"^\s+([A-Za-z0-9_.-]+):\s*(.*)$", raw)
            if child and block_indent is None and top.get(current_key) == "":
                nested.setdefault(current_key, {})[child.group(1)] = strip_quotes(
                    child.group(2).strip()
                )
            else:
                joiner = " " if top.get(current_key) else ""
                top[current_key] = top.get(current_key, "") + joiner + raw.strip()
    return top, nested


def strip_quotes(v):
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return v[1:-1]
    return v


def strip_code_fences(body):
    out, in_fence = [], False
    for line in body.split("\n"):
        if re.match(r"^\s*(```|~~~)", line):
            in_fence = not in_fence
            continue
        if not in_fence:
            out.append(line)
    return "\n".join(out)


def find_refs(text):
    pattern = re.compile(r"(?:%s)/[\w.\-/]+\.[\w]+" % "|".join(RESOURCE_DIRS))
    return set(pattern.findall(text))


def main(skill_dir):
    skill_dir = os.path.abspath(skill_dir.rstrip("/"))
    dir_name = os.path.basename(skill_dir)

    if not os.path.isdir(skill_dir):
        err(f"{skill_dir} is not a directory")
        return report()

    skill_md = os.path.join(skill_dir, "SKILL.md")
    if not os.path.isfile(skill_md):
        err("no SKILL.md in the skill directory (required)")
        return report()

    text = open(skill_md, encoding="utf-8").read()
    fm, body = split_frontmatter(text)

    if fm is None:
        err("SKILL.md has no YAML frontmatter delimited by --- ... ---")
        top, nested = {}, {}
    else:
        top, nested = parse_frontmatter(fm)

    # --- name ---
    name = top.get("name")
    if not name:
        err("frontmatter is missing the required `name` field")
    else:
        if not NAME_RE.match(name):
            err(
                f"`name: {name}` is invalid - use lowercase a-z, 0-9 and single "
                "hyphens only, with no leading or trailing hyphen"
            )
        if len(name) > 64:
            err(f"`name` is {len(name)} chars; the limit is 64")
        if name != dir_name:
            err(f"`name: {name}` does not match the directory name `{dir_name}`")

    # --- description ---
    desc = top.get("description")
    if not desc:
        err("frontmatter is missing the required `description` field")
    else:
        if len(desc) > 1024:
            err(f"`description` is {len(desc)} chars; the limit is 1024")
        if len(desc) < 80:
            warn(
                f"`description` is only {len(desc)} chars - short descriptions "
                "under-trigger. Say what it does AND when to use it."
            )
        if not re.search(r"\buse\b|\bwhen\b|\btrigger\b", desc, re.I):
            warn(
                "`description` never says *when* to use the skill - add "
                "'Use when ...' phrasing and concrete trigger contexts"
            )
        if name and desc.strip().lower().startswith(name.replace("-", " ")):
            warn("`description` opens by restating the name; lead with the scenario")

    # --- other fields ---
    for key in top:
        if key not in SPEC_FIELDS:
            err(
                f"`{key}` is not a spec field - nest it under `metadata:` "
                "(some harnesses reject unknown top-level keys)"
            )
    compat = top.get("compatibility")
    if compat and len(compat) > 500:
        err(f"`compatibility` is {len(compat)} chars; the limit is 500")

    # --- body size ---
    body_lines = len([l for l in body.split("\n")])
    approx_tokens = len(body) // 4
    if body_lines > 500:
        err(
            f"SKILL.md body is {body_lines} lines (limit ~500) - split detail "
            "into references/ with an explicit load trigger per file"
        )
    elif body_lines > 400:
        warn(f"SKILL.md body is {body_lines} lines - approaching the ~500 line limit")
    if approx_tokens > 5000:
        err(
            f"SKILL.md body is ~{approx_tokens} tokens (limit ~5000); this "
            "loads in full on every activation"
        )
    elif approx_tokens > 4000:
        warn(f"SKILL.md body is ~{approx_tokens} tokens - approaching the ~5000 limit")

    # --- gotchas ---
    if not re.search(r"^#{1,6}\s+.*gotcha", body, re.I | re.M):
        warn(
            "no Gotchas section in SKILL.md - the non-obvious corrections are "
            "usually a skill's highest-value content"
        )

    # --- bundled resources vs references in the body ---
    body_refs = find_refs(strip_code_fences(body))
    on_disk = set()
    for d in RESOURCE_DIRS:
        full = os.path.join(skill_dir, d)
        if not os.path.isdir(full):
            continue
        for root, _dirs, files in os.walk(full):
            for f in files:
                if f.startswith("."):
                    continue
                rel = os.path.relpath(os.path.join(root, f), skill_dir)
                on_disk.add(rel.replace(os.sep, "/"))

    for ref in sorted(body_refs - on_disk):
        warn(f"SKILL.md points to `{ref}`, which does not exist (or is illustrative)")
    for f in sorted(on_disk - body_refs):
        warn(f"`{f}` exists but is never referenced from SKILL.md - dead weight")

    # --- reference chains and misplaced gotchas ---
    for f in sorted(on_disk):
        if not f.startswith("references/") or not f.endswith(".md"):
            continue
        content = strip_code_fences(
            open(os.path.join(skill_dir, f), encoding="utf-8").read()
        )
        for chained in find_refs(content):
            if chained.startswith("references/") and chained != f:
                warn(
                    f"`{f}` points to `{chained}` - keep references one level "
                    "deep from SKILL.md rather than chaining them"
                )
        if re.search(r"^#{1,6}\s+.*gotcha", content, re.I | re.M):
            warn(
                f"`{f}` contains a Gotchas section - gotchas belong inline in "
                "SKILL.md, since the agent can't know to load them"
            )

    # --- dangling anchors into reference files ---
    for anchor_ref in re.findall(
        r"((?:%s)/[\w.\-]+\.md)#([\w-]+)" % "|".join(RESOURCE_DIRS), body
    ):
        path, anchor = anchor_ref
        full = os.path.join(skill_dir, path)
        if not os.path.isfile(full):
            continue
        heads = [
            re.sub(r"[^a-z0-9 -]", "", h.lower()).strip().replace(" ", "-")
            for h in re.findall(
                r"^#+\s+(.*)$", open(full, encoding="utf-8").read(), re.M
            )
        ]
        if anchor not in heads:
            warn(f"`{path}#{anchor}` - no heading in that file matches the anchor")

    return report(name or dir_name)


def report(label=""):
    for e in errors:
        print(f"ERROR  {e}")
    for w in warnings:
        print(f"WARN   {w}")
    if not errors and not warnings:
        print(f"OK     {label}: no issues found")
    else:
        print(f"\n{len(errors)} error(s), {len(warnings)} warning(s) for {label}")
    return 1 if errors else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))

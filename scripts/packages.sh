#!/usr/bin/env bash
# Bash view of scripts/packages.json, the one table describing the workspace packages.
# Sourced by update.sh and test-and-bump.sh; not executable on its own.
#
# Keys are commit scopes, which are also the package directory names. A package lists the
# examples it ships — a package may have more than one — and each example declares where it
# keeps its Medusa app (`medusa/` for most, `apps/backend/` for a monorepo one) and which
# integration-tests workspace covers it. The JS scripts read the same file, so a package is
# declared once. An example that is not listed is skipped, loudly.

PACKAGES_JSON="$(dirname "${BASH_SOURCE[0]}")/packages.json"

declare -A PACKAGE_DIR EXAMPLE_DIR EXAMPLE_APP EXAMPLE_IT
while IFS=$'\t' read -r kind name dir app it; do
    case "$kind" in
        pkg)
            PACKAGE_DIR[$name]=$dir
            ;;
        example)
            EXAMPLE_DIR[$name]=$dir
            EXAMPLE_APP[$name]=$app
            EXAMPLE_IT[$name]=$it
            ;;
    esac
done < <(node -e '
const fs = require("node:fs");
const path = require("node:path");
const table = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
for (const [scope, entry] of Object.entries(table)) {
  console.log(["pkg", scope, entry.dir].join("\t"));
  for (const example of entry.examples ?? []) {
    const name = path.basename(example.dir);
    console.log(["example", name, example.dir, example.app, example.it].join("\t"));
  }
}
' "$PACKAGES_JSON")

if [ ${#PACKAGE_DIR[@]} -eq 0 ]; then
    echo "packages.sh: could not read $PACKAGES_JSON" >&2
    return 1 2>/dev/null || exit 1
fi

# Echo the subdirectory holding an example's Medusa app, or fail when it is not declared
example_app() {
    local example=$1
    local app="${EXAMPLE_APP[$example]:-}"
    if [ -z "$app" ]; then
        echo "packages.sh: unknown example '$example' — add it to packages.json" >&2
        return 1
    fi
    echo "$app"
}

# Echo the integration-tests workspace covering an example, or fail when it is not declared
example_it() {
    local example=$1
    local it="${EXAMPLE_IT[$example]:-}"
    if [ -z "$it" ]; then
        echo "packages.sh: unknown example '$example' — add it to packages.json" >&2
        return 1
    fi
    echo "$it"
}

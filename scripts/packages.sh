#!/usr/bin/env bash
# Bash view of scripts/packages.json, the one table describing the workspace packages.
# Sourced by update.sh and test-and-bump.sh; not executable on its own.
#
# Keys are commit scopes, which are also the package directory names. A package lists the
# examples it ships — a package may have more than one — and each example declares its
# directory and the integration-tests workspace covering it. Where the example keeps its
# Medusa app is not declared: update.sh finds it by the medusa-config next to a package.json.
# The JS scripts read the same file, so a package is declared once. An example that is not
# listed is skipped, loudly.

PACKAGES_JSON="$(dirname "${BASH_SOURCE[0]}")/packages.json"

declare -A PACKAGE_DIR EXAMPLE_DIR EXAMPLE_IT
while IFS=$'\t' read -r kind name dir it; do
    case "$kind" in
        pkg)
            PACKAGE_DIR[$name]=$dir
            ;;
        example)
            EXAMPLE_DIR[$name]=$dir
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
    console.log(["example", name, example.dir, example.it].join("\t"));
  }
}
' "$PACKAGES_JSON")

if [ ${#PACKAGE_DIR[@]} -eq 0 ]; then
    echo "packages.sh: could not read $PACKAGES_JSON" >&2
    return 1 2>/dev/null || exit 1
fi

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

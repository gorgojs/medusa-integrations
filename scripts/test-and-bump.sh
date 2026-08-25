#!/usr/bin/env bash
set -uo pipefail

: "${TARGET_VERSION:?TARGET_VERSION is required}"
: "${OUTDATED_PACKAGES:?OUTDATED_PACKAGES is required}"

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/stdout}"

# The package table, shared with update.sh and the JS scripts
# shellcheck source=./packages.sh
source "$(dirname "${BASH_SOURCE[0]}")/packages.sh"

chmod +x ./scripts/update.sh

IFS=',' read -ra PACKAGES <<< "$OUTDATED_PACKAGES"

BUMPED=()
FAILED=()

for package in "${PACKAGES[@]}"; do
  [ -z "$package" ] && continue
  example="${package#medusa-}"
  if ! it=$(example_it "$example"); then
    echo "::warning title=Medusa update::No integration-tests workspace mapped for '${example}'"
    FAILED+=("$example")
    continue
  fi
  echo "::group::update.sh ${example}"
  if ./scripts/update.sh "$TARGET_VERSION" "$example" --single --skip-build; then
    BUMPED+=("$example")
  else
    echo "::warning title=Medusa update::Failed to bump '${example}' to v${TARGET_VERSION}"
    git checkout -- "examples/${example}" "integration-tests/${it}" 2>/dev/null || true
    FAILED+=("$example")
  fi
  echo "::endgroup::"
done

rm -f yarn.lock
corepack yarn install --no-immutable

PASSED=()
for example in "${BUMPED[@]}"; do
  it=$(example_it "$example")
  echo "::group::test ${example}"
  if corepack yarn turbo run test:unit test:integration:http test:integration:modules \
       --filter="@gorgo/it-${it}" --concurrency=1 --no-cache --force; then
    PASSED+=("$example")
  else
    echo "::warning title=Medusa update::Tests failed for '${example}' on v${TARGET_VERSION}"
    git checkout -- "examples/${example}" "integration-tests/${it}" 2>/dev/null || true
    FAILED+=("$example")
  fi
  echo "::endgroup::"
done

if [ ${#FAILED[@]} -gt 0 ]; then
  rm -f yarn.lock
  corepack yarn install --no-immutable
fi

mkdir -p .badges
for example in "${PASSED[@]}"; do
  cat > ".badges/medusa-${example}.json" <<JSON
{
  "schemaVersion": 1,
  "label": "Tested with Medusa",
  "message": "v${TARGET_VERSION}",
  "color": "green"
}
JSON
done

echo "commit_scope=$(IFS=,; echo "${PASSED[*]}")" >> "$GITHUB_OUTPUT"
if [ ${#PASSED[@]} -gt 0 ]; then
  echo "has_passed=true" >> "$GITHUB_OUTPUT"
else
  echo "has_passed=false" >> "$GITHUB_OUTPUT"
fi

RUN_URL=""
if [ -n "${GITHUB_RUN_ID:-}" ]; then
  RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID}"
fi

{
  echo "pr_body<<__PR_BODY_EOF__"
  echo "Automated daily Medusa update to **v${TARGET_VERSION}**."
  echo ""
  if [ ${#PASSED[@]} -gt 0 ]; then
    echo "> [!TIP]"
    echo "> Updated and tested on Medusa v${TARGET_VERSION}:"
    for example in "${PASSED[@]}"; do echo "> - \`${example}\`"; done
    echo ""
  fi
  if [ ${#FAILED[@]} -gt 0 ]; then
    echo "> [!CAUTION]"
    if [ -n "$RUN_URL" ]; then
      echo "> Tests failed on Medusa v${TARGET_VERSION} — excluded from this PR. See the [run log](${RUN_URL})."
    else
      echo "> Tests failed on Medusa v${TARGET_VERSION} — excluded from this PR."
    fi
    for example in "${FAILED[@]}"; do echo "> - **${example}**"; done
    echo ""
  fi
  echo "__PR_BODY_EOF__"
} >> "$GITHUB_OUTPUT"

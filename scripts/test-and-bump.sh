#!/usr/bin/env bash
set -uo pipefail

: "${TARGET_VERSION:?TARGET_VERSION is required}"
: "${OUTDATED_PACKAGES:?OUTDATED_PACKAGES is required}"

GITHUB_OUTPUT="${GITHUB_OUTPUT:-/dev/stdout}"

# The package table, shared with update.sh and the JS scripts
# shellcheck source=./packages.sh
source "$(dirname "${BASH_SOURCE[0]}")/packages.sh"

chmod +x ./scripts/update.sh

IFS=',' read -ra BADGES <<< "$OUTDATED_PACKAGES"

revert_example() {
  local example=$1 it
  it=$(example_it "$example" 2>/dev/null) || it=""
  git checkout -- "examples/${example}" 2>/dev/null || true
  [ -n "$it" ] && git checkout -- "integration-tests/${it}" 2>/dev/null || true
  return 0
}

PACKAGES=()
declare -A TARGET_EXAMPLES=()
declare -A BROKEN=()
declare -A TESTED=()

for badge in "${BADGES[@]}"; do
  [ -z "$badge" ] && continue
  package="${badge#medusa-}"
  PACKAGES+=("$package")
  if examples=$(package_examples "$package"); then
    TARGET_EXAMPLES[$package]="$examples"
  else
    echo "::warning title=Medusa update::No example declared for package '${package}'"
    TARGET_EXAMPLES[$package]=""
    BROKEN[$package]=1
  fi
done

BUMPED=()

for package in "${PACKAGES[@]}"; do
  for example in ${TARGET_EXAMPLES[$package]}; do
    if ! it=$(example_it "$example"); then
      echo "::warning title=Medusa update::No integration-tests workspace mapped for '${example}'"
      BROKEN[$package]=1
      continue
    fi
    echo "::group::update.sh ${example}"
    if ./scripts/update.sh "$TARGET_VERSION" "$example" --single --skip-build; then
      BUMPED+=("${package}:${example}")
    else
      echo "::warning title=Medusa update::Failed to bump '${example}' to v${TARGET_VERSION}"
      revert_example "$example"
      BROKEN[$package]=1
    fi
    echo "::endgroup::"
  done
done

rm -f yarn.lock
corepack yarn install --no-immutable

for pair in "${BUMPED[@]}"; do
  package="${pair%%:*}"
  example="${pair#*:}"
  it=$(example_it "$example")
  echo "::group::test ${example}"
  if corepack yarn turbo run test:unit test:integration:http test:integration:modules \
       --filter="@gorgo/it-${it}" --concurrency=1 --no-cache --force; then
    TESTED[$package]=1
  else
    echo "::warning title=Medusa update::Tests failed for '${example}' on v${TARGET_VERSION}"
    revert_example "$example"
    BROKEN[$package]=1
  fi
  echo "::endgroup::"
done

PASSED=()
FAILED=()
for package in "${PACKAGES[@]}"; do
  if [ -z "${BROKEN[$package]:-}" ] && [ -n "${TESTED[$package]:-}" ]; then
    PASSED+=("$package")
  else
    FAILED+=("$package")
    for example in ${TARGET_EXAMPLES[$package]}; do
      revert_example "$example"
    done
  fi
done

if [ ${#FAILED[@]} -gt 0 ]; then
  rm -f yarn.lock
  corepack yarn install --no-immutable
fi

mkdir -p .badges
for package in "${PASSED[@]}"; do
  cat > ".badges/medusa-${package}.json" <<JSON
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
    for package in "${PASSED[@]}"; do echo "> - \`${package}\`"; done
    echo ""
  fi
  if [ ${#FAILED[@]} -gt 0 ]; then
    echo "> [!CAUTION]"
    if [ -n "$RUN_URL" ]; then
      echo "> Tests failed on Medusa v${TARGET_VERSION} — excluded from this PR. See the [run log](${RUN_URL})."
    else
      echo "> Tests failed on Medusa v${TARGET_VERSION} — excluded from this PR."
    fi
    for package in "${FAILED[@]}"; do echo "> - **${package}**"; done
    echo ""
  fi
  echo "__PR_BODY_EOF__"
} >> "$GITHUB_OUTPUT"

function aliasFor(sha) {
  return `c_${sha}`;
}

function buildQuery(repo, shas) {
  const [owner, name] = repo.split('/');
  const fields = shas
    .map(
      (sha) =>
        `${aliasFor(sha)}: object(expression: ${JSON.stringify(sha)}) { ... on Commit { author { user { login } } } }`,
    )
    .join('\n');
  return `query { repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${fields} } }`;
}

export async function resolveCommitAuthors(
  shas,
  { repo, token, chunkSize = 200 } = {},
) {
  const map = new Map();
  const unique = [...new Set(shas)].filter(Boolean);
  if (!unique.length) return map;
  if (!token)
    throw new Error('GITHUB_TOKEN is required to resolve commit authors');

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: buildQuery(repo, chunk) }),
    });
    if (!res.ok)
      throw new Error(`GitHub GraphQL ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors)
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(json.errors)}`);
    const repository = json.data?.repository ?? {};
    for (const sha of chunk) {
      const login = repository[aliasFor(sha)]?.author?.user?.login ?? null;
      map.set(sha, login && login.includes('[bot]') ? null : login);
    }
  }
  return map;
}

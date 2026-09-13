// ponytail: stdlib fetch only, no @actions/* deps.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.github.com';

function api(path, token, init = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
}

// ponytail: exported pure for a runnable check, IO stays in main.
export function labelsFor(filenames, isPR) {
  const labels = ['needs-triage'];
  if (!isPR) return labels;
  if (filenames.some((n) => n.startsWith('packages/core/'))) labels.push('area:core');
  if (filenames.some((n) => n.startsWith('packages/common/'))) labels.push('area:common');
  if (filenames.some((n) => n.startsWith('packages/ux/'))) labels.push('area:ux');
  if (filenames.some((n) => n.startsWith('packages/cli/'))) labels.push('area:cli');
  if (filenames.some((n) => n.startsWith('apps/'))) labels.push('area:example');
  return labels;
}

async function prFiles(owner, repo, num, token) {
  const names = [];
  let page = 1;
  for (;;) {
    const res = await api(
      `/repos/${owner}/${repo}/pulls/${num}/files?per_page=100&page=${page}`,
      token,
    );
    if (!res.ok) throw new Error(`list files failed: ${res.status}`);
    const files = await res.json();
    if (files.length === 0) break;
    for (const f of files) names.push(f.filename);
    if (files.length < 100) break;
    page++;
  }
  return names;
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const num = event.issue?.number ?? event.pull_request?.number;
  const isPR = event.pull_request !== undefined;
  const files = isPR ? await prFiles(owner, repo, num, token) : [];
  const res = await api(`/repos/${owner}/${repo}/issues/${num}/labels`, token, {
    method: 'POST',
    body: JSON.stringify({ labels: labelsFor(files, isPR) }),
  });
  if (!res.ok) throw new Error(`add labels failed: ${res.status}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

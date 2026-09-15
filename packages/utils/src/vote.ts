/** top.gg webhook bodies carry the voter id in `user`. Anything else is not a vote. */
// ponytail: no signature check here. Webhook secrets live at the HTTP
// layer, which is app-side; verify before calling awardVote.
export function parseVotePayload(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const user = (body as Record<string, unknown>)['user'];
  return typeof user === 'string' && user.length > 0 ? user : null;
}

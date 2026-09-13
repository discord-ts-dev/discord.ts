// ponytail: sample codemod, proves the runner. Real AST pass only if regex falls short.
export function transform(
  source: string,
  _path: string,
  args: Record<string, string>,
): string | null {
  const { from, to } = args;
  if (!from || !to) throw new Error('rename-identifier needs --from X --to Y');
  const re = new RegExp(`\\b${from}\\b`, 'g');
  return re.test(source) ? source.replace(re, to) : null;
}

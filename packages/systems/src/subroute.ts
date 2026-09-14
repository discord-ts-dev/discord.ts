export interface Subroute {
  route: string;
  rest: string[];
}

/** `quest rr 2` with routes [rr, lock] -> { route: rr, rest: [2] }. First token only. */
export function splitSubroute(args: string[], routes: string[]): Subroute | null {
  if (args.length === 0) return null;
  const first = (args[0] as string).toLowerCase();
  const route = routes.find((r) => r.toLowerCase() === first);
  return route === undefined ? null : { route, rest: args.slice(1) };
}

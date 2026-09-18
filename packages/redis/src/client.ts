/** Options forwarded to Bun's RedisClient when RedisStore builds one. */
export type RedisClientOptions = NonNullable<ConstructorParameters<typeof Bun.RedisClient>[1]>;

/**
 * The Redis surface RedisStore depends on. Bun's RedisClient satisfies it at
 * runtime; implementers must answer zrange WITHSCORES with [member, score]
 * pairs, like Redis does.
 */
export interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
  del(key: string): Promise<unknown>;
  zadd(key: string, score: number, member: string): Promise<unknown>;
  zrange(key: string, start: number, stop: number, ...options: string[]): Promise<unknown>;
  zrank(key: string, member: string): Promise<number | null>;
  zscore(key: string, member: string): Promise<number | null>;
  zincrby(key: string, amount: number, member: string): Promise<unknown>;
  send(command: string, args: string[]): Promise<unknown>;
  close(): unknown;
}

import type {
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildMember,
  Message,
  User,
} from 'discord.js';

export type CommandSource = ChatInputCommandInteraction | Message;
export type ReplyInput =
  | string
  | {
      content?: string;
      embeds?: unknown[];
      components?: unknown[];
      ephemeral?: boolean;
    };

// ponytail: structural wrapper, no DI. Raw union keeps working; opt in per param type.
export class CommandContext {
  private lastMessage: Message | null = null;

  constructor(private readonly source: CommandSource) {}

  get kind(): 'slash' | 'prefix' {
    return 'author' in this.source ? 'prefix' : 'slash';
  }

  get isSlash(): boolean {
    return this.kind === 'slash';
  }

  get user(): User {
    return 'author' in this.source ? this.source.author : this.source.user;
  }

  get member(): GuildMember | null {
    return this.source.member as GuildMember | null;
  }

  get guild(): Guild | null {
    return (this.source.guild as Guild | null) ?? null;
  }

  get guildId(): string | null {
    return this.guild?.id ?? null;
  }

  get channel(): CommandSource['channel'] {
    return this.source.channel;
  }

  get channelId(): string {
    return this.source.channelId;
  }

  get client(): Client {
    return this.source.client as Client;
  }

  get createdTimestamp(): number {
    return this.source.createdTimestamp;
  }

  get content(): string | null {
    return 'content' in this.source ? (this.source.content as string) : null;
  }

  get voiceChannelId(): string | null {
    return this.member?.voice?.channelId ?? null;
  }

  get replied(): boolean {
    if ('author' in this.source) return this.lastMessage !== null;
    const ix = this.source as ChatInputCommandInteraction;
    return ix.replied || ix.deferred;
  }

  get deferred(): boolean {
    if ('author' in this.source) return false;
    return (this.source as ChatInputCommandInteraction).deferred;
  }

  async reply(input: ReplyInput): Promise<Message> {
    const payload = typeof input === 'string' ? { content: input } : { ...input };
    if ('author' in this.source) {
      // ponytail: ephemeral/fetchReply have no prefix meaning, drop them rather than fail
      const { ephemeral: _drop, fetchReply: _fetch, ...rest } = payload as Record<string, unknown>;
      void _drop;
      void _fetch;
      const msg = (await (this.source as Message).reply(rest as never)) as Message;
      this.lastMessage = msg;
      return msg;
    }
    const ix = this.source as ChatInputCommandInteraction;
    if (ix.replied || ix.deferred) return this.followUp(payload);
    const msg = (await ix.reply({ ...payload, fetchReply: true } as never)) as unknown as Message;
    this.lastMessage = msg;
    return msg;
  }

  // ponytail: prefix defer is sendTyping at best, never throws
  async defer(ephemeral?: boolean): Promise<void> {
    if ('author' in this.source) {
      try {
        await (
          this.source.channel as { sendTyping?: () => Promise<unknown> } | null
        )?.sendTyping?.();
      } catch {
        // ignore, handler proceeds
      }
      return;
    }
    await (this.source as ChatInputCommandInteraction).deferReply({ ephemeral });
  }

  async editReply(input: ReplyInput): Promise<Message> {
    const payload = typeof input === 'string' ? { content: input } : { ...input };
    if ('author' in this.source) {
      if (this.lastMessage) return (await this.lastMessage.edit(payload as never)) as Message;
      return this.reply(payload);
    }
    return (await (this.source as ChatInputCommandInteraction).editReply(
      payload as never,
    )) as unknown as Message;
  }

  async followUp(input: ReplyInput): Promise<Message> {
    const payload = typeof input === 'string' ? { content: input } : { ...input };
    if ('author' in this.source) return this.reply(payload);
    return (await (this.source as ChatInputCommandInteraction).followUp(
      payload as never,
    )) as Message;
  }

  unwrap(): CommandSource {
    return this.source;
  }
}

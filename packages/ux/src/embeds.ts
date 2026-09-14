import { EmbedBuilder } from 'discord.js';

// ponytail: one error style everywhere. Success embeds stay per-feature (color varies).
export function errorEmbed(text: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Something went wrong')
    .setDescription(text)
    .setColor(0xed4245);
}

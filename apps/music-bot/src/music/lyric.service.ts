import { Injectable } from '@discord.ts/common';

export interface LyricsResult {
  title: string;
  url: string | null;
  thumbnail: string | null;
  pages: string[];
}

/**
 * Strip Genius lyric markup to plain text. Tag removal runs to a fixpoint so
 * no `<tag` fragment survives, and `&amp;` decodes last so entities are
 * decoded exactly once (output goes to Discord embeds, never a browser).
 */
export function stripLyricsHtml(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div)>/gi, '\n');
  let prev = '';
  let text = withBreaks;
  while (text !== prev) {
    prev = text;
    text = text.replace(/<[^<>]*>?/g, '');
  }
  return text
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_match, digits: string) => String.fromCharCode(Number(digits)))
    .replace(/&amp;/g, '&')
    .trim();
}

// ponytail: Genius search + container scrape without cheerio (regex strip).
// Add cheerio when selectors need to track Genius markup changes.
@Injectable()
export class LyricService {
  async find(title: string): Promise<LyricsResult | null> {
    const token = process.env.GENIUS_ACCESS_TOKEN;
    if (!token) return null;
    const hit = await this.searchHit(title, token).catch(() => null);
    if (!hit) return null;
    const pages = await this.scrape(hit.url).catch((): string[] => []);
    return { title: hit.title, url: hit.url, thumbnail: hit.thumbnail, pages };
  }

  private async searchHit(
    title: string,
    token: string,
  ): Promise<{ title: string; url: string; thumbnail: string | null } | null> {
    const res = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(title)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      response?: {
        hits?: { result?: { title?: string; url?: string; header_image_url?: string } }[];
      };
    };
    const result = body.response?.hits?.[0]?.result;
    if (!result?.url) return null;
    return {
      title: result.title ?? title,
      url: result.url,
      thumbnail: result.header_image_url ?? null,
    };
  }

  private async scrape(url: string): Promise<string[]> {
    const res = await fetch(url, { headers: { 'User-Agent': 'music-bot/0.1' } });
    if (!res.ok) return [];
    const html = await res.text();
    const containers = [
      ...html.matchAll(/<div[^>]*data-lyrics-container="true"[^>]*>(.*?)<\/div>/gs),
    ].map((m) => m[1] ?? '');
    const text = containers
      .map((part) => stripLyricsHtml(part))
      .join('\n')
      .trim();
    if (!text) return [];
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 1800) chunks.push(text.slice(i, i + 1800));
    return chunks;
  }
}

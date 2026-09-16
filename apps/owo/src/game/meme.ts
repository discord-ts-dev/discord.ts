import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';

export type MemeLayout = 'stack' | 'versus' | 'grid';

export interface MemeTemplate {
  id: string;
  name: string;
  /** How many text slots the layout needs. */
  slots: number;
  layout: MemeLayout;
  background: string;
  panel: string;
  text: string;
}

// ponytail: own drawn panels, no copied meme art. Clean room means these are
// plain colored strips with captions; swap in licensed art if ever needed.
export const TEMPLATES: MemeTemplate[] = [
  {
    id: 'caption',
    name: 'Caption',
    slots: 1,
    layout: 'stack',
    background: '#111111',
    panel: '#1f1f1f',
    text: '#ffffff',
  },
  {
    id: 'drake',
    name: 'Two panels',
    slots: 2,
    layout: 'stack',
    background: '#101820',
    panel: '#e74c3c',
    text: '#ffffff',
  },
  {
    id: 'distracted',
    name: 'Distracted',
    slots: 2,
    layout: 'stack',
    background: '#101820',
    panel: '#3498db',
    text: '#ffffff',
  },
  {
    id: 'tradeoffer',
    name: 'Trade offer',
    slots: 2,
    layout: 'stack',
    background: '#101820',
    panel: '#27ae60',
    text: '#ffffff',
  },
  {
    id: 'isthisa',
    name: 'Is this a',
    slots: 2,
    layout: 'stack',
    background: '#f5f6fa',
    panel: '#dcdde1',
    text: '#2f3640',
  },
  {
    id: 'eject',
    name: 'Eject',
    slots: 2,
    layout: 'stack',
    background: '#101820',
    panel: '#e67e22',
    text: '#ffffff',
  },
  {
    id: 'versus',
    name: 'Versus',
    slots: 2,
    layout: 'versus',
    background: '#101820',
    panel: '#8e44ad',
    text: '#ffffff',
  },
  {
    id: 'banner',
    name: 'Banner',
    slots: 2,
    layout: 'stack',
    background: '#0f2027',
    panel: '#2c5364',
    text: '#ffffff',
  },
  {
    id: 'grid',
    name: 'Grid',
    slots: 4,
    layout: 'grid',
    background: '#101820',
    panel: '#16a085',
    text: '#ffffff',
  },
];

export function templateById(id: string): MemeTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}

/** Greedy word wrap. Overlong single words stay whole rather than looping. */
export function wrapText(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const WIDTH = 600;
const HEIGHT = 400;
const PADDING = 24;
const FONT_SIZE = 26;

function drawPanel(
  ctx: SKRSContext2D,
  template: MemeTemplate,
  texts: string[],
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = template.panel;
  ctx.fillRect(left, top, width, height);
  ctx.fillStyle = template.text;
  ctx.font = `${FONT_SIZE}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const maxChars = Math.floor((width - PADDING * 2) / (FONT_SIZE * 0.55));
  const lines = texts.flatMap((text) => wrapText(text, maxChars));
  const lineHeight = FONT_SIZE * 1.3;
  const startY = top + height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => ctx.fillText(line, left + width / 2, startY + i * lineHeight));
}

/** Render one of our drawn templates to a PNG. Null when the template is unknown or text is missing. */
export async function renderMeme(templateId: string, texts: string[]): Promise<Buffer | null> {
  const template = templateById(templateId);
  if (!template || texts.length < template.slots) return null;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const gap = 18;
  const slots = texts.slice(0, template.slots);

  if (template.layout === 'versus') {
    const panelWidth = (WIDTH - PADDING * 2 - gap) / 2;
    slots.forEach((text, i) => {
      const left = PADDING + i * (panelWidth + gap);
      drawPanel(ctx, template, [text], left, PADDING, panelWidth, HEIGHT - PADDING * 2);
    });
  } else if (template.layout === 'grid') {
    const panelWidth = (WIDTH - PADDING * 2 - gap) / 2;
    const panelHeight = (HEIGHT - PADDING * 2 - gap) / 2;
    slots.forEach((text, i) => {
      const left = PADDING + (i % 2) * (panelWidth + gap);
      const top = PADDING + Math.floor(i / 2) * (panelHeight + gap);
      drawPanel(ctx, template, [text], left, top, panelWidth, panelHeight);
    });
  } else {
    const panelHeight = (HEIGHT - PADDING * 2 - gap * (slots.length - 1)) / slots.length;
    slots.forEach((text, i) => {
      drawPanel(
        ctx,
        template,
        [text],
        PADDING,
        PADDING + i * (panelHeight + gap),
        WIDTH - PADDING * 2,
        panelHeight,
      );
    });
  }

  return canvas.toBuffer('image/png');
}

import { StringOption } from '@discord.ts/common';

export class MemeOneDto {
  @StringOption({ name: 'text', description: 'Caption text', required: true })
  text!: string;
}

export class MemeTwoDto {
  @StringOption({ name: 'first', description: 'Top panel text', required: true })
  first!: string;

  @StringOption({ name: 'second', description: 'Bottom panel text', required: true })
  second!: string;
}

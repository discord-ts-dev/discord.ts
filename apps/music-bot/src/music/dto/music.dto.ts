import { Max, Min } from 'class-validator';
import { BooleanOption, IntegerOption, StringOption } from '@discord.ts/common';

export class PlayDto {
  @StringOption({ name: 'query', description: 'Song name, URL, or ISRC', required: true })
  query!: string;
}

export class SearchDto {
  @StringOption({ name: 'query', description: 'Keywords, URL, or ISRC', required: true })
  query!: string;
}

export class SeekDto {
  @StringOption({ name: 'time', description: 'e.g. 1m30s or 90', required: true })
  time!: string;
}

export class VolumeDto {
  @IntegerOption({ name: 'level', description: '0-200', required: true })
  @Min(0)
  @Max(200)
  level!: number;
}

export class LoopDto {
  @StringOption({
    name: 'mode',
    description: 'track, queue, or off',
    required: false,
    choices: [
      { name: 'track', value: 'track' },
      { name: 'queue', value: 'queue' },
      { name: 'off', value: 'off' },
    ],
  })
  mode?: string;
}

export class RemoveDto {
  @IntegerOption({ name: 'index', description: 'Queue position (1-based)', required: true })
  @Min(1)
  index!: number;
}

export class PlaylistNameDto {
  @StringOption({ name: 'name', description: 'Playlist name', required: true })
  name!: string;
}

export class PlaylistAddDto {
  @StringOption({ name: 'name', description: 'Playlist name', required: true })
  name!: string;

  @StringOption({ name: 'song', description: 'Song name or URL', required: true })
  song!: string;
}

export class PlaylistStealDto {
  @StringOption({ name: 'user', description: 'Owner user id or mention', required: true })
  user!: string;

  @StringOption({ name: 'name', description: 'Playlist name', required: true })
  name!: string;
}

export class LyricDto {
  @StringOption({ name: 'song', description: 'Song name (default: current)', required: false })
  song?: string;
}

export class ToggleDto {
  @BooleanOption({ name: 'on', description: 'On or off (default: toggle)', required: false })
  on?: boolean;
}

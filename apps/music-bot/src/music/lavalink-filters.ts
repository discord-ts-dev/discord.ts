import { EQList, type Player } from 'lavalink-client';

// ponytail: real FilterManager payloads, split out to respect the 300-line
// file cap. Toggle semantics mirror the Shiroko filter commands.
export async function applyLiveFilter(
  player: Player,
  name: string,
  enabled: boolean,
): Promise<void> {
  const filters = player.filterManager;
  switch (name) {
    case 'bassboost':
      if (enabled) await filters.setEQ(EQList.BassboostHigh);
      else await filters.clearEQ();
      break;
    case 'nightcore':
      await filters.toggleNightcore(enabled ? 1.25 : undefined);
      break;
    case 'karaoke':
      await filters.toggleKaraoke(enabled ? 1 : undefined);
      break;
    case '8d':
    case 'rotation':
      await filters.toggleRotation(enabled ? 0.2 : undefined);
      break;
    case 'pitch':
      await filters.setPitch(enabled ? 1.2 : 1);
      break;
    case 'speed':
      await filters.setSpeed(enabled ? 1.25 : 1);
      break;
    case 'tremolo':
      await filters.toggleTremolo(enabled ? 4 : undefined);
      break;
    case 'vibrato':
      await filters.toggleVibrato(enabled ? 4 : undefined);
      break;
    case 'lowpass':
      await filters.toggleLowPass(enabled ? 500 : undefined);
      break;
    default:
      break;
  }
}

export async function resetLiveFilters(player: Player): Promise<void> {
  await player.filterManager.resetFilters();
}

export function describeLiveFilter(name: string): string {
  const payloads: Record<string, string> = {
    bassboost: 'EQ bassboost-high',
    nightcore: 'timescale 1.25x',
    karaoke: 'karaoke level 1',
    '8d': 'rotation 0.2Hz',
    pitch: 'pitch 1.2',
    speed: 'speed 1.25x',
    tremolo: 'tremolo 4Hz',
    vibrato: 'vibrato 4Hz',
    lowpass: 'lowpass 500Hz',
    rotation: 'rotation 0.2Hz',
  };
  return payloads[name] ?? name;
}

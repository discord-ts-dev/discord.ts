import type { Store } from '@discord.ts/systems';

export interface ChecklistItem {
  id: number;
  text: string;
  done: boolean;
}

export interface SurveyOption {
  label: string;
  votes: number;
}

// --- checklist ---

const checklistKey = (userId: string) => `checklist:${userId}`;

export async function checklistOf(store: Store, userId: string): Promise<ChecklistItem[]> {
  const raw = await store.get(checklistKey(userId));
  return raw ? (JSON.parse(raw) as ChecklistItem[]) : [];
}

export async function addChecklistItem(
  store: Store,
  userId: string,
  text: string,
): Promise<ChecklistItem[]> {
  const list = await checklistOf(store, userId);
  const nextId = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const next = [...list, { id: nextId, text, done: false }];
  await store.set(checklistKey(userId), JSON.stringify(next));
  return next;
}

export async function toggleChecklistItem(
  store: Store,
  userId: string,
  id: number,
): Promise<ChecklistItem[]> {
  const list = await checklistOf(store, userId);
  const next = list.map((item) => (item.id === id ? { ...item, done: !item.done } : item));
  await store.set(checklistKey(userId), JSON.stringify(next));
  return next;
}

export async function removeChecklistItem(
  store: Store,
  userId: string,
  id: number,
): Promise<ChecklistItem[]> {
  const list = (await checklistOf(store, userId)).filter((item) => item.id !== id);
  await store.set(checklistKey(userId), JSON.stringify(list));
  return list;
}

// --- censor ---

const censorKey = (guildId: string) => `censor:${guildId}`;

export async function censoredWords(store: Store, guildId: string): Promise<string[]> {
  const raw = await store.get(censorKey(guildId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

export async function censorWord(store: Store, guildId: string, word: string): Promise<string[]> {
  const words = new Set((await censoredWords(store, guildId)).map((w) => w.toLowerCase()));
  words.add(word.toLowerCase());
  const next = [...words];
  await store.set(censorKey(guildId), JSON.stringify(next));
  return next;
}

export async function uncensorWord(store: Store, guildId: string, word: string): Promise<string[]> {
  const next = (await censoredWords(store, guildId)).filter(
    (w) => w.toLowerCase() !== word.toLowerCase(),
  );
  await store.set(censorKey(guildId), JSON.stringify(next));
  return next;
}

// --- survey ---

export interface SurveyState {
  question: string;
  options: SurveyOption[];
}

const surveyKey = (surveyId: string) => `survey:${surveyId}`;

export async function surveyOf(store: Store, surveyId: string): Promise<SurveyState | null> {
  const raw = await store.get(surveyKey(surveyId));
  return raw ? (JSON.parse(raw) as SurveyState) : null;
}

export async function startSurvey(
  store: Store,
  surveyId: string,
  question: string,
  labels: string[],
): Promise<SurveyState> {
  const state: SurveyState = { question, options: labels.map((label) => ({ label, votes: 0 })) };
  await store.set(surveyKey(surveyId), JSON.stringify(state));
  return state;
}

export async function voteSurvey(
  store: Store,
  surveyId: string,
  optionIndex: number,
): Promise<SurveyState | null> {
  const state = await surveyOf(store, surveyId);
  if (!state || optionIndex < 0 || optionIndex >= state.options.length) return null;
  state.options[optionIndex] = {
    ...(state.options[optionIndex] as SurveyOption),
    votes: (state.options[optionIndex] as SurveyOption).votes + 1,
  };
  await store.set(surveyKey(surveyId), JSON.stringify(state));
  return state;
}

// --- rules ---

const rulesKey = (guildId: string) => `rules:${guildId}`;

export async function rulesOf(store: Store, guildId: string): Promise<string | null> {
  return store.get(rulesKey(guildId));
}

export async function setRules(store: Store, guildId: string, text: string): Promise<void> {
  await store.set(rulesKey(guildId), text);
}

// --- broadcast ---

// ponytail: whole-array write per change. One write per guild setup, not per
// message; a SQL index replaces this when guilds number in the thousands.
const announceKey = (guildId: string) => `announce:${guildId}`;
const ANNOUNCE_ALL = 'announce:all';

export async function announceChannelOf(store: Store, guildId: string): Promise<string | null> {
  return store.get(announceKey(guildId));
}

export async function setAnnounceChannel(
  store: Store,
  guildId: string,
  channelId: string | null,
): Promise<void> {
  if (channelId === null) {
    await store.del(announceKey(guildId));
    const guilds = (await announceGuilds(store)).filter((id) => id !== guildId);
    await store.set(ANNOUNCE_ALL, JSON.stringify(guilds));
    return;
  }
  await store.set(announceKey(guildId), channelId);
  const guilds = new Set(await announceGuilds(store));
  guilds.add(guildId);
  await store.set(ANNOUNCE_ALL, JSON.stringify([...guilds]));
}

export async function announceGuilds(store: Store): Promise<string[]> {
  const raw = await store.get(ANNOUNCE_ALL);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

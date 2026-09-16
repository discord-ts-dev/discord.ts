# CONTEXT.md — owo

Paw: a clean-room clone of the OwO Bot game loop on discord.ts. Collect animals, earn pawcoins, keep a zoo.

## Terms

**Paw**:
The bot. Tribute to OwO Bot, no code, data, or names copied.
_Avoid_: OwO, owo-bot

**Pawcoins**:
The single currency. Earned from hunting and the daily claim, spent in the shop.
_Avoid_: cowoncy, coins, money

**Hunt**:
The command where a user catches one random animal. Costs nothing, has a cooldown.
_Avoid_: catch, fish

**Animal**:
A species in the roster. In v1 users hold a count per species, not instances.
_Avoid_: pet, creature

**Pet**:
An instanced animal with stats, reserved for the battle milestone. Not in v1.
_Avoid_: animal, companion

**Zoo**:
A user's per-species animal counts, shown by the zoo and profile commands.
_Avoid_: collection, dex, inventory

**Roster**:
The finite list of animals with rarity tiers and sell prices.
_Avoid_: catalog, dex

**Sell**:
Turning zoo animals into pawcoins at the rarity price.
_Avoid_: trade, dump

**Dex**:
The full species checklist, caught or not.
_Avoid_: codex, catalog

**Quest**:
One daily goal drawn from the quest pool. Advanced only by its own action.
_Avoid_: mission, task

**Board**:
A ranked leaderboard. Three exist: XP, wealth, zoo size.
_Avoid_: ladder, ranking

**Lottery**:
A ticket pot. Tickets cost pawcoins, one weighted winner takes the pot on each draw.
_Avoid_: raffle, giveaway

**Toggle**:
A guild-level `enable`/`disable` for one command. Enforced by the enabled guard.
_Avoid_: switch, flag

**Owoify**:
A text transform: r and l become w, case kept. Generic uwu-speak, not OwO-specific.
_Avoid_: uwu, censor

**Drop**:
Pawcoins thrown into a channel. Exactly one claim wins within its time window.
_Avoid_: giveaway, tip

**Marriage**:
A mutual one-to-one bond. Proposed, accepted or declined, ended by divorce.
_Avoid_: wedding, couple

**Ban**:
A bot-level block on one user. Distinct from Discord guild bans.
_Avoid_: blacklist, timeout

**Battle**:
A turn-based duel between two users' strongest animals. One move per press.
_Avoid_: fight, duel

**Weapon**:
A bought item that adds attack and may carry an effect: crit, stun, or lifesteal.
_Avoid_: gear, sword

**Premium**:
Store-backed tiers (free, supporter, patron) granting daily and shop perks. Shown and granted as `/patreon`.
_Avoid_: VIP, subscription

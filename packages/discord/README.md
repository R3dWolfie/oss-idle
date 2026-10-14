# @osu-idle/discord

The osu!idle Discord bot. It gives every member who linked their Discord account
(Options → Sign in → *Link Discord account*) a role for their current
character's overall level: `Level 10+` .. `Level 90+` every 10 levels, then one
per level from 100 (`Level 100`, `Level 101`, ...). Those take the site's level
colours from `shared.css`; the ones below fade from Discord gray up to the
level 100 colour. Roles are hoisted, highest on top, made the first time someone
reaches them and deleted once nobody holds them.

- **Live:** it listens to the server's socket hub on Redis, so a play, a rebirth
  or a fresh link moves the role at once. A full pass every 15 minutes and on
  start catches the rest (unlinks, relinks, missed events).
- **Config:** reads `packages/server/.env` - the DB/Redis settings plus
  `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID`. The server needs
  `DISCORD_CLIENT_SECRET` for the linking itself.
- **Discord side:** Server Members intent on, the bot invited with *Manage
  Roles*, and its own `osu!idle` role at the top of the role list - it can only
  order roles below its own.

## Running

Prod runs it as its own systemd unit from the prod checkout
([deploy/osu-idle-discord.service](deploy/osu-idle-discord.service)):

```bash
sudo cp packages/discord/deploy/osu-idle-discord.service /etc/systemd/system/
sudo systemctl enable --now osu-idle-discord
```

It is not part of `npm run dev`: there is one Discord server, and a dev bot
reading the staging database would hand out staging levels there. To try it
locally anyway, stop the prod one first: `npm -w @osu-idle/discord start`.

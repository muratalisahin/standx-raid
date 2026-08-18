# StandX RAID

SIP question raids on the live StandX circuit: X login, 3D arena, leaderboard.

This is the game that used to live inside `standx-circuit`. The engine schematic stayed in that folder.

```bat
npm install
npm run dev
```

Open the `Local:` URL Vite prints.

For Vercel, create a **new** project from this folder. Do not point it at `standx-circuit.vercel.app` if you want Circuit to stay the schematic.

Needs the same Supabase / session env vars as before (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc. — see `.env.example`).

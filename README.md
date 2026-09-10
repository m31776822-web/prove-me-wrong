# Prove Me Wrong

Sit across from Charlie Kirk. Pick a topic. Make your case.

This repository **is the app**. Clone it, run one command, argue.

The persona is distilled from **[YixiaJack/charlie-kirk-skill](https://github.com/YixiaJack/charlie-kirk-skill)** (MIT) — public speeches, TPUSA “Prove Me Wrong” debates, *The Charlie Kirk Show*, *The MAGA Doctrine* (2020), *The College Scam* (2022). Views cutoff: September 2025.

[![Open in GitHub Codespaces](https://img.shields.io/badge/Open_in-Codespaces-black?logo=github)](https://codespaces.new/m31776822-web/prove-me-wrong)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/m31776822-web/prove-me-wrong&env=DEEPSEEK_API_KEY&envDescription=DeepSeek%20API%20key%20from%20platform.deepseek.com)

## Sit down in 30 seconds

You need [Node 18+](https://nodejs.org) and a [DeepSeek API key](https://platform.deepseek.com) (or an [xAI key](https://console.x.ai)).

```bash
git clone https://github.com/m31776822-web/prove-me-wrong.git
cd prove-me-wrong
npm start
```

Open the URL it prints. Paste your key in the page (it stays in this tab) — or put it in `.env`:

```bash
cp .env.example .env
# edit .env  →  DEEPSEEK_API_KEY=sk-...
# or          →  XAI_API_KEY=xai-...
npm start
```

Keys that start with `sk-` go to DeepSeek. Keys that start with `xai-` go to xAI.

No `npm install`. Zero dependencies. One file serves the table and talks to the model.

This is **not a static site**. Don’t open `public/index.html` in a browser, and don’t use GitHub Pages — the table needs a server so the browser never talks to the API directly.

### GitHub Codespaces

1. Click **Open in Codespaces** above (or Code → Create codespace).
2. Wait for `npm start`.
3. Open the forwarded port preview.
4. Paste a key if the environment doesn’t have `DEEPSEEK_API_KEY` or `XAI_API_KEY`.

### Vercel

Click **Deploy with Vercel**, add `DEEPSEEK_API_KEY`, sit down on the public URL.

## How it plays

1. Pick a claim — free college, guns, DEI, borders, speech, wages — or write your own.
2. He opens. You answer. Up to six rounds.
3. After three rounds, **Call it**. An independent judge scores both sides.

## Source

| | |
|---|---|
| Skill | [`YixiaJack/charlie-kirk-skill`](https://github.com/YixiaJack/charlie-kirk-skill) |
| SHA | `4b462b27afeb0db0d8a1136d64ba2b25bbf412ed` |
| License | MIT |

Charlie Kirk, 1993–2025. An AI reconstruction of his public debate style. Not the man.

export const TOPICS = [
  {
    id: "free-college",
    title: "College should be free",
    claim:
      "College is a scam inflated by government loans — making it “free” just makes taxpayers fund degrees that don’t pay.",
    blurb: "Tuition, student loans, and who really pays.",
  },
  {
    id: "guns",
    title: "The Second Amendment is outdated",
    claim:
      "The Second Amendment is not about hunting. It exists so a free people can resist a tyrannical government.",
    blurb: "Rights, tyranny, and who gets to be armed.",
  },
  {
    id: "climate",
    title: "Climate demands a wartime state",
    claim:
      "Climate policy has become a vehicle for bigger government. Follow the incentives, not the slogans.",
    blurb: "Energy, regulation, and who pays the bill.",
  },
  {
    id: "dei",
    title: "DEI makes campuses fairer",
    claim:
      "DEI is racial discrimination with better branding. Merit, not identity, is the American idea.",
    blurb: "Identity politics versus color-blind merit.",
  },
  {
    id: "borders",
    title: "Borders are cruel",
    claim:
      "A nation that cannot control its border is not a nation. Compassion without a border is a talking point, not a policy.",
    blurb: "Sovereignty, labor, and asylum.",
  },
  {
    id: "speech",
    title: "Hate speech isn’t free speech",
    claim:
      "Free speech is the last best hope of Western society. The moment you let someone define “hate,” you’ve handed them a muzzle.",
    blurb: "Campus codes, tech, and the First Amendment.",
  },
  {
    id: "wage",
    title: "Raise the minimum wage to $20",
    claim:
      "Wages are a price. When government sets the price of labor, it prices the least skilled out of a job.",
    blurb: "Jobs, prices, and who gets hurt first.",
  },
  {
    id: "loans",
    title: "Cancel student debt",
    claim:
      "The government created the college cost crisis with cheap loans. Now it wants to be the solution — by making a plumber pay for someone else’s degree.",
    blurb: "Who subsidizes whom.",
  },
];

export const KIRK_SYSTEM = `You are role-playing Charlie Kirk (1993–2025), founder of Turning Point USA, host of The Charlie Kirk Show, in a live “Prove Me Wrong” campus-table debate. Stay in first person as Kirk at the table. Do not mention that you are an AI, do not mention your assassination, and do not break character.

Identity: You dropped out of community college at 18, built TPUSA into 3,000+ campus chapters, and sit behind a table that says Prove Me Wrong. You believe in free markets, free speech, limited government, constitutional originalism, and American exceptionalism. You speak plain American English — no academic jargon.

Mental models (use them, don’t list them):
1. First principles: What did the founders intend? What does the Constitution say?
2. Prove me wrong: state a bold claim, invite challenge, hold the ground.
3. Follow the incentives: Who benefits? Who pays? Who has the power?
4. Culture is upstream of politics.
5. Government created the problem and now wants to sell the solution.

Heuristics: If it’s “free,” someone else is paying. Local government is more accountable than federal. There is no First Amendment without a Second. Universities have become islands of totalitarianism in a sea of freedom. America is the greatest nation in the history of the world. Don’t ask if it’s popular — ask if it’s right.

Style DNA:
- Openings: “Here’s the thing…”, “Let me ask you a question…”, “Name one…”
- Closings: “Prove me wrong.”, “I’ll wait.”, “That’s just a fact.”
- Rhythm: bold claim → 1–2 facts or examples → rhetorical question → challenge.
- Short, punchy, clip-ready sentences. Rapid-fire questions to put them on defense.
- Sarcastic analogies (DMV running healthcare). Reductio. Mock institutions, not the student as a person.
- Extremely high certainty. Almost never “maybe.” Never concede the moral high ground. Never let them frame the question. Define terms. Ask them to name one example.
- Signature moves: “Define it.” “Name one.” “And by the way…”

Honesty:
- Do not invent positions he never held. If a topic is outside his public record, say you haven’t spoken on that specifically, then argue from the principles above.
- You may acknowledge a specific fact if they prove it; you do not walk back the principle.
- This is one political perspective, not a neutral analyst.
- Information cutoff for his views: September 2025.

Format for every reply:
- 90–170 words. No headings, no bullets, no markdown, no emojis.
- Address the student as “you.”
- End most replies with a challenge (Prove me wrong / I’ll wait / Name one).
- Do not recap the whole debate. Hit their last point and advance yours.

Source grounding (do not cite unless asked): public speeches, campus debates, The Charlie Kirk Show, The MAGA Doctrine (2020), The College Scam (2022), distilled in YixiaJack/charlie-kirk-skill.`;

export const JUDGE_SYSTEM = `You are an independent, sharp debate adjudicator — not Charlie Kirk, not the student. Score a campus “Prove Me Wrong” exchange.

Return ONLY a JSON object with this shape:
{
  "winner": "you" | "kirk" | "draw",
  "kirkScore": number 0-100,
  "youScore": number 0-100,
  "headline": "one sentence verdict",
  "analysis": "2-4 sentences on who controlled the frame, evidence, and burden of proof",
  "kirkBest": "one sentence",
  "youBest": "one sentence",
  "kirkMiss": "one sentence",
  "youMiss": "one sentence"
}

Scoring:
- Clarity of claim
- Evidence / examples (specificity beats slogans)
- Steel-manning the other side
- Answering the actual question vs. pivoting
- Rhetoric that lands vs. Gish gallop
Do not reward volume. A practiced debater with a home-field format should not auto-win. If the student landed a real hit, say so. Be direct. No markdown. No extra keys.`;

const MAX_USER_TURNS = 6;
const MAX_USER_CHARS = 1200;

function clip(s, n) {
  const t = String(s ?? "");
  return t.length <= n ? t : t.slice(0, n);
}

async function complete(apiKey, args) {
  if (!apiKey) {
    return { ok: false, error: "Add an xAI API key to sit down. Get one at console.x.ai." };
  }

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      messages: args.messages,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      ...(args.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "That API key was refused. Check it at console.x.ai." };
    }
    return { ok: false, error: `The table went quiet (${res.status}). Try again.` };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { ok: false, error: "The table went quiet. Try again." };
  }
  const text = body.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) return { ok: false, error: "No reply came back. Try again." };
  return { ok: true, text };
}

export async function handleTurn(input, apiKey) {
  const topicTitle = clip(input.topicTitle, 160).trim();
  const topicClaim = clip(input.topicClaim, 400).trim();
  if (!topicTitle || !topicClaim) return { ok: false, error: "Pick a topic first." };

  const history = (Array.isArray(input.history) ? input.history : []).slice(-14).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: clip(m.content, 4000),
  }));
  const userTurns = history.filter((m) => m.role === "user").length;
  const rawUser = String(input.userMessage ?? "").trim();
  if (rawUser && userTurns >= MAX_USER_TURNS) {
    return { ok: false, error: "This debate is at its limit. Call it." };
  }
  const userMessage = rawUser ? clip(rawUser, MAX_USER_CHARS) : undefined;

  const convo = [{ role: "system", content: KIRK_SYSTEM }];
  if (history.length === 0 && !userMessage) {
    convo.push({
      role: "user",
      content: `A student just sat down at your Prove Me Wrong table. Topic: "${topicTitle}". Your public position: ${topicClaim}. They have not spoken yet. Deliver your opening. State the claim, give the core argument, and invite them to prove you wrong.`,
    });
  } else {
    convo.push({
      role: "user",
      content: `Table topic: "${topicTitle}". Your position: ${topicClaim}. Debate the student. Stay in character.`,
    });
    for (const turn of history) convo.push(turn);
    if (userMessage) convo.push({ role: "user", content: userMessage });
  }

  return complete(apiKey, { messages: convo, maxTokens: 420, temperature: 0.85 });
}

function asWinner(v) {
  return v === "you" || v === "kirk" || v === "draw" ? v : "draw";
}
function asScore(v) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
function asLine(v, fallback) {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? clip(s, 600) : fallback;
}

export async function handleJudge(input, apiKey) {
  const topicTitle = clip(input.topicTitle, 160).trim();
  const topicClaim = clip(input.topicClaim, 400).trim();
  const history = (Array.isArray(input.history) ? input.history : []).slice(0, 16).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: clip(m.content, 4000),
  }));
  if (history.length < 2) return { ok: false, error: "Not enough of a debate to judge." };

  const transcript = history
    .map((m) => (m.role === "assistant" ? `KIRK: ${m.content}` : `STUDENT: ${m.content}`))
    .join("\n\n");

  const result = await complete(apiKey, {
    messages: [
      { role: "system", content: JUDGE_SYSTEM },
      {
        role: "user",
        content: `Topic: ${topicTitle}\nKirk's claim: ${topicClaim}\n\nTranscript:\n${transcript}`,
      },
    ],
    maxTokens: 700,
    temperature: 0.35,
    json: true,
  });
  if (!result.ok) return result;

  let parsed = {};
  try {
    parsed = JSON.parse(result.text);
  } catch {
    return { ok: false, error: "The judge’s ballot didn’t parse. Try calling it again." };
  }

  return {
    ok: true,
    verdict: {
      winner: asWinner(parsed.winner),
      kirkScore: asScore(parsed.kirkScore),
      youScore: asScore(parsed.youScore),
      headline: asLine(parsed.headline, "The table is even."),
      analysis: asLine(parsed.analysis, "Both sides held the line."),
      kirkBest: asLine(parsed.kirkBest, "Held the frame."),
      youBest: asLine(parsed.youBest, "Showed up."),
      kirkMiss: asLine(parsed.kirkMiss, "Left a flank open."),
      youMiss: asLine(parsed.youMiss, "Let him set the terms."),
    },
  };
}

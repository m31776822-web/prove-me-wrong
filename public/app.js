const TOPICS = [
  { id: "free-college", title: "College should be free", claim: "College is a scam inflated by government loans — making it “free” just makes taxpayers fund degrees that don’t pay.", blurb: "Tuition, student loans, and who really pays." },
  { id: "guns", title: "The Second Amendment is outdated", claim: "The Second Amendment is not about hunting. It exists so a free people can resist a tyrannical government.", blurb: "Rights, tyranny, and who gets to be armed." },
  { id: "climate", title: "Climate demands a wartime state", claim: "Climate policy has become a vehicle for bigger government. Follow the incentives, not the slogans.", blurb: "Energy, regulation, and who pays the bill." },
  { id: "dei", title: "DEI makes campuses fairer", claim: "DEI is racial discrimination with better branding. Merit, not identity, is the American idea.", blurb: "Identity politics versus color-blind merit." },
  { id: "borders", title: "Borders are cruel", claim: "A nation that cannot control its border is not a nation. Compassion without a border is a talking point, not a policy.", blurb: "Sovereignty, labor, and asylum." },
  { id: "speech", title: "Hate speech isn’t free speech", claim: "Free speech is the last best hope of Western society. The moment you let someone define “hate,” you’ve handed them a muzzle.", blurb: "Campus codes, tech, and the First Amendment." },
  { id: "wage", title: "Raise the minimum wage to $20", claim: "Wages are a price. When government sets the price of labor, it prices the least skilled out of a job.", blurb: "Jobs, prices, and who gets hurt first." },
  { id: "loans", title: "Cancel student debt", claim: "The government created the college cost crisis with cheap loans. Now it wants to be the solution — by making a plumber pay for someone else’s degree.", blurb: "Who subsidizes whom." },
];

const MAX_TURNS = 6;
const MIN_JUDGE = 3;
const KEY_STORE = "prove-me-wrong:key";
const HIST_STORE = "prove-me-wrong:history";
const SKILL = "https://github.com/YixiaJack/charlie-kirk-skill";

const app = document.getElementById("app");
const state = {
  view: "lobby",
  session: null,
  history: loadHist(),
  pending: false,
  judging: false,
  error: null,
  hasServerKey: false,
  busy: false,
};

function nid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
function loadHist() {
  try {
    const raw = localStorage.getItem(HIST_STORE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
  } catch {
    return [];
  }
}
function saveHist(items) {
  localStorage.setItem(HIST_STORE, JSON.stringify(items.slice(0, 12)));
}
function getKey() {
  return sessionStorage.getItem(KEY_STORE) || "";
}
function setKey(v) {
  if (v) sessionStorage.setItem(KEY_STORE, v);
  else sessionStorage.removeItem(KEY_STORE);
}
function userTurns(msgs) {
  return msgs.filter((m) => m.role === "user").length;
}
function esc(s) {
  const a = String.fromCharCode(38);
  return String(s)
    .replaceAll(a, a + "amp;")
    .replaceAll("<", a + "lt;")
    .replaceAll(">", a + "gt;")
    .replaceAll('"', a + "quot;");
}

async function api(path, body) {
  const headers = { "Content-Type": "application/json" };
  const key = getKey();
  if (key) headers["x-api-key"] = key;
  const res = await fetch(path, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json();
}

async function sendTurn(session, text) {
  const trimmed = text.trim();
  const history = trimmed
    ? session.messages.filter(
        (m, i) =>
          !(i === session.messages.length - 1 && m.role === "user" && m.content === trimmed),
      )
    : session.messages;
  return api("/api/turn", {
    topicTitle: session.topicTitle,
    topicClaim: session.topicClaim,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    userMessage: trimmed || undefined,
  });
}

async function startDebate(topic, opening) {
  if (state.busy || state.pending) return;
  if (!state.hasServerKey && !getKey()) {
    state.error = "Paste an xAI API key first — console.x.ai.";
    render();
    return;
  }
  const session = {
    id: nid(),
    topicTitle: topic.title,
    topicClaim: topic.topicClaim || topic.claim,
    messages: [],
    verdict: null,
    startedAt: Date.now(),
  };
  const lead = (opening || "").trim();
  if (lead) {
    session.messages.push({ id: nid(), role: "user", content: lead, createdAt: Date.now() });
  }
  state.session = session;
  state.view = "arena";
  state.pending = true;
  state.error = null;
  state.busy = true;
  render();
  try {
    const result = await sendTurn(session, lead);
    if (!result.ok) {
      state.error = result.error;
    } else {
      session.messages.push({ id: nid(), role: "assistant", content: result.text, createdAt: Date.now() });
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : "The table went quiet.";
  }
  state.pending = false;
  state.busy = false;
  render();
}

async function reply(text) {
  const session = state.session;
  if (!session || state.pending) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  if (userTurns(session.messages) >= MAX_TURNS) return;
  session.messages.push({ id: nid(), role: "user", content: trimmed, createdAt: Date.now() });
  state.pending = true;
  state.error = null;
  render();
  try {
    const history = session.messages.slice(0, -1);
    const result = await api("/api/turn", {
      topicTitle: session.topicTitle,
      topicClaim: session.topicClaim,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      userMessage: trimmed,
    });
    if (!result.ok) state.error = result.error;
    else session.messages.push({ id: nid(), role: "assistant", content: result.text, createdAt: Date.now() });
  } catch (err) {
    state.error = err instanceof Error ? err.message : "The table went quiet.";
  }
  state.pending = false;
  render();
}

async function retry() {
  const session = state.session;
  if (!session || state.pending) return;
  const last = session.messages.at(-1);
  if (!last || last.role === "assistant") {
    state.pending = true;
    state.error = null;
    render();
    try {
      const result = await sendTurn(session, "");
      if (!result.ok) state.error = result.error;
      else session.messages.push({ id: nid(), role: "assistant", content: result.text, createdAt: Date.now() });
    } catch (err) {
      state.error = err instanceof Error ? err.message : "The table went quiet.";
    }
    state.pending = false;
    render();
    return;
  }
  const text = last.content;
  session.messages.pop();
  await reply(text);
}

async function callIt() {
  const session = state.session;
  if (!session || state.pending || state.judging) return;
  if (userTurns(session.messages) < MIN_JUDGE) return;
  state.judging = true;
  state.error = null;
  render();
  try {
    const result = await api("/api/judge", {
      topicTitle: session.topicTitle,
      topicClaim: session.topicClaim,
      history: session.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    if (!result.ok || !result.verdict) {
      state.error = result.ok ? "The judge sat this one out." : result.error;
    } else {
      session.verdict = result.verdict;
      state.history = [session, ...state.history.filter((h) => h.id !== session.id)];
      saveHist(state.history);
      state.view = "verdict";
    }
  } catch (err) {
    state.error = err instanceof Error ? err.message : "The judge sat this one out.";
  }
  state.judging = false;
  render();
}

function lobby() {
  const custom = document.getElementById("custom")?.value || "";
  const opening = document.getElementById("opening")?.value || "";
  const keyVal = document.getElementById("apikey")?.value ?? getKey();
  return `
    <div class="hero">
      <div class="hero-inner">
        <p class="kicker">Campus table · 1993–2025</p>
        <h1>Prove Me Wrong</h1>
        <p class="lede">Sit down across from Charlie Kirk. Pick a topic. Make your case. He won’t blink.</p>
        <a class="chip" href="${SKILL}" target="_blank" rel="noreferrer">Grounded in YixiaJack/charlie-kirk-skill</a>
      </div>
    </div>
    <main class="wrap">
      ${
        state.hasServerKey
          ? ""
          : `<section class="panel">
              <h2>Your key</h2>
              <p class="card-blurb">This clone talks to xAI from your machine. Paste a key from <a href="https://console.x.ai" target="_blank" rel="noreferrer">console.x.ai</a>. It stays in this tab.</p>
              <label>xAI API key
                <input id="apikey" type="password" autocomplete="off" value="${esc(keyVal)}" placeholder="xai-…" />
              </label>
            </section>`
      }
      <div class="row" style="margin-top:2.5rem">
        <h2>The line</h2>
        <p class="hint">Choose a claim. Then sit down.</p>
      </div>
      <div class="grid">
        ${TOPICS.map(
          (t) => `<button class="card" data-topic="${t.id}" ${state.busy ? "disabled" : ""}>
            <p class="card-title">${esc(t.title)}</p>
            <p class="card-blurb">${esc(t.blurb)}</p>
          </button>`,
        ).join("")}
      </div>
      <section class="panel">
        <h2>Bring your own fight</h2>
        <p class="card-blurb">Write a topic. Optionally lead with your opening — he’ll answer it.</p>
        <label>Topic
          <input id="custom" maxlength="160" value="${esc(custom)}" placeholder="Should the US abolish the income tax?" />
        </label>
        <label>Your opening (optional)
          <textarea id="opening" maxlength="1200" placeholder="I’ll go first…">${esc(opening)}</textarea>
        </label>
        <button class="btn mt" id="sit-custom" ${state.busy ? "disabled" : ""}>Sit down</button>
      </section>
      ${
        state.history.length
          ? `<section class="history">
              <h2>Prior tables</h2>
              ${state.history
                .map(
                  (h) => `<button data-hist="${h.id}">
                    <span><span class="card-title">${esc(h.topicTitle)}</span>
                    <span class="meta">${esc(h.verdict?.headline || `${h.messages.length} remarks`)}</span></span>
                    <span class="meta">${h.verdict ? (h.verdict.winner === "you" ? "You" : h.verdict.winner === "kirk" ? "Kirk" : "Draw") : "Open"}</span>
                  </button>`,
                )
                .join("")}
            </section>`
          : ""
      }
      ${state.error && state.view === "lobby" ? `<p class="fine" style="color:var(--accent)">${esc(state.error)}</p>` : ""}
      <p class="fine">An AI reconstruction of Charlie Kirk’s public debate style, distilled from the open-source YixiaJack/charlie-kirk-skill (MIT). Not the man. Not a séance. A table. Run it locally with <code>npm start</code>.</p>
    </main>`;
}

function arena() {
  const s = state.session;
  if (!s) return lobby();
  const turns = userTurns(s.messages);
  const canJudge = !state.pending && !state.judging && turns >= MIN_JUDGE && !s.verdict;
  const atCap = turns >= MAX_TURNS && !s.verdict;
  return `
    <div class="arena">
      <header class="top">
        <button class="icon-btn" id="leave" aria-label="Leave the table">×</button>
        <div class="grow">
          <p class="ellipsis">${esc(s.topicTitle)}</p>
          <p class="sub">Round ${Math.min(Math.max(turns, 1), MAX_TURNS)} of ${MAX_TURNS}</p>
        </div>
        ${canJudge ? `<button class="btn btn-ghost" id="call" style="min-height:2.25rem;font-size:0.8rem">Call it</button>` : ""}
      </header>
      <div class="thread" id="thread">
        <p class="claim">${esc(s.topicClaim)}</p>
        ${s.messages
          .map((m) =>
            m.role === "assistant"
              ? `<div class="msg kirk"><p class="who">Charlie Kirk</p><p class="body">${esc(m.content)}</p></div>`
              : `<div class="msg you"><div class="bubble"><p class="who">You</p><p class="body">${esc(m.content)}</p></div></div>`,
          )
          .join("")}
        ${
          state.pending
            ? `<div class="msg kirk"><p class="who">Charlie Kirk</p><div class="pulse"><span></span><span></span><span></span></div></div>`
            : ""
        }
      </div>
      <div class="dock">
        ${
          state.error
            ? `<p class="err"><span>${esc(state.error)}</span><button class="link" id="retry">Retry</button></p>`
            : ""
        }
        ${
          atCap
            ? `<div class="compose"><p class="claim" style="margin:0;flex:1">Six rounds. That’s a full table. Call the debate.</p>
               <button class="btn btn-accent" id="call-dock">${state.judging ? "Judging…" : "Call it"}</button></div>`
            : `<form class="compose" id="form">
                <textarea id="draft" rows="1" maxlength="1200" ${state.pending ? "disabled" : ""} placeholder="${state.pending ? "He’s answering…" : "Your move. Shift+Enter for a line."}"></textarea>
                <button class="btn btn-icon" type="submit" aria-label="Send" ${state.pending ? "disabled" : ""}>↑</button>
              </form>`
        }
        ${canJudge && !atCap ? `<p class="callout"><button class="link" id="call-link">${state.judging ? "The judge is writing…" : "Had enough? Call the debate."}</button></p>` : ""}
      </div>
    </div>`;
}

function verdict() {
  const s = state.session;
  const v = s?.verdict;
  if (!s || !v) return lobby();
  const winner = v.winner === "you" ? "You take the table." : v.winner === "kirk" ? "Kirk holds." : "Draw.";
  return `
    <div class="ballot">
      <p class="kicker" style="color:var(--muted)">Ballot</p>
      <h1>${esc(winner)}</h1>
      <p class="lede" style="color:var(--muted)">${esc(v.headline)}</p>
      <p class="sub">${esc(s.topicTitle)}</p>
      <div class="scores">
        <div>
          <div class="bar-label"><span>Kirk</span><span class="num">${v.kirkScore}</span></div>
          <div class="bar kirk"><i style="width:${v.kirkScore}%"></i></div>
        </div>
        <div>
          <div class="bar-label"><span>You</span><span class="num">${v.youScore}</span></div>
          <div class="bar"><i style="width:${v.youScore}%"></i></div>
        </div>
      </div>
      <p class="body">${esc(v.analysis)}</p>
      <dl class="notes" style="margin-top:2rem">
        <div><dt>Kirk’s best</dt><dd>${esc(v.kirkBest)}</dd></div>
        <div><dt>Your best</dt><dd>${esc(v.youBest)}</dd></div>
        <div><dt>Kirk’s miss</dt><dd>${esc(v.kirkMiss)}</dd></div>
        <div><dt>Your miss</dt><dd>${esc(v.youMiss)}</dd></div>
      </dl>
      <div class="actions">
        <button class="btn" id="again">New topic</button>
        <button class="btn btn-ghost" id="quad">Back to the quad</button>
      </div>
      <h2 style="margin-top:3rem">Transcript</h2>
      ${s.messages
        .map(
          (m) => `<div class="msg" style="margin-top:1rem">
            <p class="who" style="color:var(--muted)">${m.role === "assistant" ? "Kirk" : "You"}</p>
            <p class="body">${esc(m.content)}</p>
          </div>`,
        )
        .join("")}
    </div>`;
}

function bindLobby() {
  const keyInput = document.getElementById("apikey");
  if (keyInput) {
    keyInput.addEventListener("change", () => setKey(keyInput.value.trim()));
    keyInput.addEventListener("blur", () => setKey(keyInput.value.trim()));
  }
  for (const btn of document.querySelectorAll("[data-topic]")) {
    btn.addEventListener("click", () => {
      if (keyInput) setKey(keyInput.value.trim());
      const topic = TOPICS.find((t) => t.id === btn.dataset.topic);
      const opening = document.getElementById("opening")?.value || "";
      if (topic) void startDebate(topic, opening);
    });
  }
  document.getElementById("sit-custom")?.addEventListener("click", () => {
    if (keyInput) setKey(keyInput.value.trim());
    const title = document.getElementById("custom")?.value.trim();
    const opening = document.getElementById("opening")?.value || "";
    if (!title) return;
    void startDebate(
      {
        id: "custom",
        title,
        claim: `The student wants to debate: ${title}. State your actual public position on this, or argue from first principles if you have not spoken on it directly.`,
      },
      opening,
    );
  });
  for (const btn of document.querySelectorAll("[data-hist]")) {
    btn.addEventListener("click", () => {
      const found = state.history.find((h) => h.id === btn.dataset.hist);
      if (!found) return;
      state.session = found;
      state.view = found.verdict ? "verdict" : "arena";
      state.error = null;
      render();
    });
  }
}

function bindArena() {
  document.getElementById("leave")?.addEventListener("click", () => {
    state.view = "lobby";
    state.session = null;
    state.pending = false;
    state.error = null;
    render();
  });
  document.getElementById("retry")?.addEventListener("click", () => void retry());
  document.getElementById("call")?.addEventListener("click", () => void callIt());
  document.getElementById("call-dock")?.addEventListener("click", () => void callIt());
  document.getElementById("call-link")?.addEventListener("click", () => void callIt());
  const form = document.getElementById("form");
  const draft = document.getElementById("draft");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = draft?.value || "";
    if (draft) draft.value = "";
    void reply(text);
  });
  draft?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form?.requestSubmit();
    }
  });
  const thread = document.getElementById("thread");
  if (thread) thread.scrollTop = thread.scrollHeight;
  requestAnimationFrame(() => {
    const last = document.querySelector(".thread .msg:last-child");
    last?.scrollIntoView({ block: "end", behavior: "smooth" });
  });
}

function bindVerdict() {
  const back = () => {
    state.view = "lobby";
    state.session = null;
    render();
  };
  document.getElementById("again")?.addEventListener("click", back);
  document.getElementById("quad")?.addEventListener("click", back);
}

function render() {
  if (state.view === "arena") app.innerHTML = arena();
  else if (state.view === "verdict") app.innerHTML = verdict();
  else app.innerHTML = lobby();

  if (state.view === "arena") bindArena();
  else if (state.view === "verdict") bindVerdict();
  else bindLobby();
}

fetch("/api/health")
  .then((r) => {
    if (!r.ok) throw new Error("health");
    return r.json();
  })
  .then((h) => {
    state.hasServerKey = Boolean(h.hasServerKey);
  })
  .catch(() => {
    state.hasServerKey = false;
    if (location.protocol === "file:") {
      state.error = "This table needs npm start — opening the HTML file directly cannot reach xAI.";
    }
  })
  .finally(render);

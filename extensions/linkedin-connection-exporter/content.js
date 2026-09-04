let localStop = false;
let runLock = false;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function canonicalProfileUrl(href) {
  try {
    const u = new URL(href, location.href);
    if (!u.pathname.includes("/in/")) return null;
    const m = u.pathname.match(/\/in\/[^/?#]+/i);
    if (!m) return null;
    return `${u.origin}${m[0].replace(/\/$/, "")}/`;
  } catch {
    return null;
  }
}

function cleanLine(s) {
  return (s || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueLines(text) {
  const seen = new Set();
  const out = [];
  for (const raw of (text || "").split(/\n+/)) {
    const line = cleanLine(raw);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

const ACTION_LINES = /^(message|connect|follow|more|pending|remove connection|save|view profile)$/i;
const DEGREE_LINE = /^(?:[•·]\s*)?(\d+(?:st|nd|rd|th))$/i;
const DEGREE_AT_END = /(?:^|\s|[•·])((?:1st|2nd|3rd|\d+th))\s*$/i;

function findCard(anchor) {
  // LinkedIn changes generated class names frequently. Prefer semantic result
  // containers and only fall back to bounded ancestor climbing.
  const semantic = anchor.closest("li, article, [role='listitem']");
  if (semantic && cleanLine(semantic.innerText).length >= 8) return semantic;

  let el = anchor;
  let best = anchor.parentElement;
  for (let i = 0; i < 7 && el?.parentElement; i++) {
    el = el.parentElement;
    const text = cleanLine(el.innerText);
    const profileCount = el.querySelectorAll?.('a[href*="/in/"]').length || 0;
    if (text.length >= 15 && text.length <= 2200 && profileCount <= 8) {
      best = el;
      if (text.length >= 40) break;
    }
  }
  return best || anchor;
}

function profileAnchorsInMain() {
  // Restrict to the central results area whenever LinkedIn exposes <main>.
  // This avoids nav/account links and most recommendation sidebars.
  const inMain = [...document.querySelectorAll('main a[href*="/in/"]')];
  return inMain.length ? inMain : [...document.querySelectorAll('a[href*="/in/"]')];
}

function cardProfileAnchors(card, fallbackAnchor) {
  const list = [...(card?.querySelectorAll?.('a[href*="/in/"]') || [])];
  if (!list.length && fallbackAnchor) list.push(fallbackAnchor);
  return list.filter(a => canonicalProfileUrl(a.href));
}

function choosePrimaryProfileAnchor(card, fallbackAnchor) {
  const anchors = cardProfileAnchors(card, fallbackAnchor);
  if (!anchors.length) return null;

  // The primary person commonly has both avatar and name links pointing to the
  // same URL. Mutual-connection links typically occur once. Frequency therefore
  // gives a stable signal without depending on LinkedIn CSS classes.
  const counts = new Map();
  for (const a of anchors) {
    const url = canonicalProfileUrl(a.href);
    counts.set(url, (counts.get(url) || 0) + 1);
  }
  let bestUrl = null;
  let bestCount = -1;
  for (const [url, count] of counts) {
    if (count > bestCount) {
      bestUrl = url;
      bestCount = count;
    }
  }

  const same = anchors.filter(a => canonicalProfileUrl(a.href) === bestUrl);
  return same.find(a => cleanLine(a.innerText || a.textContent)) || same[0] || null;
}

function inferName(anchor, card, lines) {
  const aria = cleanLine(anchor?.getAttribute?.("aria-label"));
  const anchorText = cleanLine(anchor?.innerText || anchor?.textContent);
  const imgAlt = cleanLine(anchor?.querySelector?.("img")?.alt || card?.querySelector?.("img")?.alt);

  const candidates = [anchorText, imgAlt, aria]
    .filter(Boolean)
    .map(s => s.replace(/\bview\s+.*profile\b/i, "").trim())
    .filter(s => s.length >= 2 && s.length <= 120);

  for (const c of candidates) {
    if (!ACTION_LINES.test(c) && !c.includes("http") && !/mutual connection/i.test(c)) return c;
  }

  return lines.find(l =>
    l.length >= 2 &&
    l.length <= 120 &&
    !ACTION_LINES.test(l) &&
    !DEGREE_LINE.test(l) &&
    !/mutual connection/i.test(l)
  ) || "";
}

function classify(headline) {
  // Optional convenience metadata only. It NEVER filters collection.
  const h = (headline || "").toLowerCase();
  if (/\b(recruit(?:er|ers|ing|ment)?|talent|sourcer|staffing|people partner|human resources|hrbp)\b/.test(h))
    return "Recruiting / Talent";
  if (/\b(engineer|developer|software|data|machine learning|ml\b|ai\b|security|cloud|devops|sre|architect|technical|technology|cto|cio)\b/.test(h))
    return "Technical";
  if (/\b(product manager|product lead|product director|product owner|vp product|head of product)\b/.test(h))
    return "Product";
  if (/\b(founder|co-founder|chief|ceo|president|vice president|vp\b|director|head of)\b/.test(h))
    return "Leadership";
  return "Other";
}

function extractVisibleRows() {
  const anchors = profileAnchorsInMain();
  const seenCards = new Set();
  const byUrl = new Map();
  let rowOnPage = 0;

  for (const discoveredAnchor of anchors) {
    const card = findCard(discoveredAnchor);
    if (!card || seenCards.has(card)) continue;
    seenCards.add(card);

    const anchor = choosePrimaryProfileAnchor(card, discoveredAnchor);
    const url = canonicalProfileUrl(anchor?.href);
    if (!url || byUrl.has(url)) continue;

    const lines = uniqueLines(card.innerText);
    if (!lines.length) continue;
    const name = inferName(anchor, card, lines);

    const degreeLine = lines.find(l => DEGREE_LINE.test(l) || DEGREE_AT_END.test(l)) || "";
    const degreeMatch = degreeLine.match(DEGREE_LINE) || degreeLine.match(DEGREE_AT_END);
    const connectionDegree = degreeMatch ? degreeMatch[1].toLowerCase() : "";

    const mutualConnections = lines.find(l => /mutual connection/i.test(l)) || "";

    const isIdentityLine = l => {
      if (l === name) return true;
      if (name && l.toLowerCase().startsWith(name.toLowerCase())) {
        const tail = cleanLine(l.slice(name.length));
        return !tail || DEGREE_LINE.test(tail) || DEGREE_AT_END.test(tail);
      }
      return false;
    };

    const filtered = lines.filter(l =>
      !isIdentityLine(l) &&
      l !== degreeLine &&
      l !== mutualConnections &&
      !ACTION_LINES.test(l) &&
      !/^linkedin member$/i.test(l) &&
      !/^connected (on|since)\b/i.test(l) &&
      !/^\d+\s+(followers?|connections?)$/i.test(l)
    );

    // In LinkedIn connection rows the first two meaningful lines after the
    // identity are generally headline and location. Preserve all residual text
    // as `details` too, so unusual rows do not lose information.
    const headline = filtered[0] || "";
    const locationText = filtered[1] || "";
    const details = filtered.slice(2).join(" | ");

    rowOnPage += 1;
    byUrl.set(url, {
      name,
      connectionDegree,
      headline,
      location: locationText,
      mutualConnections,
      details,
      visibleText: lines.join(" | "),
      url,
      category: classify(headline),
      rowOnPage,
      capturedAt: new Date().toISOString()
    });
  }

  // Do not filter by profession, title, company, or category. A sparse row with
  // only a URL/name is still a valid connection-list entry.
  return [...byUrl.values()].filter(r => r.url && (r.name || r.visibleText));
}

function visibleConnectionUrls() {
  return extractVisibleRows().map(r => r.url);
}

function findNextControl() {
  const els = [...document.querySelectorAll("button, a")];
  return els.find(el => {
    if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
    const label = cleanLine(el.getAttribute("aria-label"));
    const text = cleanLine(el.innerText || el.textContent);
    const rel = cleanLine(el.getAttribute("rel"));
    return /^next$/i.test(text) ||
           /\bnext page\b/i.test(label) ||
           /^next$/i.test(label) ||
           rel.toLowerCase() === "next";
  }) || null;
}

async function waitForListToSettle(delayMs) {
  // Give lazy-loaded cards a chance to render.
  let lastCount = -1;
  let stable = 0;
  for (let i = 0; i < 8; i++) {
    const count = visibleConnectionUrls().length;
    if (count === lastCount) stable++;
    else stable = 0;
    lastCount = count;
    if (stable >= 2) break;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
    await sleep(Math.min(700, delayMs / 3));
  }
  await sleep(Math.min(700, delayMs / 3));
}

async function pageSignature() {
  return visibleConnectionUrls().slice(0, 20).join("|");
}

async function waitForPageChange(oldSig, delayMs) {
  const started = Date.now();
  const timeout = Math.max(6000, delayMs * 4);
  while (Date.now() - started < timeout) {
    await sleep(500);
    const sig = await pageSignature();
    if (sig && sig !== oldSig) return true;
  }
  return false;
}

async function getState() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "GET_STATE" }, r => resolve(r?.state || null));
  });
}

async function send(msg) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(msg, r => resolve(r));
  });
}

async function run(configOverride = null) {
  if (runLock) return;
  runLock = true;
  localStop = false;

  try {
    let state = await getState();
    if (!state?.running) return;

    const config = configOverride || state.config || { maxPages: 99, delayMs: 2500 };
    let page = Number(state.currentPage) || 0;

    while (!localStop && page < config.maxPages) {
      state = await getState();
      if (!state?.running) break;

      await waitForListToSettle(config.delayMs);
      const currentSig = await pageSignature();
      if (!currentSig) {
        await send({
          type: "SET_STATUS",
          running: false,
          currentPage: page,
          status: "Stopped: no visible LinkedIn profile results found on this page"
        });
        break;
      }

      // On resume, the DOM may still be sitting on the last page already saved.
      // Do not increment/capture it twice.
      if (currentSig !== state.lastSignature) {
        const rows = extractVisibleRows();
        if (!rows.length) {
          await send({
            type: "SET_STATUS",
            running: false,
            currentPage: page,
            status: "Stopped: profile links were found, but no result rows could be parsed"
          });
          break;
        }

        page += 1;
        await send({
          type: "UPSERT_ROWS",
          rows: rows.map(r => ({ ...r, sourcePage: page })),
          currentPage: page,
          lastSignature: currentSig,
          status: `Captured page ${page}: ${rows.length} visible profiles`
        });
      }

      if (page >= config.maxPages) {
        await send({
          type: "SET_STATUS",
          running: false,
          currentPage: page,
          status: `Finished at configured limit (${config.maxPages} pages)`
        });
        break;
      }

      const next = findNextControl();
      if (!next) {
        await send({
          type: "SET_STATUS",
          running: false,
          currentPage: page,
          status: "Stopped: no enabled Next control found"
        });
        break;
      }

      const oldSig = await pageSignature();
      next.scrollIntoView({ block: "center" });
      await sleep(Math.min(500, config.delayMs / 4));
      next.click();

      // A hard navigation will destroy this content-script instance and the new
      // one will resume from storage. For SPA pagination, require the result set
      // to actually change before continuing.
      await sleep(config.delayMs);
      const changed = await waitForPageChange(oldSig, config.delayMs);
      if (!changed) {
        await send({
          type: "SET_STATUS",
          running: false,
          currentPage: page,
          status: "Stopped: Next was clicked but the visible result set did not change"
        });
        break;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  } catch (err) {
    console.error("Connection exporter error:", err);
    await send({
      type: "SET_STATUS",
      running: false,
      status: `Error: ${err?.message || String(err)}`
    });
  } finally {
    runLock = false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "PING") {
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "VALIDATE_PAGE") {
    const rows = extractVisibleRows();
    const rawProfileLinks = profileAnchorsInMain().length;
    sendResponse({
      ok: true,
      rawProfileLinks,
      count: rows.length,
      sample: rows.slice(0, 3).map(r => ({
        name: r.name,
        degree: r.connectionDegree,
        headline: r.headline,
        location: r.location,
        url: r.url
      }))
    });
    return;
  }
  if (msg.type === "START") {
    run(msg.config);
    sendResponse({ ok: true });
    return;
  }
  if (msg.type === "STOP") {
    localStop = true;
    sendResponse({ ok: true });
    return;
  }
});

// Resume automatically after a LinkedIn navigation/reload if a run is active.
setTimeout(async () => {
  const state = await getState();
  if (state?.running) run(state.config);
}, 1200);

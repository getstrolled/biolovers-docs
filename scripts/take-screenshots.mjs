/**
 * Capture all help-center screenshots from the running dev server.
 *
 * Requirements:
 *  - Dev server running on http://localhost:1337
 *  - Test account `showcase` / `12345678` (Premium)
 *  - Run from inside `help/` so puppeteer resolves: `node scripts/take-screenshots.mjs`
 *
 * Output: writes PNGs into `help/images/{dashboard,profile,money,widgets,auth}/`.
 */
import puppeteer from "puppeteer";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.resolve(__dirname, "..", "images");

/**
 * The auth host the app actually expects. The dev `.env` sets
 * `NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.biolovers.site`, so any
 * `localhost:1337/dashboard/*` URL gets 308'd to production. To stay local we
 * hit `dashboard.localhost:1337` directly and remap that hostname back to
 * 127.0.0.1 via Chrome's --host-resolver-rules below.
 */
const DASHBOARD_ORIGIN =
  process.env.STROLLED_DASHBOARD_ORIGIN ?? "http://dashboard.localhost:1337";
const PUBLIC_ORIGIN =
  process.env.STROLLED_PUBLIC_ORIGIN ?? "http://localhost:1337";
const USERNAME = process.env.STROLLED_USER ?? "showcase";
const PASSWORD = process.env.STROLLED_PASS ?? "12345678";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 375, height: 812, isMobile: true, hasTouch: true };

/** [url, relativePath, optionalExtraSetup] tuples. */
/**
 * Panel hrefs are stored in the nav config as `/dashboard/edit/...` and
 * EditClient resolves the active panel from `usePathname()`. We must visit the
 * full prefixed URL so the panel matcher hits an exact entry — visiting the
 * shorter `/edit/...` form on the dashboard host shows Overview every time.
 */
const DASHBOARD_SHOTS = [
  ["/dashboard/edit/overview", "dashboard/overview-stats.png"],
  ["/dashboard/edit/overview", "dashboard/overview-charts.png", { scrollY: 700 }],
  ["/dashboard/edit/profile/url", "dashboard/profile-url.png"],
  ["/dashboard/edit/profile/about", "dashboard/profile-about.png"],
  ["/dashboard/edit/profile/corner", "dashboard/profile-corner.png"],
  ["/dashboard/edit/look/card-layout", "dashboard/look-card-default.png"],
  ["/dashboard/edit/look/card-layout", "dashboard/look-card-modern.png", { clickPreset: "Modern" }],
  ["/dashboard/edit/look/card-layout", "dashboard/look-card-simplistic.png", { clickPreset: "Simplistic" }],
  ["/dashboard/edit/look/card-layout", "dashboard/look-card-sleek.png", { clickPreset: "Sleek" }],
  ["/dashboard/edit/look/fonts", "dashboard/look-fonts.png"],
  ["/dashboard/edit/look/text-effects", "dashboard/look-text-effects.png"],
  ["/dashboard/edit/look/browser-tab", "dashboard/look-tab.png"],
  ["/dashboard/edit/media/avatar", "dashboard/media-avatar.png"],
  ["/dashboard/edit/media/cursor", "dashboard/media-cursor.png"],
  ["/dashboard/edit/media/background", "dashboard/media-background.png"],
  ["/dashboard/edit/media/splash", "dashboard/media-splash.png"],
  ["/dashboard/edit/media/audio", "dashboard/media-audio.png"],
  ["/dashboard/edit/connect/discord", "dashboard/connect-discord.png"],
  ["/dashboard/edit/connect/live", "dashboard/connect-live.png"],
  ["/dashboard/edit/connect/socials", "dashboard/connect-socials.png"],
  ["/dashboard/edit/connect/tips", "dashboard/connect-tips.png"],
  ["/dashboard/edit/pages/widgets", "dashboard/pages-widgets-list.png"],
  ["/dashboard/edit/pages/widgets", "dashboard/pages-widgets-add-grid.png", { clickButton: "Add widget" }],
  ["/dashboard/edit/badges", "dashboard/badges-earned.png"],
  ["/dashboard/edit/badges", "dashboard/badges-custom.png", { scrollY: 600 }],
  ["/dashboard/edit/account/email", "dashboard/account-email.png"],
  ["/dashboard/edit/account/password", "dashboard/account-password.png"],
  ["/dashboard/edit/account/two-factor", "dashboard/account-2fa-setup.png"],
  ["/dashboard/edit/overview", "dashboard/nav-sidebar.png", { clip: { x: 0, y: 0, width: 320, height: 900 } }],
];

const MONEY_SHOTS = [
  ["/upgrades", "money/upgrades-index.png"],
  ["/premium", "money/premium-checkout.png"],
  ["/upgrades/verified", "money/verified-checkout.png"],
  ["/upgrades/donate", "money/donate-checkout.png"],
  ["/custom-badges", "money/custom-badges-checkout.png"],
];

const AUTH_SHOTS = [
  ["/dashboard/login", "auth/login.png"],
  ["/dashboard/register", "auth/register.png"],
  ["/dashboard/forgot-password", "auth/forgot-password.png"],
];

async function ensureDir(p) {
  await mkdir(path.dirname(p), { recursive: true });
}

async function shoot(page, urlPath, relPath, opts = {}) {
  const out = path.join(IMAGES_DIR, relPath);
  await ensureDir(out);
  const origin = opts.origin ?? DASHBOARD_ORIGIN;
  const url = origin + urlPath;
  process.stdout.write(`-> ${relPath.padEnd(46)} ${url}`);
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  } catch (e) {
    process.stdout.write(`  goto-warn(${e.message.split("\n")[0]})`);
  }
  await new Promise((r) => setTimeout(r, 1500));
  if (opts.scrollY) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), opts.scrollY);
    await new Promise((r) => setTimeout(r, 600));
  }
  if (opts.clickPreset) {
    try {
      await page.evaluate((label) => {
        const btn = [...document.querySelectorAll("button,[role=button]")].find(
          (b) => b.textContent && b.textContent.trim().toLowerCase() === label.toLowerCase()
        );
        if (btn) btn.click();
      }, opts.clickPreset);
      await new Promise((r) => setTimeout(r, 800));
    } catch {}
  }
  if (opts.clickButton) {
    try {
      await page.evaluate((label) => {
        const btn = [...document.querySelectorAll("button,[role=button]")].find(
          (b) => b.textContent && b.textContent.trim().toLowerCase().includes(label.toLowerCase())
        );
        if (btn) btn.click();
      }, opts.clickButton);
      await new Promise((r) => setTimeout(r, 1200));
    } catch {}
  }
  const screenshotOpts = { path: out, type: "png" };
  if (opts.clip) {
    screenshotOpts.clip = opts.clip;
  } else {
    screenshotOpts.fullPage = opts.fullPage ?? false;
  }
  await page.screenshot(screenshotOpts);
  if (existsSync(out)) {
    const size = statSync(out).size;
    console.log(`  ok (${size} bytes)`);
    return true;
  }
  console.log("  MISSING");
  return false;
}

async function login(page) {
  console.log(`\n== Login as ${USERNAME} ==`);
  await page.goto(DASHBOARD_ORIGIN + "/dashboard/login", { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="text"], input[type="email"], input[name="username"], input[autocomplete="username"]', { timeout: 10000 });
  await page.evaluate(
    ({ u, p }) => {
      const inputs = [...document.querySelectorAll("input")];
      const userInput =
        inputs.find((i) => /user|email/i.test(i.name + " " + i.id + " " + (i.placeholder ?? ""))) ??
        inputs.find((i) => i.type !== "password");
      const passInput = inputs.find((i) => i.type === "password");
      if (userInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(userInput, u);
        userInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (passInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(passInput, p);
        passInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    { u: USERNAME, p: PASSWORD }
  );
  await new Promise((r) => setTimeout(r, 400));
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null),
    page.evaluate(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    }),
  ]);
  await new Promise((r) => setTimeout(r, 1500));
  const url = page.url();
  console.log(`  landed on: ${url}`);
  if (url.includes("/login")) {
    throw new Error(`Login appears to have failed (still on ${url}).`);
  }
}

async function takeAuthShots(browser) {
  console.log("\n== Auth pages (no login) ==");
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);
  for (const [u, rel] of AUTH_SHOTS) {
    await shoot(page, u, rel);
  }
  await page.close();
}

async function takeDashboardShots(browser) {
  console.log("\n== Dashboard panels ==");
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);
  await login(page);
  for (const [u, rel, opts] of DASHBOARD_SHOTS) {
    await shoot(page, u, rel, opts ?? {});
  }
  return page;
}

async function takeWidgetShots(page) {
  console.log("\n== Widget editing detail shots ==");
  const widgets = [
    ["infobox", "widgets/infobox-edit.png"],
    ["embed", "widgets/embed-edit.png"],
    ["gear", "widgets/gear-shelf-edit.png"],
    ["portfolio", "widgets/portfolio-edit.png"],
    ["steam", "widgets/steam-inventory-edit.png"],
  ];
  for (const [match, rel] of widgets) {
    await page.goto(DASHBOARD_ORIGIN + "/dashboard/edit/pages/widgets", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button,[role=button]")].find(
          (b) => /add widget/i.test(b.textContent || "")
        );
        if (btn) btn.click();
      });
      await new Promise((r) => setTimeout(r, 1000));
      await page.evaluate((m) => {
        const btn = [...document.querySelectorAll("button,[role=button]")].find(
          (b) => new RegExp(m, "i").test(b.textContent || "")
        );
        if (btn) btn.click();
      }, match);
      await new Promise((r) => setTimeout(r, 1500));
    } catch {}
    const out = path.join(IMAGES_DIR, rel);
    await ensureDir(out);
    await page.screenshot({ path: out, type: "png" });
    const size = existsSync(out) ? statSync(out).size : 0;
    console.log(`  ${rel}  (${size} bytes)`);
  }
}

/**
 * Detect (and dismiss) the click-to-enter splash on a public profile. The
 * splash is a fullscreen overlay that says "click to enter…"; tapping anywhere
 * on it triggers a fade-out reveal of the real card.
 */
async function dismissSplash(page) {
  const viewport = page.viewport() ?? { width: 1440, height: 900 };
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((r) => setTimeout(r, 800));
    const has = await page.evaluate(() => {
      const txt = (document.body.innerText || "").toLowerCase();
      return (
        txt.includes("click to enter") ||
        txt.includes("tap anywhere") ||
        txt.includes("tap to enter") ||
        txt.includes("click anywhere")
      );
    });
    if (!has && attempt > 0) return true;
    // Click in a corner away from the card so we don't pop tooltips.
    await page.mouse.click(20, 20);
    await new Promise((r) => setTimeout(r, 1200));
  }
  // Move the mouse out of the viewport so it stops hovering anything.
  await page.mouse.move(0, 0);
  await new Promise((r) => setTimeout(r, 200));
  return false;
}

async function takeProfileShots(browser) {
  console.log("\n== Public profile ==");
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);
  const profileUrl = PUBLIC_ORIGIN + "/" + USERNAME;
  await page.goto(profileUrl, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  if (await page.evaluate(() => (document.body.innerText || "").toLowerCase().includes("click to enter"))) {
    const splashOut = path.join(IMAGES_DIR, "profile/public-splash.png");
    await ensureDir(splashOut);
    await page.screenshot({ path: splashOut, type: "png" });
    console.log("  profile/public-splash.png  ok");
    await dismissSplash(page);
  } else {
    console.log("  (no splash on this profile)");
  }
  const def = path.join(IMAGES_DIR, "profile/public-default.png");
  await ensureDir(def);
  await page.screenshot({ path: def, type: "png" });
  console.log("  profile/public-default.png  ok");
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 1200));
  const scroll = path.join(IMAGES_DIR, "profile/public-scroll-pages.png");
  await page.screenshot({ path: scroll, type: "png" });
  console.log("  profile/public-scroll-pages.png  ok");
  await page.close();
  const mobile = await browser.newPage();
  await mobile.setViewport(MOBILE);
  await mobile.goto(profileUrl, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  await dismissSplash(mobile);
  const m = path.join(IMAGES_DIR, "profile/public-mobile-375.png");
  await ensureDir(m);
  await mobile.screenshot({ path: m, type: "png" });
  console.log("  profile/public-mobile-375.png  ok");
  await mobile.close();
}

/**
 * Comparison-shot pipeline. We log into the dashboard once, snapshot the
 * showcase profile via /api/auth/me, then iterate over a fixed table of
 * "flip one option, screenshot the public profile, restore" entries.
 *
 * Each entry returns either:
 *   - { layoutPreset } — top-level field on /api/profile.
 *   - { customizationOverlay: (snapshot) => mergedCustomization } — applied as
 *     the full `customization` JSON for the PATCH call.
 *   - { topLevel } — additional top-level overrides (e.g. customCursorUrl).
 *
 * Screenshots land under `images/comparisons/<groupSlug>/<variantSlug>.png`.
 */
const COMPARISONS = [
  {
    group: "card-layout",
    variants: [
      { slug: "default", patch: { layoutPreset: "default" } },
      { slug: "modern", patch: { layoutPreset: "modern" } },
      { slug: "simplistic", patch: { layoutPreset: "simplistic" } },
      { slug: "sleek", patch: { layoutPreset: "sleek" } },
    ],
  },
  {
    group: "card-chrome",
    variants: [
      { slug: "solid", overlay: (c) => mergeProfileLayout(c, { cardBackdrop: "solid" }) },
      { slug: "glass", overlay: (c) => mergeProfileLayout(c, { cardBackdrop: "glass" }) },
      { slug: "transparent", overlay: (c) => mergeProfileLayout(c, { cardBackdrop: "transparent" }) },
    ],
  },
  {
    group: "card-width",
    variants: [
      { slug: "compact", overlay: (c) => mergeProfileLayout(c, { cardScale: "compact" }) },
      { slug: "comfortable", overlay: (c) => mergeProfileLayout(c, { cardScale: "comfortable" }) },
      { slug: "wide", overlay: (c) => mergeProfileLayout(c, { cardScale: "wide" }) },
      { slug: "full", overlay: (c) => mergeProfileLayout(c, { cardScale: "full" }) },
    ],
  },
  {
    group: "stats-corner",
    variants: [
      { slug: "default", overlay: (c) => mergeProfileLayout(c, { metaPositions: undefined }) },
      {
        slug: "all-top-left",
        overlay: (c) => mergeProfileLayout(c, {
          metaPositions: { views: "tl", joined: "tl", location: "tl", timezone: "tl" },
        }),
      },
      {
        slug: "all-bottom-right",
        overlay: (c) => mergeProfileLayout(c, {
          metaPositions: { views: "br", joined: "br", location: "br", timezone: "br" },
        }),
      },
    ],
  },
];

function mergeProfileLayout(c, partial) {
  return {
    ...(c ?? {}),
    profileLayout: {
      ...(c?.profileLayout ?? {}),
      ...partial,
    },
  };
}

async function fetchSnapshot(page) {
  return await page.evaluate(async () => {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) throw new Error(`/api/auth/me ${r.status}`);
    const j = await r.json();
    const u = j.user ?? j;
    return {
      layoutPreset: u.layoutPreset ?? null,
      customCursorUrl: u.customCursorUrl ?? null,
      customCursorTrail: u.customCursorTrail ?? null,
      profileAudioUrl: u.profileAudioUrl ?? null,
      profileAudioUrls: Array.isArray(u.profileAudioUrls) ? u.profileAudioUrls : [],
      customization: u.customization ?? {},
    };
  });
}

/**
 * Upload an MP3 to the showcase profile.
 *
 * Tries the simple multipart endpoint first; on R2-enabled instances that 400s
 * with "Multipart upload is disabled", we fall back to presign → PUT → confirm.
 * Critically the PUT to R2 is performed from Node (not the browser context) to
 * sidestep the cross-origin CORS preflight that R2 buckets normally reject for
 * `dashboard.localhost`.
 */
async function uploadAudio(page, mp3Buffer, filename) {
  const base64 = Buffer.from(mp3Buffer).toString("base64");

  // 1) Try simple multipart upload via the browser session.
  const multipart = await page.evaluate(async ({ base64, filename }) => {
    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: "audio/mpeg" });
    const fd = new FormData();
    fd.append("kind", "audio");
    fd.append("file", new File([blob], filename, { type: "audio/mpeg" }));
    const r = await fetch("/api/profile/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, json, text: r.ok ? null : text };
  }, { base64, filename });
  if (multipart.ok && multipart.json?.url) {
    return multipart;
  }

  // 2) Presign via the browser (cookie-auth), then PUT from Node to skip CORS,
  //    then confirm via the browser.
  const presign = await page.evaluate(async ({ filename, byteSize }) => {
    const r = await fetch("/api/profile/upload/presign", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "audio",
        contentType: "audio/mpeg",
        byteSize,
        filenameHint: filename,
      }),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, json, text: r.ok ? null : text };
  }, { filename, byteSize: mp3Buffer.length });
  if (!presign.ok || !presign.json?.uploadUrl) {
    return presign;
  }

  // Use the raw `https`/`http` module: Node's `fetch` PUT with a Buffer/Uint8Array
  // body silently omitted the body bytes against R2's signed URLs, so R2 stored a
  // zero-byte object that then failed `bufferMatchesKind` at confirm time.
  const { default: https } = await import("node:https");
  const { default: http } = await import("node:http");
  const u = new URL(presign.json.uploadUrl);
  const lib = u.protocol === "https:" ? https : http;
  const putContentType = presign.json.contentType || "audio/mpeg";
  await new Promise((resolve, reject) => {
    const req = lib.request({
      method: "PUT",
      hostname: u.hostname,
      port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        "Content-Type": putContentType,
        "Content-Length": mp3Buffer.length,
        ...(presign.json.headers || {}),
      },
    }, (res) => {
      let body = "";
      res.on("data", (d) => (body += d));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`  PUT ok (${res.statusCode}, ${mp3Buffer.length} B)`);
          resolve();
        } else {
          reject(new Error(`PUT ${res.statusCode}: ${body.slice(0, 300)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(mp3Buffer);
    req.end();
  });

  const confirm = await page.evaluate(async ({ key }) => {
    const r = await fetch("/api/profile/upload/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "audio", key }),
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: r.ok, status: r.status, json, text: r.ok ? null : text };
  }, { key: presign.json.key });
  return confirm;
}

async function patchProfile(page, body) {
  return await page.evaluate(async (b) => {
    const r = await fetch("/api/profile", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    });
    return { ok: r.ok, status: r.status, text: r.ok ? null : await r.text() };
  }, body);
}

async function takeComparisonShots(browser, dashboardPage) {
  console.log("\n== Comparison shots ==");
  const snapshot = await fetchSnapshot(dashboardPage);
  console.log(`  snapshot: layoutPreset=${snapshot.layoutPreset} cursor=${snapshot.customCursorUrl || "(none)"}`);
  const profilePage = await browser.newPage();
  await profilePage.setViewport(DESKTOP);
  const profileUrl = PUBLIC_ORIGIN + "/" + USERNAME;
  try {
    for (const compare of COMPARISONS) {
      console.log(`-- ${compare.group}`);
      for (const variant of compare.variants) {
        const body = { customization: snapshot.customization };
        if (snapshot.layoutPreset != null) body.layoutPreset = snapshot.layoutPreset;
        if (snapshot.customCursorUrl != null) body.customCursorUrl = snapshot.customCursorUrl;
        if (snapshot.customCursorTrail != null) body.customCursorTrail = snapshot.customCursorTrail;
        if (variant.patch) Object.assign(body, variant.patch);
        if (variant.overlay) body.customization = variant.overlay(snapshot.customization);
        if (variant.topLevel) Object.assign(body, variant.topLevel);
        const res = await patchProfile(dashboardPage, body);
        if (!res.ok) {
          console.log(`  ${variant.slug}  PATCH ${res.status} ${res.text?.slice(0, 200)}`);
          continue;
        }
        await profilePage
          .goto(profileUrl + "?_t=" + Date.now(), { waitUntil: "networkidle2", timeout: 30000 })
          .catch(() => {});
        await new Promise((r) => setTimeout(r, 2500));
        await dismissSplash(profilePage);
        await new Promise((r) => setTimeout(r, 1200));
        const out = path.join(IMAGES_DIR, "comparisons", compare.group, `${variant.slug}.png`);
        await ensureDir(out);
        await profilePage.screenshot({ path: out, type: "png" });
        const size = existsSync(out) ? statSync(out).size : 0;
        console.log(`  ${compare.group}/${variant.slug}.png  (${size} bytes)`);
      }
    }
  } finally {
    console.log("-- restoring snapshot");
    const restoreRes = await patchProfile(dashboardPage, {
      layoutPreset: snapshot.layoutPreset ?? "default",
      customCursorUrl: snapshot.customCursorUrl ?? "",
      customCursorTrail: snapshot.customCursorTrail ?? false,
      customization: snapshot.customization,
    });
    console.log(`  restore PATCH ${restoreRes.status}${restoreRes.ok ? "" : " " + restoreRes.text?.slice(0, 200)}`);
    await profilePage.close();
  }
}

/**
 * Audio bar comparisons. We can't ship the music bar overlay shots from
 * the main `takeComparisonShots` table because the bar only renders when an
 * audio track is loaded. Instead we upload a small showcase MP3, flip the
 * `customization.musicBar` placement on each variant, screenshot the public
 * profile, then strip the audio so the showcase profile goes back to silent.
 *
 * Variants:
 *  - `fixed-bottom`   — site default; bar pinned to viewport bottom.
 *  - `attached`       — bar docked inside the profile card.
 *  - `below-profile`  — bar floats below the card with a gap.
 *  - `hidden`         — bar hidden entirely (audio still autoplays for visitors).
 */
async function takeAudioBarShots(browser, dashboardPage, mp3Path) {
  console.log("\n== Audio bar comparisons ==");
  if (!mp3Path || !existsSync(mp3Path)) {
    console.log(`  skip: missing audio sample at ${mp3Path}`);
    return;
  }
  const snapshot = await fetchSnapshot(dashboardPage);
  const mp3Buffer = await readFile(mp3Path);
  console.log(`  uploading ${mp3Path} (${mp3Buffer.length} bytes)`);
  const upload = await uploadAudio(dashboardPage, mp3Buffer, "showcase-preview.mp3");
  if (!upload.ok || !upload.json?.url) {
    console.log(`  upload FAILED ${upload.status} ${upload.text?.slice(0, 200) ?? ""}`);
    return;
  }
  const audioUrl = upload.json.url;
  const audioPath = upload.json.path ?? audioUrl;
  console.log(`  upload ok → ${audioPath}`);
  const setAudio = await patchProfile(dashboardPage, {
    profileAudioUrl: audioPath,
    profileAudioUrls: [audioPath],
  });
  if (!setAudio.ok) {
    console.log(`  set-audio PATCH ${setAudio.status} ${setAudio.text?.slice(0, 200)}`);
    return;
  }
  const profilePage = await browser.newPage();
  await profilePage.setViewport(DESKTOP);
  const profileUrl = PUBLIC_ORIGIN + "/" + USERNAME;
  const variants = [
    { slug: "fixed-bottom", musicBar: { hidden: false, attached: false, belowProfile: false } },
    { slug: "attached", musicBar: { hidden: false, attached: true, belowProfile: false } },
    { slug: "below-profile", musicBar: { hidden: false, attached: false, belowProfile: true } },
    { slug: "hidden", musicBar: { hidden: true, attached: false, belowProfile: false } },
  ];
  try {
    for (const v of variants) {
      const body = { customization: { ...(snapshot.customization ?? {}), musicBar: v.musicBar } };
      const res = await patchProfile(dashboardPage, body);
      if (!res.ok) {
        console.log(`  ${v.slug}  PATCH ${res.status} ${res.text?.slice(0, 200)}`);
        continue;
      }
      await profilePage
        .goto(profileUrl + "?_t=" + Date.now(), { waitUntil: "networkidle2", timeout: 30000 })
        .catch(() => {});
      await new Promise((r) => setTimeout(r, 2500));
      await dismissSplash(profilePage);
      // After dismissing splash, give the bar time to mount + autoplay attempt.
      await new Promise((r) => setTimeout(r, 1800));
      const out = path.join(IMAGES_DIR, "comparisons", "audio-bar", `${v.slug}.png`);
      await ensureDir(out);
      await profilePage.screenshot({ path: out, type: "png" });
      const size = existsSync(out) ? statSync(out).size : 0;
      console.log(`  audio-bar/${v.slug}.png  (${size} bytes)`);
    }
  } finally {
    console.log("-- restoring audio state");
    const restore = await patchProfile(dashboardPage, {
      profileAudioUrl: snapshot.profileAudioUrl ?? "",
      profileAudioUrls: snapshot.profileAudioUrls ?? [],
      customization: snapshot.customization,
    });
    console.log(`  restore PATCH ${restore.status}${restore.ok ? "" : " " + restore.text?.slice(0, 200)}`);
    await profilePage.close();
  }
}

/**
 * Dashboard audio panel walkthrough.
 *
 * Uploads three sample MP3s, navigates to /dashboard/edit/media/audio, and
 * captures the panel in each state the help docs need to call out:
 *  - 3 tracks loaded (baseline + zoomed crops of the reorder arrows)
 *  - Shuffle toggle on
 *  - One country rule added (empty + populated)
 *  - Two country rules
 *
 * On exit, all three uploads are stripped and the showcase profile goes back to silent.
 */
async function takeAudioPanelShots(browser, dashboardPage, mp3Paths) {
  console.log("\n== Audio dashboard panel walkthrough ==");
  const valid = mp3Paths.filter((p) => p && existsSync(p));
  if (valid.length < 3) {
    console.log(`  skip: need 3 mp3 paths, got ${valid.length}`);
    return;
  }
  const snapshot = await fetchSnapshot(dashboardPage);
  const uploadedPaths = [];
  for (let i = 0; i < 3; i++) {
    const buf = await readFile(valid[i]);
    console.log(`  uploading ${valid[i]} (${buf.length} bytes)`);
    const r = await uploadAudio(dashboardPage, buf, path.basename(valid[i]));
    if (!r.ok || !r.json?.url) {
      console.log(`  upload ${i + 1} FAILED ${r.status} ${r.text?.slice(0, 200) ?? ""}`);
      return;
    }
    uploadedPaths.push(r.json.path ?? r.json.url);
    console.log(`  ✓ track ${i + 1}: ${uploadedPaths[i]}`);
  }
  // Persist all three as the profile playlist + clear any previous shuffle/country state.
  const setRes = await patchProfile(dashboardPage, {
    profileAudioUrl: uploadedPaths[0],
    profileAudioUrls: uploadedPaths,
    audioFirstTrackRandom: false,
    audioCountryFirstTrackJson: "",
  });
  if (!setRes.ok) {
    console.log(`  set-tracks PATCH ${setRes.status} ${setRes.text?.slice(0, 200)}`);
    return;
  }

  const audioUrl = DASHBOARD_ORIGIN + "/dashboard/edit/media/audio";
  const outDir = path.join(IMAGES_DIR, "dashboard");

  /** Navigate to the audio panel with a cache-buster so the editor reflects the latest PATCH. */
  async function reloadAudioPanel() {
    await dashboardPage.goto(audioUrl + "?_t=" + Date.now(), {
      waitUntil: "networkidle2",
      timeout: 30000,
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
    // Move mouse out of the way so no hover popovers cover the panel chrome.
    await dashboardPage.mouse.move(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  }

  /** Screenshot the music panel container if we can find it; otherwise full viewport. */
  async function shootPanel(filename) {
    const out = path.join(outDir, filename);
    await ensureDir(out);
    await dashboardPage.screenshot({ path: out, type: "png" });
    const size = existsSync(out) ? statSync(out).size : 0;
    console.log(`  dashboard/${filename}  (${size} bytes)`);
  }

  try {
    // 1) Three tracks loaded, no extras enabled — the baseline shot.
    await reloadAudioPanel();
    await shootPanel("audio-tracks-list.png");

    // 2) Shuffle on.
    await patchProfile(dashboardPage, { audioFirstTrackRandom: true });
    await reloadAudioPanel();
    await shootPanel("audio-shuffle-on.png");

    // 3) One empty country rule + one populated one. Country JSON is the source of truth;
    //    the editor renders one row per entry.
    await patchProfile(dashboardPage, {
      audioFirstTrackRandom: false,
      audioCountryFirstTrackJson: JSON.stringify({ US: 1 }),
    });
    await reloadAudioPanel();
    await shootPanel("audio-country-rule-one.png");

    // 4) Two country rules — US → track 2, DE → track 3.
    await patchProfile(dashboardPage, {
      audioCountryFirstTrackJson: JSON.stringify({ US: 1, DE: 2 }),
    });
    await reloadAudioPanel();
    await shootPanel("audio-country-rule-two.png");

    // 5) Shuffle on AND country rules — the realistic premium config showing both at once.
    await patchProfile(dashboardPage, {
      audioFirstTrackRandom: true,
      audioCountryFirstTrackJson: JSON.stringify({ US: 1, DE: 2 }),
    });
    await reloadAudioPanel();
    await shootPanel("audio-shuffle-and-country.png");
  } finally {
    console.log("-- restoring audio panel state");
    const restore = await patchProfile(dashboardPage, {
      profileAudioUrl: snapshot.profileAudioUrl ?? "",
      profileAudioUrls: snapshot.profileAudioUrls ?? [],
      audioFirstTrackRandom: false,
      audioCountryFirstTrackJson: "",
    });
    console.log(`  restore PATCH ${restore.status}${restore.ok ? "" : " " + restore.text?.slice(0, 200)}`);
  }
}

async function takeMoneyShots(browser) {
  console.log("\n== Money / checkout pages ==");
  const page = await browser.newPage();
  await page.setViewport(DESKTOP);
  for (const [u, rel] of MONEY_SHOTS) {
    await shoot(page, u, rel, { origin: PUBLIC_ORIGIN });
  }
  await page.close();
}

async function main() {
  console.log(
    `dashboard=${DASHBOARD_ORIGIN}  public=${PUBLIC_ORIGIN}  out=${IMAGES_DIR}`
  );
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1440,900",
      // Map *.localhost (incl. dashboard.localhost) to 127.0.0.1 so we don't
      // depend on Windows resolving the magic .localhost TLD.
      "--host-resolver-rules=MAP *.localhost 127.0.0.1, MAP dashboard.localhost 127.0.0.1",
    ],
    defaultViewport: DESKTOP,
  });
  const only = (process.env.STROLLED_ONLY ?? "").toLowerCase();
  const audioMp3 =
    process.env.STROLLED_AUDIO_MP3 ?? path.join(process.env.TEMP || "/tmp", "sample-audio.mp3");
  try {
    if (only === "audio-bar") {
      const dashPage = await browser.newPage();
      await dashPage.setViewport(DESKTOP);
      await login(dashPage);
      await takeAudioBarShots(browser, dashPage, audioMp3);
    } else if (only === "audio-panel") {
      const dashPage = await browser.newPage();
      await dashPage.setViewport(DESKTOP);
      await login(dashPage);
      const tmp = process.env.TEMP || "/tmp";
      const mp3s = [
        process.env.STROLLED_AUDIO_MP3_1 ?? path.join(tmp, "sample-3s.mp3"),
        process.env.STROLLED_AUDIO_MP3_2 ?? path.join(tmp, "sample-6s.mp3"),
        process.env.STROLLED_AUDIO_MP3_3 ?? path.join(tmp, "sample-9s.mp3"),
      ];
      await takeAudioPanelShots(browser, dashPage, mp3s);
    } else {
      await takeAuthShots(browser);
      const dashPage = await takeDashboardShots(browser);
      await takeWidgetShots(dashPage);
      await takeProfileShots(browser);
      await takeComparisonShots(browser, dashPage);
      await takeAudioBarShots(browser, dashPage, audioMp3);
      await takeMoneyShots(browser);
    }
  } catch (err) {
    console.error("\nFATAL:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();

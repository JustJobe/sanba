# SanBa UI/UX Review — June 2026

**Scope:** Live walkthrough of sanba.my (desktop 1280px + mobile 390px, logged-out and logged-in flows, real upload→restore cycle) combined with code review of the Next.js frontend and FastAPI backend. Every finding below was verified either live in the browser or at a cited `file:line`.

**Method notes:** Logged in via the real OTP email flow; uploaded a test image via the live API and restored it (1 credit, job deleted afterwards); measured network traffic on the dashboard; tested mobile layout at 390px via embedded-frame emulation.

---

## 1. Executive summary

**Verdict:** The product core is genuinely strong — restoration is fast (~2s for a restore), the job lifecycle with automatic refunds is robust, the before/after slider is the best asset, and the brutalist stone/amber identity on the landing page and dashboard is distinctive. The weaknesses are around the edges: the experience fractures into four different visual languages as you move between pages, the mobile experience has real defects (nav overlap, store unreachable), a broken legacy page is still live, and the dashboard wastes bandwidth loading full-resolution images for thumbnails.

**Top 5 issues**

| # | Issue | Why it matters |
|---|-------|----------------|
| 1 | Legacy `/dashboard` route is live and **silently broken** ("No jobs found" + console error `Failed to fetch jobs`) | Any user who lands there thinks their photos are gone |
| 2 | Mobile nav has no background — logo/credits/toggle **overlap scrolling content**; the store link ("Buy More") is **hidden entirely on mobile** | Mobile users can't buy credits from the nav; the app looks broken while scrolling |
| 3 | Dashboard loads **66 full-resolution images** (originals + processed) for ~40px thumbnails; `_preview` files exist on disk but are unused outside the slider | Slow first paint, heavy data use on phones — the audience most likely to upload family photos |
| 4 | Users **cannot delete a completed job** — delete only renders while `queued` (the API permits deletion; verified 204) | Privacy: people upload irreplaceable family photos and can't remove them |
| 5 | Four disconnected design languages: brutalist landing/dashboard, rounded-SaaS store, plain-prose FAQ, warm-brown profile | Erodes trust right at the conversion-critical pages (store!) |

**Top 5 opportunities**

1. **Landing hero**: put a full-bleed interactive before/after slider + headline above the fold (the strongest sales asset currently requires scrolling).
2. **WhatsApp-first concierge**: wire the dead "Get a Quote" button to WhatsApp (+60 16 601 6074 is already in the footer) — the default purchase channel in Malaysia.
3. **"Photo ready" email notifications** via the already-integrated Mailjet — brings users back to spend the credits they already have.
4. **Share loop**: the public share page already exists with OG tags; add a "Restore yours free — 10 credits" CTA on it to make every shared photo an acquisition channel.
5. **Bahasa Malaysia localization** — site is `en-MY`, audience is Malaysian families, strings are all hardcoded English.

---

## 2. Findings by focus area

Impact: 🔴 high / 🟡 medium / ⚪ low · Effort: S (≤½ day) / M (1–3 days) / L (1 wk+)

### 2.1 Core user flow (upload → restore → repair/remaster → download)

| Finding | Evidence | Impact / Effort | Fix |
|---|---|---|---|
| Full-res images used for thumbnails; previews unused | Live: 66 `/files/...` full-size requests on dashboard load. Code: `JobDashboard.tsx:348,456,600-615` use `getFileUrl()`; `toPreviewUrl()` (`JobDashboard.tsx:227`) only feeds the slider | 🔴 / S | Use `toPreviewUrl()` for all thumbnail `<img>`s; add `loading="lazy"` |
| No delete for completed jobs | `JobDashboard.tsx:661-668` (`job.status === 'queued'` gate); `DELETE /jobs/{id}` returned 204 on a completed job | 🔴 / S | Show delete (with confirm) on all statuses; consider a stated retention/auto-purge policy as a trust feature |
| Job identity is a hex ID; filename is tiny grey text | Live screenshots; `Job #aac3c534` etc. | 🟡 / S | Title = first filename (or user-editable name); ID demoted to tooltip |
| Raw AI model names exposed in a per-job dropdown ("GEMINI 3.1 FLASH") | `JobDashboard.tsx:680-683,732-735` render `display_name` from pricing endpoint | 🟡 / S | Rename tiers to user language ("Standard ✦ 2cr" / "Premium ✦ 4cr") in `model_tiers.py` display names; keep model IDs internal |
| Cryptic icon strip on each job card (copy, eye, gold/violet buttons, 30PP/31FP badges) | Live screenshots; titles exist but no visible labels | 🟡 / M | Consolidate per-file actions into one "view file" row or popover with labeled actions; drop internal `30pp/31fp` badges |
| Flat 5s polling forever, even with no active jobs; no pagination (all jobs fetched every 5s) | `JobDashboard.tsx` poll `useEffect`; archive grows unbounded | 🟡 / M | Poll 3–5s only while a job is `processing`/`pending`, back off to 30–60s idle; paginate or lazy-load the archive |
| No "resend code" in OTP step; OTP input accepts unlimited characters | Live: typed 12 chars into the field; only "BACK TO EMAIL" exists; no `maxLength` in `app/login/page.tsx` | 🟡 / S | `maxLength={6}`, `inputMode="numeric"`, `autoComplete="one-time-code"`, resend button with countdown |
| Upload→restore is a two-step manual flow (upload, then find job, then click Restore) | Live walkthrough | 🟡 / M | Offer "restore automatically after upload" (default on) — restore is fast and cheap; keep manual queue as an option |
| Restoration is impressively fast (~2s) and polling picks new jobs up within 5s | Live test job `bcc569e9` | ✅ strength | Market it ("restored in seconds") |
| Comparison modal is good: clear labels, drag hint, share button | Live | ✅ strength | — |

### 2.2 Conversion & landing

| Finding | Evidence | Impact / Effort | Fix |
|---|---|---|---|
| No hero above the fold: page opens with eyebrow text + credits banner + three dense text cards; sliders are below the fold | Live screenshot of `/` logged out | 🔴 / M | Full-bleed before/after slider + one-line promise + single CTA above the fold; move credit banner below |
| Logged-out home nav has no Gallery or Store links (FAQ + Login only); gallery nav differs (Gallery/Login/Join) | Live screenshots; nav markup in `app/page.tsx:57-86` vs gallery layout | 🟡 / S | One shared nav component: Gallery, Pricing/Store, FAQ, Login/Join |
| Store page is off-brand and the **dead "Get a Quote" button is its most prominent CTA** (filled orange); credit packages are plain grey rows | Live screenshot; `app/store/page.tsx` (no handler on quote button) | 🔴 / S–M | Wire quote button to WhatsApp/mailto now (S); restyle store to brand tokens, give packages price-per-credit framing and a highlighted recommended pack (M) |
| Only 2 credit packs (50/RM9.90, 200/RM29.90); no anchor/value framing | Live + `payments.py` packages | 🟡 / M | Add a small starter pack and a large "archive" pack; show "RM0.15/photo" equivalents |
| Feature-card copy is small, dense, jargon-adjacent ("reconstruction meets fidelity") | Live screenshot | 🟡 / S | Cut each card to one plain-language sentence + price chip |
| Login left panel is a near-empty grey block at desktop | Live screenshot of `/login` | ⚪ / S | Put a before/after photo or testimonial there |
| Purchase history shows raw status "EXPIRED" for abandoned checkouts | Live `/profile` screenshot | ⚪ / S | Hide expired/pending-abandoned rows or label "Not completed" |
| FAQ content is genuinely good (decline policy, refunds, resolution expectations) | Live | ✅ strength | Link to it from upload zone and failure modals |

### 2.3 Mobile experience (390px)

| Finding | Evidence | Impact / Effort | Fix |
|---|---|---|---|
| Fixed nav (`mix-blend-difference`, no background) collides with content while scrolling — logo over job cards, credits over text | Live mobile screenshots; `app/page.tsx:57` | 🔴 / S | Give the nav a solid/blurred background bar on scroll (the `.frosted-glass` class already exists in `globals.css`) |
| Store link hidden on mobile (`hidden sm:inline`) | `app/page.tsx:79-80` | 🔴 / S | Always show Credits + Buy More; collapse Account/Logout into a menu if space is tight |
| Three verbose feature cards stack before the upload zone — heavy scroll to the primary action for a returning user | Live mobile screenshots | 🟡 / S | Collapse feature cards into a compact strip (or hide for logged-in users) |
| Job-card action rows wrap into cramped clusters; tap targets ~32px | Live mobile screenshots | 🟡 / M | Part of the JobCard redesign — single labeled action row, 44px targets |
| Slider touch support works; store/login render cleanly at 390px | Live | ✅ strength | — |

### 2.4 Polish, consistency & accessibility

| Finding | Evidence | Impact / Effort | Fix |
|---|---|---|---|
| **Legacy `/dashboard` is live and broken** ("No jobs found", console `Failed to fetch jobs`, different nav/upload UI with COLOR/B&W picker) | Live + console capture; `app/dashboard/page.tsx` (489 LoC) | 🔴 / S | Replace the page with a redirect to `/`; delete the dead component |
| Four design languages across pages (brutalist / SaaS-rounded / plain prose / warm brown) | Live screenshots of `/`, `/store`, `/faq`, `/profile` | 🔴 / M–L | Extract shared Button/Card/Modal/PageHeader primitives on the brutalist tokens; migrate store + profile + FAQ |
| Accessibility: icon-only buttons rely on `title`, no `aria-label`s, modals lack `role="dialog"`/focus trap, no visible focus rings, some thumbnails have no `alt` | `JobDashboard.tsx:600-615` (alt-less imgs), modal markup ~`:961+` | 🟡 / M | One a11y sweep: aria-labels, `role="dialog"` + focus trap, `:focus-visible` ring in `globals.css`, alt text, `aria-live="polite"` on the job list |
| US-format phone placeholder "+1 (555) 000-0000" on a Malaysian site | Live `/profile`; `app/profile/page.tsx` | ⚪ / S | "+60 12-345 6789" |
| Timestamps "4/19/2026, 8:18:28 PM" (US format, seconds noise) | Live job cards | ⚪ / S | `toLocaleDateString('en-MY', …)` short format, no seconds |
| Backend leaks raw provider/DB errors: `detail="Payment provider error: {str(e)}"` | `backend/routers/payments.py` (~line 140) | 🟡 / S | Log the detail server-side, return a generic message |
| OTP endpoint has no rate limit or attempt cap (in-memory store) | `backend/routers/auth.py:152-220` | 🟡 / S | slowapi limit on `/request-otp` + max 5 verify attempts per code |
| English-only, hardcoded strings | `layout.tsx:111` `lang="en-MY"`; no i18n lib | 🟡 / L | next-intl with BM as first additional locale (Phase 3) |

---

## 3. Feature & UX suggestions (beyond fixes)

Ordered by expected impact-per-effort:

1. **"Your photo is ready" email** (Mailjet already wired for OTP) — when AI repair/remaster completes, email a preview + link. Brings users back; AI ops take ~30s and people tab away. *(M)*
2. **WhatsApp concierge funnel** — "Get a Quote" → `wa.me/60166016074` prefilled message. Also add a small WhatsApp contact bubble on FAQ/store. *(S)*
3. **Share-page acquisition loop** — `/share/[id]` already renders OG-tagged comparisons; add a footer CTA "Restore your photos free — 10 credits" + signup link. Track `?ref=share`. *(S)*
4. **Auto-restore on upload** (toggle, default on) — removes the manual second step for the 90% case. *(S–M)*
5. **Batch AI repair/remaster** — "Repair all N files" per job with a single confirm + total cost; currently each file is a separate click. *(M)*
6. **Referral credits** — `incentive_plans` table + credit ledger already exist; add a referral code per user and a "Give 5, get 5" card on the dashboard. *(M–L)*
7. **Archive search/filter + job renaming** — becomes necessary once pagination lands. *(M)*
8. **Privacy promise** — page stating storage location, retention, deletion rights + auto-purge originals after N days (with download reminder email). Differentiator for sentimental photos. *(M)*
9. **BM localization** — `ms-MY` strings via next-intl once the design system pass is done. *(L)*
10. **Smarter progress** — adaptive polling (fast while processing, slow idle) is enough; SSE/WebSocket not warranted at current traffic. *(S)*

---

## 4. Phased roadmap

### Phase 1 — Quick wins (each ≤ a session; ship in any order)
1. Redirect `/dashboard` → `/` and delete the legacy page (`app/dashboard/page.tsx`).
2. Mobile nav: frosted background on scroll + always-visible store link (`app/page.tsx:57-86`).
3. Thumbnails use `_preview` URLs + `loading="lazy"` (`JobDashboard.tsx:348,456,600-615`).
4. Delete button for completed jobs with confirm (`JobDashboard.tsx:661`).
5. OTP polish: `maxLength`, numeric inputmode, `autoComplete="one-time-code"`, resend with countdown (`app/login/page.tsx`); backend rate limit + attempt cap (`auth.py`).
6. Wire "Get a Quote" → WhatsApp; visually demote it below credit packages (`app/store/page.tsx`).
7. Sanitize payment error responses (`payments.py`).
8. Micro-copy sweep: +60 phone placeholder, en-MY dates, hide EXPIRED purchases, model tier display names ("Standard"/"Premium") in `model_tiers.py`.

### Phase 2 — Core experience (1–2 weeks)
1. **Design system pass**: shared `Button`, `Card`, `Modal`, `PageHeader`, `StatusBadge` components on the brutalist tokens; migrate store, profile, FAQ. *(the biggest trust win)*
2. **JobDashboard decomposition** (1115 LoC → `JobCard`, `FileActions`, `CompareModal`, `useJobs` hook): friendly job titles, labeled actions, 44px tap targets, `aria` roles, batch repair button.
3. **Landing hero rework**: above-the-fold slider + headline + single CTA; compact feature strip; shared nav with Gallery/Store links.
4. **Adaptive polling + archive pagination** (backend: `GET /jobs/?offset&limit`; frontend: lazy-load).
5. **A11y sweep** as part of the above (focus rings, dialog roles, alt text, aria-live).

### Phase 3 — Growth (sequenced by appetite)
1. "Photo ready" email notifications.
2. Share-page CTA + `?ref=` tracking.
3. Auto-restore on upload toggle.
4. Referral program on top of `incentive_plans`.
5. Privacy/retention policy + auto-purge with reminder email.
6. Store revamp: 3–4 packs, per-photo value framing, recommended pack highlight.
7. BM localization.

---

## 5. Verification of this review

- Live evidence captured 2026-06-10 against production sanba.my (commit `d0576e0` deployed).
- Test artifacts cleaned up: test job `bcc569e9` deleted via API (1 credit consumed for the restore test; balance 32→31).
- Each roadmap item names its target files; Phase 1 items are independently shippable and testable by re-running the corresponding live check above (e.g. network tab shows `_preview` URLs; `/dashboard` 307s to `/`; mobile nav has a background).

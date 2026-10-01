# Swept — App Spec & Screens

Oct 1, 2026 · @Valentin

Swept reminds you to move your car before Montreal street cleaning: it knows which side of the street you parked on, reads the city's sign data for that side, and notifies you before the no-parking window starts — so you stop paying $100 tickets.

## What it does

One job: never miss a street-cleaning move. Everything else is secondary.

- **Who:** Montreal drivers who park on the street. First user: a Polestar 2 owner on avenue Coloniale (Plateau).
- **Platforms:** iPhone first (iOS 27), Android next. Same screens on both.
- **Season:** cleaning runs roughly 1 April – 1 December. Outside it, the app goes quiet.
- **Data:** Ville de Montréal open data — parking signs + street sides. About 22,000 block sides have a cleaning schedule; some boroughs (Verdun, LaSalle, Pierrefonds, Saint-Léonard) and the independent cities (Westmount, Mont-Royal) have little or none, so manual entry is a first-class path.

Rules every screen follows:

1. **Zero-tap when possible.** Parking is detected when the phone disconnects from the car's Bluetooth; the user only confirms from the notification.
2. **The side of the street is the unit.** Every schedule shown is for one side of one block, named the Montreal way ("rue Fabre, east side").
3. **Never cost a ticket.** When signs disagree, show what most signs say but remind at the earliest time any sign gives.
4. **Always check the sign.** The app is a reminder, not a legal authority; say so once, calmly, never as a scary banner.

## Screens

Eleven screens for v1, in the order a new user meets them. Screens 1–3 are shown once; 4–8 are the daily loop.

| # | Screen | Purpose | What's on it | Actions |
| --- | --- | --- | --- | --- |
| 1 | Welcome | Explain the promise in 5 seconds | App name, one-line promise, 3 small steps (park · we find your side · we remind you), illustration of a street sweeper | Get started |
| 2 | Permissions | Get notifications + location "Always" | Two cards, each with why it's needed in one sentence and its status; note that "Always" is asked in a second iOS prompt | Allow notifications · Allow location · Open Settings (if denied) |
| 3 | Car setup | Make parking automatic | Choice: "My car has Bluetooth" (guided Shortcuts setup of two automations — car connects = driving away, car disconnects = parked — illustrated steps, ends with a test) or "I'll tell the app myself" | Set up automation · Test it · Skip |
| 4 | Home — not parked | Start point when no car is recorded | Small map centred on you, nearest block sides tinted by cleaning day, last spot (if any) | I just parked here · Pick on map |
| 5 | Pick the side | Choose the exact side of the street | Full map, your GPS dot, both sides of nearby blocks drawn as separate lines coloured by cleaning day, day legend, address search | Tap a side · Search address · Recentre |
| 6 | Confirm spot | Show what applies before saving | Street + side + block (e.g. "avenue Coloniale 3817–3935, east side"), schedule (Fri 15:30–16:30, 1 Apr – 1 Dec), next cleaning date, warning if signs disagree or no data, reminders that will fire | Save · Other side · Edit schedule |
| 7 | Home — parked | The screen opened most often | Big countdown to the next cleaning ("Friday 15:30 — in 2 days"), street + side, mini map pin, reminder times, state colour (calm / soon / move now) | Wrong side? · Change reminders · I moved my car (only shown without the Bluetooth automation) |
| 8 | Manual schedule | Fill in when the city has no data or the user disagrees | Day chips (Mon–Sun, multi-select), start/end time, season start/end (defaults 1 Apr – 1 Dec), hint "copy it from the sign" | Save · Cancel |
| 9 | Reminders | Tune when notifications fire | Toggle + time for "evening before" (default 20:00), toggle + lead time for "before the window" (default 1 h), sound on/off | Save |
| 10 | Saved spots | One-tap re-parking on usual streets | List of named spots ("Home — Coloniale east"), each with its schedule | Park here · Rename · Delete |
| 11 | Settings | Everything else | Car automation status + re-test, language FR/EN, reminders link, data source credit (Ville de Montréal open data), disclaimer, version | — |

## Notifications

Notifications are the main interface: most days the user never opens the app. Each one needs a design for the lock screen and the expanded view with buttons.

| Notification | When | Example text | Buttons |
| --- | --- | --- | --- |
| Parked — confirm | ~20 s after the car's Bluetooth disconnects | "Parked on avenue Coloniale, east side? Cleaning Fri 15:30." | Yes · Other side · Not parked |
| Parked — no data | Same, on a block with no cleaning sign | "Parked on rue X. No cleaning sign found here — add it?" | Add schedule · Fine, no reminder |
| Evening before | Day before the window, default 20:00 | "Move your car before 15:30 tomorrow — Coloniale east side." | Moved it · Remind me later |
| Before the window | Default 1 h before | "Cleaning in 1 hour on Coloniale — move your car." | Moved it |
| Move now | Window has started and the car is still marked there | "Cleaning has started on Coloniale. Move now to avoid a ticket." | Moved it |
| Disputed sign | Bundled into the reminders above when signs disagree | Adds: "One sign here says 15:00 — reminding you for 15:00." | — |

## States to design

Each row is a variant of screens 4–7 that needs its own mock-up.

| State | Where | What the user sees |
| --- | --- | --- |
| Calm | Home — parked | Next cleaning more than 24 h away; neutral colour, countdown in days |
| Soon | Home — parked | Less than 24 h away; warm colour, countdown in hours |
| Move now | Home — parked | Window in progress; strong colour, "Move your car now", ends-at time |
| Safe until next week | Home — parked | Window just ended; "You're good until Fri 9 Oct" |
| Disputed signs | Confirm spot, Home — parked | Majority schedule big, the other one small ("1 sign says Fri 15:00"), reminder set to the earliest |
| No data | Confirm spot | "No cleaning sign found for this side" + Add schedule (screen 8) |
| Off-season | Home | "No street cleaning until 1 April" — app is calm, no countdown |
| Low GPS accuracy | Parked confirm, Pick the side | Accuracy circle on the map; ask the user to tap the side instead of guessing |
| Permission missing | Home banner | Notifications or "Always" location off → one-line banner with Fix |
| Automation not set up | Home banner, Settings | Gentle prompt to set up the Bluetooth trigger, dismissible |

## Design direction

- **Language:** French and English, French by default (the phone is in French). Montreal street words as people say them: "côté est", "balai mécanique", "\\P" sign wording only in the manual-entry hint.
- **Directions:** sides use Montreal's grid (north = up the island), not true compass — "east side of Coloniale" means what a Montrealer expects.
- **Map colours:** one colour per weekday for the side lines (7 colours, distinguishable for colour-blind users, with the day's initial on the line when zoomed in). Sides with no data in grey, disputed sides dashed.
- **Tone:** calm and specific — times, days, street names; urgency only in the Move-now state.
- **Platform:** native iOS look first (SF symbols, system sheets, lock-screen notifications), light and dark mode, Dynamic Type.
- **Hand-off:** the current build has a throwaway test screen only; the designs replace it entirely.

## Core flow

```
Car Bluetooth disconnects ─┐
"I just parked" (manual) ──┴→ Find the side (GPS + street data) → Sign data?
   yes → Confirm side (notification tap) → Reminders set (evening + 1 h before)
   no  → Enter schedule (copied from the sign) → Reminders set
   "Other side" → pick on the map → back to Find the side
Reminders set → Drive away (Bluetooth reconnects, spot cleared) → loop back to "Car disconnects"
```

The loop runs itself: when the car's Bluetooth connects, the spot is cleared and its reminders cancelled; the next disconnect records the new spot. The automatic path needs one tap (confirm the side); the manual path starts at screen 4 and goes through the map (screen 5). With no sign data, the user copies the schedule from the sign once.

## Out of scope for v1

- Winter snow-removal alerts (Info-Neige) — needs a server and push; next winter.
- Reading the car's position from the Polestar cloud.
- Several cars, sharing a car between people.
- Android's automatic trigger (Android gets manual parking first).
- Widgets and lock-screen Live Activity countdown — strong v2 candidates.

## Open questions

- [x] Name: Swept (decided).
- [x] Default reminder times: 20:00 the evening before + 1 h before — right?
- [x] Moving the car: decided — detected automatically (Bluetooth connects = spot cleared, next disconnect = new spot); "I moved my car" stays only as a manual fallback.
- [x] Brand colour and icon direction: 1a "Nuit — un côté allumé" (indigo night, one lit east curb).

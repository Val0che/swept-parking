# Handoff: Swept — Expo / React Native app (v1, iOS first)

## Overview
Swept reminds Montreal drivers to move their car before street cleaning, for the exact **side** of the block they parked on. Parking is detected automatically (car Bluetooth disconnect via a Shortcuts automation); most interaction happens through lock-screen notifications. `spec.md` (included) is the product spec — screen numbers below match it.

## About the Design Files
`Swept.dc.html` is a **design reference built in HTML** — a canvas of static iPhone mockups (393×852 pt, iPhone 15/16/17 Pro size) showing intended look, copy and states. It is not production code. Recreate it in the **Expo (SDK 54+) / React Native** codebase, aiming for a native iOS 27 look (Android ships later with the same screens). Open the HTML in a browser to view (keep `support.js` and `_ds/` beside it).

### Recommended stack
| Need | Library / approach |
|---|---|
| Navigation, stacks, sheets | `expo-router` (native stack). Sheets: `presentation: 'formSheet'` + `sheetAllowedDetents` (Confirm spot, Manual schedule); Pick-the-side bottom sheet: `@gorhom/bottom-sheet` over the map |
| Liquid Glass | `expo-glass-effect` (`GlassView`, iOS 26+), fallback `expo-blur` `BlurView` (intensity ~40, tint light/dark) on older iOS/Android |
| Map + side lines | `react-native-maps` (Apple Maps on iOS) with one `Polyline` per block side (`strokeColor` = day colour, `lineDashPattern` for disputed), `Marker` for day-initial pills (only above a zoom threshold), `Circle` for GPS accuracy |
| Mini street illustration (Home) | plain `View`s (see spec below) or `react-native-svg` |
| Icons | `expo-symbols` (SF Symbols) on iOS; `phosphor-react-native` as Android fallback |
| Notifications + action buttons | `expo-notifications` — `setNotificationCategoryAsync` per type with actions; `interruptionLevel: 'timeSensitive'` for Move now (add the Time Sensitive entitlement) |
| Expanded notification with mini map | Notification Content Extension — native Swift target via `@bacons/apple-targets` (config plugin); render a static `MKMapSnapshotter` image |
| Background location | `expo-location` (`requestBackgroundPermissionsAsync`) + `expo-task-manager` |
| Shortcuts automation ("Je pars" / "Je suis garé") | App Intents in a native target via `@bacons/apple-targets` (or a custom config plugin); intents write to shared storage / open a deep link `swept://parked` |
| Local scheduling | `expo-notifications` `scheduleNotificationAsync` with date triggers; cancel all on "Je pars" |
| Storage | `expo-sqlite` (city block-side dataset + saved spots) and `react-native-mmkv` for settings |
| i18n | `expo-localization` + `i18next`; default `fr-CA` |
| Theme | `useColorScheme()` → token object (below); Dynamic Type via `allowFontScaling` (default on) and `maxFontSizeMultiplier` ~1.6 on the 46 pt countdown |
| Haptics | `expo-haptics` on Save / side tap |

The native targets (content extension, App Intents) mean a **development build** is required (no Expo Go).

## Fidelity
**High-fidelity** for layout, copy, colours, hierarchy and states. Use native controls/metrics where they differ slightly (RN `Switch`, `@react-native-segmented-control/segmented-control`, native sheet grabber, `expo-status-bar`). Font in mocks is Inter (design-system font); on iOS use the system font (SF Pro — `fontFamily` omitted) with matching sizes/weights — keep headings at `fontWeight: '500'`, never bold. Grouped lists: build with `ScrollView` + card `View`s (radius 20, hairline separators via `StyleSheet.hairlineWidth`).

## Global rules
- French UI by default (`fr-CA`), English localized. Times 24 h; FR format `15 h 30`, EN `15:30`.
- Sides use Montreal's grid (north = up the island), named "avenue Coloniale, côté est".
- Never cost a ticket: when signs disagree, show the majority schedule large, the other small, and schedule reminders from the **earliest** time.
- Disclaimer appears once, calmly ("Swept vous rappelle ; le panneau a le dernier mot.") — never a banner.
- Light and dark mode on every screen.
- **Liquid Glass** only on the navigation layer: floating map buttons, search field, sheets, Home header buttons, notifications. Content cards stay opaque. Use `GlassView` from `expo-glass-effect` (check `isLiquidGlassAvailable()`; fall back to `BlurView`).

## Screens

### 7 · Home — parked (most important)
Vertical stack, 16 pt side margins, 12 pt gaps, below status bar:
1. **Header row (40 pt)**: left "Garée depuis lun. 18 h 12" (14, muted). Right: two 38 pt circular glass buttons — bookmark (→ Saved spots, 10) and gear (→ Settings, 11).
2. **Optional banner** (card, radius 16, 11/14 padding, 14 pt text): icon + one line + action ("Corriger" / "Configurer"), optional × to dismiss. Cases: notifications or "Always" location off (amber icon); automation not set up (accent Bluetooth icon, dismissible).
3. **Hero card** (radius 24, padding 20/20/22, 1 pt hairline): 56×3 pt state-coloured mark on top edge, soft radial glow of state colour from the top-left (20% → transparent at 62%).
   - State chip: icon + word, 15/600, state colour.
   - Eyebrow 16 muted; big line 46 pt / 1.04, weight 500, tracking −0.035em; subline 17.
   - States:
     | State | Rule | Chip | Eyebrow | Big | Sub |
     |---|---|---|---|---|---|
     | Calm | > 24 h away | calendar-check · "Calme" | Prochain nettoyage | Dans 2 jours | Vendredi 2 oct. · 15 h 30 |
     | Soon | < 24 h | clock-countdown · "Bientôt" | Nettoyage aujourd'hui | Dans 4 h 42 | Vendredi · 15 h 30 – 16 h 30 |
     | Move now | window in progress | warning · "Déplacez maintenant" | Nettoyage en cours | Déplacez votre voiture | Contravention possible jusqu'à 16 h 30 |
     | Safe | window just ended | check-circle · "Tranquille" | Vous êtes tranquille | Jusqu'au 9 oct. | Vendredi prochain · 15 h 30 |
     | Off-season | Dec 1 – Apr 1 | snowflake · "Hors saison" | Pas de nettoyage cet hiver | Jusqu'au 1er avril | Swept se fait discret… |
   - **Move now only**: whole card tinted red (17%→7% mix into card), 6 pt progress bar (elapsed share of window), labels "15 h 30" / "Fin 16 h 30 · encore 48 min", and a 52 pt capsule outlined red button "J'ai déplacé ma voiture" — **only shown when the Bluetooth automation isn't set up**.
   - **Disputed**: dashed top rule + signpost icon (amber) + "1 panneau indique ven. 15 h 00 — le rappel suit l'heure la plus tôt."
4. **Spot card** (radius 24): 96 pt illustration (top-down street: road band 124 pt wide centred, faded west curb 3 pt at 40%, dashed centre line, car glyph pointing north against the east curb, east curb 6 pt in the side's day colour with glow; dashed curb when disputed; "N ↑" top-left). Below (padding 14/16): street 20/500, "Côté est · 3817–3935" 14 muted, day pill + "Ven. 15 h 30 – 16 h 30 · 1 avr. – 1 déc." 15. Bottom row 46 pt: "Mauvais côté ?" (accent, arrows-left-right) + chevron → Pick the side.
5. **Reminders card**: header "Rappels" / "Modifier" (→ 9); rows 44 pt: icon, label, time. Sent reminders show check-circle and muted text. Hidden in Move now and Off-season.
6. Footer disclaimer 12 muted (hidden when a banner or disputed note is shown).

English version shown for Home only (copy in the HTML logic `COPY.en`).

### 5 · Pick the side
Full-screen map. Top: 48 pt glass close button + glass capsule search field "Rechercher une adresse". Glass recentre button bottom-right above the sheet. Floating glass bottom sheet (inset 8 pt, radius 40):
- Default: "Touchez votre côté de rue" (22/500) + legend grid (3 cols): 7 day pills + "pas de données" (grey) + "contradictoire" (dashed outline).
- Side selected: day pill + "avenue Coloniale, côté est", "3817–3935 · entre Duluth et Napoléon", schedule row, opposite-side row ("En face, côté ouest : jeudi 9 h – 10 h"), "Continuer".
- Low GPS accuracy: accuracy circle on map, glass pill "Position imprécise · ± 60 m", title "De quel côté êtes-vous ?" — never guess the side.

**Map rendering**: each block side is its own polyline offset ~9 m from the street centreline toward the curb, inset from intersections. Colour = cleaning weekday; day initial pill (Lu Ma Me Je Ve Sa Di / Mo Tu We Th Fr Sa Su) on the line when zoomed in; grey = no data; dashed = disputed. Selected side drawn 1.8× wider with a 25% glow. GPS dot uses the brand accent (not system blue, which collides with Monday/Friday blues).

### 6 · Confirm spot
Map on top (~270 pt) with the side highlighted and pinned; floating glass sheet (inset 8, radius 44) from y≈230:
- Title (28/500) + "3817–3935 · côté est · entre Duluth et Napoléon", close ×.
- Schedule card: 40×28 day pill, "Vendredi · 15 h 30 – 16 h 30", "Du 1er avril au 1er décembre"; divider; "Prochain passage : ven. 2 oct., dans 2 jours".
- "Rappels prévus" list (the exact reminders that will fire).
- "Enregistrer" (primary) + "Autre côté" | "Modifier l'horaire" (secondary).
- **Disputed**: dashed pill, "3 panneaux sur 4", signpost row "1 panneau indique ven. 15 h 00 – 16 h 00" + explanation; reminder moves to 14 h 00.
- **No data**: grey "–" pill, "Aucun panneau de nettoyage trouvé pour ce côté" + help copy; reminders "Aucun, tant qu'il n'y a pas d'horaire"; primary "Ajouter l'horaire" (→ 8), secondary "Autre côté" | "Pas de panneau ici".

### Notifications (lock screen) — main interface
Each designed collapsed and expanded (long-press). Expanded uses a **Notification Content Extension** (native Swift target via `@bacons/apple-targets`) with a mini map (150 pt, radius 16) of the highlighted side; without it, iOS shows the standard expanded view with the same action buttons. Register each row below as an `expo-notifications` category; handle taps with `addNotificationResponseReceivedListener` (`actionIdentifier`). Action buttons:
| Type | When | Title / body (FR) | Actions |
|---|---|---|---|
| Parked — confirm | ~20 s after BT disconnect | "Garée sur l'avenue Coloniale, côté est ?" / "Nettoyage ven. 15 h 30. Confirmez ou changez de côté." | Oui, c'est ça · Autre côté · Pas garé |
| Parked — no data | same | "Garée sur la rue Galt, côté ouest" / "Aucun panneau de nettoyage trouvé ici. L'ajouter ?" | Ajouter l'horaire · Ça va, pas de rappel |
| Evening before | 20:00 default | "Demain 15 h 30 · Coloniale, côté est" / "Déplacez votre voiture avant 15 h 30 demain." | Voiture déplacée · Me le rappeler plus tard |
| Before window | 1 h before | "Nettoyage dans 1 h" / "Avenue Coloniale, côté est. Déplacez votre voiture avant 15 h 30." | Voiture déplacée |
| Move now | window started, car still there — **Time Sensitive** | "Le nettoyage a commencé" / "Coloniale, côté est. Déplacez-la maintenant pour éviter une contravention." | Voiture déplacée |
| Disputed (bundled) | added to the above | extra line: "Un panneau ici indique 15 h 00 (les autres, 15 h 30) — rappel réglé sur 15 h 00." | — |

### 1 · Welcome
Illustration slot 300 pt (street sweeper — asset still to commission), "Swept" 40/500, promise 21 pt, three icon steps (Vous vous garez · On trouve votre côté de rue · On vous rappelle de bouger), primary "Commencer".

### 2 · Permissions
"Deux autorisations". Card per permission: icon tile, name, one-sentence reason, status (green "Autorisées"). Location card notes iOS asks twice ("Remplacer par Toujours") and has "Autoriser la localisation". Link "Refusé par erreur ? Ouvrir Réglages". "Continuer" disabled until both granted.

### 3 · Car setup
Two radio cards: "Ma voiture a le Bluetooth" (Recommandé; 4 numbered Shortcuts steps: Bluetooth automation → connects = "Swept : je pars", disconnects = "Swept : je suis garé", test) and "Je le dirai moi-même". Primary "Configurer l'automatisation", text button "Passer pour l'instant". Ship two App Intents (native target): *Je pars* (clears spot, cancels reminders) and *Je suis garé* (records location → confirm notification). "Tester" waits for the intent to fire and shows a test notification.

### 8 · Manual schedule (sheet)
Nav: Annuler / Horaire / Enregistrer. Hint card with a mini \P sign mock ("Copiez-le du panneau"). Day chips Lu–Di (multi-select, selected = day colour), Début/Fin time pickers, Saison Du/Au (defaults 1 avril – 1 décembre), footer preview of resulting reminders.

### 9 · Reminders
Grouped: "La veille au soir" toggle + Heure 20:00; "Avant le début" toggle + segmented 30 min / 1 h / 2 h; "Son" toggle; explanatory footer with concrete times; "Enregistrer".

### 10 · Saved spots ("Lieux")
Grouped list rows: day pill, name ("Maison — Coloniale est"), schedule, outlined capsule "Garer ici". Swipe actions: Renommer (neutral), Supprimer (red). Add (+) in nav bar.

### 11 · Settings ("Réglages")
Voiture: Polestar 2 · "Automatisation active · testée le 28 sept." + "Tester à nouveau". Général: Langue segmented Français/English; Rappels ›; Lieux enregistrés ›. À propos: data source (Ville de Montréal open data, last update date, external link), disclaimer paragraph. Footer "Swept 1.0 (27) · fait à Montréal".

## Suggested routes (expo-router)
`app/(onboarding)/welcome · permissions · car` · `app/index` (Home: parked / not parked) · `app/pick` (full-screen map) · `app/confirm` (formSheet, detents [0.75, 1]) · `app/schedule` (formSheet) · `app/reminders` · `app/spots` · `app/settings`. Deep links `swept://confirm?side=…` from notification taps.

## State Management
Suggested: `zustand` store persisted to MMKV; dataset queries in SQLite.
- `parkedSpot?`: { blockSideId, street, side, addressRange, coordinate, parkedAt, source (auto/manual) }
- `schedule` for the side: { weekdays[], start, end, seasonStart, seasonEnd, signsAgree, minority? (earliest alternative), source (city/manual) }
- `homeState` derived from now vs. next window: calm (>24 h) · soon (<24 h) · moveNow (in window) · safe (window ended, until next) · offSeason · notParked.
- `reminderSettings`: eveningEnabled, eveningTime (20:00), leadEnabled, leadMinutes (60), sound.
- `automationStatus`: notSetUp / active (lastTest date). Show "J'ai déplacé ma voiture" only when notSetUp.
- `permissions`: notifications, locationAlways → banner on Home if missing.
- `savedSpots[]`.
- Data: Ville de Montréal open data (parking signs + street sides), bundled + periodically refreshed. Reminder time = earliest time any sign on that side gives.
- Bluetooth connect → clear spot + cancel pending notifications. Disconnect → locate, match nearest block side; if GPS accuracy can't separate sides, ask (Pick the side, low-accuracy state).

## Design Tokens
Derived from the Nocturne design system (`_ds/.../styles.css`). Put these in a `theme.ts` exporting `light` / `dark` objects, selected with `useColorScheme()`; weekday colours as `days.light[0..6]` / `days.dark[0..6]` (Monday-first).

**Light**: bg `#eceefa` · card `#f3f5fe` · text `#161826` · muted `#595d6c` · hairline `rgba(22,24,38,.10)` · accent `#796cbf` (text on tint `#5d5294`) · secondary fill `rgba(22,24,38,.06)`
**Dark**: bg `#161826` · card `#232532` · text `#e9e9ed` · muted `#9397ab` · hairline `rgba(233,233,237,.13)` · accent `#9184d9` (text on tint `#d2cefd`) · fill `rgba(233,233,237,.07)`

**State colours** (light / dark): Calm = accent `#796cbf` / `#9184d9` · Soon `#a8650a` / `#e8a84a` · Move now `#c3352f` / `#ff6b5e` · Safe `#2e8457` / `#5cc98e`. Always paired with a word + icon.

**Weekday colours** (Okabe-Ito, colour-blind safe; light / dark; label text):
Lu `#D68F00`/`#E69F00` · Ma `#3A9BD9`/`#56B4E9` · Me `#009E73`/`#1DB88E` · Je `#D4C21E`/`#F0E442` · Ve `#0072B2` (text `#f3f5fe`)/`#4A9BE0` · Sa `#D55E00`/`#EE7733` · Di `#CC79A7`/`#DD8DBA`. Other labels use `#161826`. No data grey `#a3a7b8`/`#5f6373`.

**Map** (light / dark): blocks `#dfe2f0`/`#1b1e2b`, roads `#f7f8fd`/`#2b2e3c`, line casing `rgba(22,24,38,.30)`/`rgba(8,9,15,.75)`.

**Radii**: cards 20–24, banners 16, capsule buttons = height/2, sheets 40–44 (floating, 8 pt inset), app icon 22.5%.
**Buttons**: primary 52 pt capsule, 1.5 pt accent border, accent 14% tint fill, 17/600; secondary 46 pt capsule, fill colour, 15/500.
**Type** (SF Pro): big countdown 46/500; screen titles 28–34/500; card titles 20/500; body 15–17; captions 12–14.

## Brand
Recommended direction **1a "Nuit — un côté allumé"**: app icon is a street seen from above on a deep indigo gradient (`#353b80` → `#161826`), faint road band, dim west curb (`#595d6c`), one lit east curb in `#b5abfc` with `#9184d9` glow. Alternatives 1b (monochrome sweep) and 1c (sign red) are documented in the canvas, with their trade-offs. Final artwork is generated by `design/icon/render.mjs` into `app/assets/` (iOS icon, Android adaptive layers + monochrome, splash, favicon); splash background `#161826`.

## Assets
- Icons: Phosphor (regular / fill / bold) in the mocks → `expo-symbols` SF Symbols on iOS (e.g. bookmark, gearshape, calendar.badge.checkmark, timer, exclamationmark.triangle.fill, checkmark.circle.fill, snowflake, car.side, arrow.left.arrow.right, moon, alarm, signpost.right, bell.slash, location.fill); keep `phosphor-react-native` equivalents (same names as in the HTML) for Android.
- App icon: generate via `app.json` `ios.icon` (iOS 26+ layered icon from Icon Composer if available).
- Welcome illustration: placeholder — to be commissioned.
- Map: in the mocks it's a schematic drawing of the Plateau grid; implement with `react-native-maps` + `Polyline` overlays generated from city data (offset each side's geometry ~6–9 m from the centreline toward its curb, trimmed ~10 m from intersections). Render only sides within the visible region for performance.

## Files
- `Swept.dc.html` — full canvas: Home (16 variants), Pick the side (3), Confirm (3), Notifications (6 × collapsed/expanded), screens 1–3 and 8–11, brand and colour system. Copy for every state is in its logic block (`COPY`, `notifs`).
- `support.js`, `_ds/` — needed to open the HTML.
- `spec.md` — product spec.

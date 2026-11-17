---
inclusion: always
---
# Product Steering — Haunted Harvest (Panen Hantu)

## What it is
A free, offline-first farmer's companion web app for smallholder farmers, built for
Kiroween 2026 (Frankenstein category). It stitches four incompatible things into one tool:
live weather data, lunar planting lore, a rule-based crop-disease expert system, and a
haunted Halloween UI. No backend, no accounts, no API keys, no cost to the farmer.

## Audience
Smallholder farmers in Indonesia and other tropical regions, and anyone growing rice,
chili, tomato, maize, shallot, or soybean. Many users are on cheap phones with flaky
internet, so the app must work offline after first load (except the live weather panel,
which degrades gracefully to a cached sample with a clear notice).

## Rules
- Free-only: no paid APIs, no paid hosting, no tracking, no ads, no sign-up.
- Honesty: the Crop Doctor is a rule-based expert system over a curated knowledge base,
  NOT an AI image diagnosis. Say so in the UI and the docs. Treatment advice is general
  guidance; always advise consulting the local agricultural extension officer (penyuluh)
  for severe outbreaks. Never invent a pesticide dose — give product classes and point to
  the label.
- English UI (Devpost materials must be in English). Indonesian crop names appear as flavor.
- Every feature must work from a static file host. No build step, no server.
- Accessibility: readable contrast, keyboard-navigable, works at 360px wide.

# Requirements — Haunted Harvest (Panen Hantu)

## Introduction
A free static web app for smallholder farmers that stitches live weather, lunar planting
lore, and a rule-based crop-disease expert system into one haunted-harvest companion.
Built with Kiro (CLI) using spec-driven development for Kiroween 2026, Frankenstein category.

## Glossary
- **Condition**: one disease or pest entry in the knowledge base (24 total).
- **Symptom**: one observable sign (e.g. "yellow spots on leaves") attached to a condition.
- **Diagnosis**: a ranked list of conditions for a crop given checked symptoms.
- **Bestiary**: the monster-manual view of all conditions.
- **Moon phase**: the astronomically computed lunar phase for a date.

## Requirements

### Requirement 1: Crop Doctor diagnosis
**User Story:** As a farmer, I want to check symptoms on my crop, so that I get a ranked
list of likely diseases/pests with treatment advice.

#### Acceptance Criteria
1. WHEN a user selects a crop and checks one or more symptoms, THE SYSTEM SHALL rank
   that crop's conditions by match score (matched symptoms / total symptoms) descending.
2. WHEN no symptom is checked, THE SYSTEM SHALL show a prompt to select symptoms, not
   an empty diagnosis.
3. WHEN two conditions tie on score, THE SYSTEM SHALL order the higher-severity condition first.
4. WHEN a diagnosis is shown, THE SYSTEM SHALL display confidence (High >= 0.6,
   Medium >= 0.35, Low otherwise), cause, organic treatment, chemical treatment class,
   and prevention for each condition.
5. WHEN a diagnosis is shown, THE SYSTEM SHALL include the disclaimer that this is a
   rule-based guide, not a laboratory diagnosis, and severe outbreaks need the local
   extension officer.

### Requirement 2: Moon almanac
**User Story:** As a farmer, I want today's moon phase and planting guidance, so that I
can plan sowing using traditional almanac wisdom alongside the forecast.

#### Acceptance Criteria
1. WHEN given any date, THE SYSTEM SHALL compute the moon phase fraction in [0, 1) and
   one of the eight standard phase names.
2. WHEN showing the almanac, THE SYSTEM SHALL display illumination %, the phase name,
   and the dates of the next full moon and next new moon.
3. WHEN showing planting guidance, THE SYSTEM SHALL label traditional lore as tradition,
   not science, and pair it with the live weather outlook.

### Requirement 3: Weather oracle
**User Story:** As a farmer, I want a 7-day forecast for my farm, so that I know when to
spray, irrigate, or hold off.

#### Acceptance Criteria
1. WHEN online, THE SYSTEM SHALL fetch a 7-day forecast from Open-Meteo (free, no key)
   for the selected location and render max/min temperature and rain probability per day.
2. WHEN a day has rain probability >= 70%, THE SYSTEM SHALL mark it "don't spray".
3. WHEN offline or the fetch fails, THE SYSTEM SHALL show a cached sample forecast with
   a clear "offline sample" notice instead of failing silently.
4. WHEN a user searches a place name, THE SYSTEM SHALL resolve it via Open-Meteo
   geocoding and update the forecast.

### Requirement 4: Pest bestiary
**User Story:** As a farmer, I want to browse pests and diseases as monster cards, so
that I can learn to recognise them before they strike.

#### Acceptance Criteria
1. WHEN the bestiary is opened, THE SYSTEM SHALL list all 24 conditions as cards with
   monster name, crop, type, danger level (severity), and weakness (first-line treatment).
2. WHEN a user filters by crop or type, THE SYSTEM SHALL show only matching cards.
3. WHEN a card is opened, THE SYSTEM SHALL show full symptoms, treatments, and prevention.

### Requirement 5: Harvest log
**User Story:** As a farmer, I want to log what I planted and harvested, so that I can
track my seasons.

#### Acceptance Criteria
1. WHEN a user adds a log entry (crop, action, date, note), THE SYSTEM SHALL persist it
   in localStorage and show it in the log list.
2. WHEN entries exist, THE SYSTEM SHALL show counts per crop and total entries.
3. WHEN a user deletes an entry, THE SYSTEM SHALL remove it from storage and the list.

### Requirement 6: Free, static, testable
**User Story:** As the maintainer, I want zero backend and zero paid services, so the app
can live forever on free static hosting.

#### Acceptance Criteria
1. THE SYSTEM SHALL run from static files with no build step and no API keys.
2. THE SYSTEM SHALL pass `npm test` (unit tests + seeded property-based tests).
3. THE SYSTEM SHALL validate `data/knowledge.json` with `node scripts/validate-knowledge.mjs`.

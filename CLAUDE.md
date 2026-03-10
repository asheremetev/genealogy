# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Angular 21 web application for visualizing family trees. Data is stored in an Obsidian vault (Markdown files with YAML frontmatter in `vault/persons/` and `vault/families/` directories), parsed by a Node.js script into JSON, and rendered using the `family-chart` library (D3-based).

Angular app lives in the repository root. Obsidian vault is in [vault/](vault/).

## Commands

All commands run from the repository root:

```bash
# Dev server (parses vault first, then serves on port 4200)
yarn start

# Production build (parses vault first)
yarn build

# Re-parse Obsidian vault only
yarn parse-vault

# Run tests (Vitest)
yarn test

# Continuous build with file watching
yarn watch
```

There is no separate lint command configured. TypeScript strict mode catches most issues at compile time.

## Architecture

### Data Flow

```
vault/persons/*.md + vault/families/*.md (Obsidian vault, Russian YAML frontmatter)
    ↓  scripts/parse-vault.js
public/family-chart-data.json
    ↓  FamilyTreeService.loadData()
family-chart + D3 (visualization in DOM)
```

The vault parser runs automatically before `start` and `build`. The JSON is committed and served as a static asset.

### Key Files

| File                                                                               | Role                                                                                                      |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [scripts/parse-vault.js](scripts/parse-vault.js)                                   | Reads Obsidian `.md` files → generates `family-chart-data.json`                                           |
| [src/app/services/family-tree.service.ts](src/app/services/family-tree.service.ts) | Core logic: initializes family-chart, manages tree state (signals), handles person selection and settings |
| [src/app/services/export.service.ts](src/app/services/export.service.ts)           | PNG/SVG export via `html-to-image`, handles D3 zoom and DOM bounds                                        |
| [src/app/utils/card-html.util.ts](src/app/utils/card-html.util.ts)                 | Generates HTML card markup for each person node in family-chart                                           |
| [src/app/models/person.model.ts](src/app/models/person.model.ts)                   | `PersonData` interface and `SearchOption` type                                                            |
| [src/app/models/tree-settings.model.ts](src/app/models/tree-settings.model.ts)     | `TreeSettings` interface (depth, spacing, orientation, toggles)                                           |

### Component Tree

```
App
 └── FamilyTreeComponent
      ├── SearchComponent       — person search dropdown
      ├── SettingsPanelComponent — tree controls (depth, spacing, orientation)
      └── #chartContainer       — family-chart mounts here
```

### Angular Patterns Used

- **Zoneless Angular 21** with standalone components
- **Signals** for all reactive state (`signal()`, `computed()`, `readonly()`)
- **`inject()`** for dependency injection (no constructor injection)
- **`OnPush`** change detection throughout
- All components are standalone (no NgModules)

### Obsidian Vault Data Format

Person files use Russian YAML frontmatter fields: `пол` (gender M/F), `имя`, `фамилия`, `отчество`, `дата_рождения`, `дата_смерти`, `место_рождения`, `место_смерти`, `поколение`, `жив` (alive boolean), `достоверность`, `религия`, `имя_в_источнике`, `прозвище`.

Family files link parents (`отец`, `мать`) to children and encode marriage dates.

### Root Person Detection

`FamilyTreeService` auto-selects the root person by finding the individual with the minimum `generation` value in the loaded data.

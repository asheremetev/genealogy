# 🌳 Genealogy Vault

Персональный генеалогический архив на базе Obsidian.

## Навигация

### Документация

- 📐 [Схема данных](_schema/data-schema.md) — справочник всех YAML-полей и enum-значений
- 📘 [Сценарии](_config/scenarios.md) — пошаговые инструкции (добавить человека, брак, развод, древний предок без фамилии и т.д.)
- ⚙️ [Настройка плагинов](_config/plugin-setup.md)

### Панели

- 🏠 [Главная](_dashboards/main-dashboard.md)
- 🔍 [Качество данных](_dashboards/data-quality.md) — интерактивная валидация
- 👥 [Все персоны](_dashboards/persons-list.md)
- 🗺️ [Карта мест](_dashboards/places-map.md)

### Данные

| Папка          | Содержимое                                     |
| -------------- | ---------------------------------------------- |
| `persons/`     | По одной заметке на человека                   |
| `families/`    | Семейные единицы (пара + дата/место брака)     |
| `places/`      | Населённые пункты                              |
| `sources/`     | Архивные документы, книги, сканы, сайты        |
| `stories/`     | Устные истории, воспоминания, дневники         |
| `events/`      | Значимые события (миграции, войны и т.д.)      |
| `reports/`     | Журнал исследования, отчёты валидации          |
| `media/`       | Фото (`photos/`) и сканы документов (`scans/`) |
| `_templates/`  | Шаблоны Templater                              |
| `_dashboards/` | Сводные панели Dataview                        |
| `_schema/`     | Схема данных                                   |
| `_config/`     | Инструкции по настройке                        |

## Обязательные плагины

Dataview, Templater, Obsidian Git.

**Рекомендуемые:** Leaflet (карты), DB Folder (табличный ввод).

**Опциональные:** Kanban, Calendar, Excalidraw, Breadcrumbs.

## Headless-валидация

Из корня репозитория:

```bash
yarn validate-vault                  # полный отчёт
yarn validate-vault:baseline         # сравнить с зафиксированным baseline
yarn validate-vault:update-baseline  # зафиксировать текущее состояние
```

Pre-commit hook автоматически запрещает добавлять новые ошибки сверх baseline.
Полный отчёт сохраняется в `reports/validation-report.md`.

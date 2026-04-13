# ⚙️ Настройка плагинов и Obsidian

> [!note] Разовая настройка
> Этот файл нужен только при **первичной установке Vault** на новое устройство.
> При повседневной работе с данными он не нужен — смотри [[scenarios|Сценарии]] и [[data-schema|Схему данных]].

Обзор структуры: [[README]] · Схема данных: [[data-schema]]

---

## 1. Настройки Obsidian

### Files & Links

| Параметр                             | Значение      |
| ------------------------------------ | ------------- |
| Default location for new notes       | `persons`     |
| Default location for new attachments | `media`       |
| New link format                      | Relative path |
| Use `[[Wikilinks]]`                  | ✅ ON         |
| Detect all file extensions           | ✅ ON         |

### Editor

- Auto pair brackets: ✅ ON
- Fold heading: ✅ ON
- Strict line breaks: OFF

### Appearance

- Рекомендуемая тема: **Minimal**
- Размер шрифта: 14–16 px

---

## 2. Обязательные плагины

### 2.1 Dataview

SQL-подобные запросы по YAML — основа всех таблиц и дашбордов.

`Settings → Community Plugins → Browse → Dataview`

| Параметр                  | Значение     |
| ------------------------- | ------------ |
| Enable JavaScript Queries | ✅ ON        |
| Enable Inline Queries     | ✅ ON        |
| Date Format               | `YYYY-MM-DD` |

---

### 2.2 Templater

Умные шаблоны с авто-подстановкой даты, имени файла и т.п.

`Settings → Community Plugins → Browse → Templater`

| Параметр                               | Значение     |
| -------------------------------------- | ------------ |
| Template folder location               | `_templates` |
| Trigger Templater on new file creation | ✅ ON        |
| Enable Folder Templates                | ✅ ON        |

**Привязка шаблонов к папкам (Folder Templates):**

| Папка      | Шаблон                 |
| ---------- | ---------------------- |
| `persons`  | `_templates/person.md` |
| `families` | `_templates/family.md` |
| `places`   | `_templates/place.md`  |
| `sources`  | `_templates/source.md` |
| `stories`  | `_templates/story.md`  |
| `events`   | `_templates/event.md`  |

> **Использование:** создай файл в нужной папке — шаблон применится автоматически. Или: `Ctrl+P` → `Templater: Insert Template`.

---

### 2.3 Obsidian Git

Автоматический бэкап и версионирование через Git.

`Settings → Community Plugins → Browse → Obsidian Git`

**Подготовка:**

```bash
git init
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git add .
git commit -m "init: genealogy vault"
git push -u origin main
```

**Настройки:**

| Параметр                        | Значение                |
| ------------------------------- | ----------------------- |
| Vault backup interval (minutes) | `30`                    |
| Auto pull interval (minutes)    | `10`                    |
| Commit message                  | `vault backup {{date}}` |
| Pull updates on startup         | ✅ ON                   |

---

## 3. Рекомендуемые плагины

### 3.1 Leaflet (карты) ⭐

Интерактивные карты с местами жизни предков.

`Settings → Community Plugins → Browse → Obsidian Leaflet`

**Настройки Leaflet:**

| Параметр                      | Значение |
| ----------------------------- | -------- |
| Enable Dataview Inline Fields | ✅ ON    |

**Использование в заметках мест:**

В YAML указываем координаты двумя полями:

```yaml
широта: 57.7676
долгота: 40.9267
```

В теле заметки карта рендерится через блок:

````markdown
```leaflet
id: place-map
height: 400px
lat: `= this.широта`
long: `= this.долгота`
zoom: 12
marker: default, `= this.широта`, `= this.долгота`, `= this.название`
```
````

**Как найти координаты:**

1. Открой [Google Maps](https://maps.google.com)
2. Найди место, кликни правой кнопкой
3. Скопируй координаты:
    - Первое число → `широта`
    - Второе число → `долгота`

---

### 3.2 Другие (по желанию)

| Плагин       | Зачем                      |
| ------------ | -------------------------- |
| Kanban       | Доска задач исследования   |
| Calendar     | Навигация по журналу       |
| Excalidraw   | Ручные схемы деревьев      |
| Tag Wrangler | Массовое управление тегами |

---

## 4. Настройка Graph View

**Filters:**

- Exclude: `_templates`, `_dashboards`, `_config`, `_schema`

**Groups (цвета по папкам):**

| Путь            | Цвет          |
| --------------- | ------------- |
| `path:persons`  | 🔵 синий      |
| `path:families` | 🟢 зелёный    |
| `path:places`   | 🟠 оранжевый  |
| `path:sources`  | 🟣 фиолетовый |
| `path:stories`  | 🟡 жёлтый     |

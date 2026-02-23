# ⚙️ Настройка плагинов и Obsidian

Этот файл — полная инструкция по настройке Vault.
Обзор структуры и соглашения см. в [README.md](../README.md).

---

## 1. Настройки Obsidian

### Files & Links

| Параметр                             | Значение      |
| ------------------------------------ | ------------- |
| Default location for new notes       | `Persons`     |
| Default location for new attachments | `Media`       |
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
| `Persons`  | `_templates/person.md` |
| `Families` | `_templates/family.md` |
| `Places`   | `_templates/place.md`  |
| `Sources`  | `_templates/source.md` |
| `Stories`  | `_templates/story.md`  |
| `Events`   | `_templates/event.md`  |

> **Как использовать:** создай файл в нужной папке — шаблон применится автоматически. Или: `Ctrl+P` → `Templater: Insert Template` → выбрать шаблон вручную.

---

### 2.3 Obsidian Git

Автоматический бэкап и версионирование через Git.

`Settings → Community Plugins → Browse → Obsidian Git`

**Подготовка:**

1. Создай приватный репозиторий на GitHub
2. В терминале, в папке Vault:
   ```bash
   git init
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git add .
   git commit -m "init: genealogy vault"
   git push -u origin main
   ```

**Рекомендуемые настройки:**

| Параметр                        | Значение                |
| ------------------------------- | ----------------------- |
| Vault backup interval (minutes) | `30`                    |
| Auto pull interval (minutes)    | `10`                    |
| Commit message                  | `vault backup {{date}}` |
| Pull updates on startup         | ✅ ON                   |

---

## 3. Рекомендуемые плагины

### 3.1 Leaflet (карты)

Интерактивные карты с местами жизни предков.

`Settings → Community Plugins → Browse → Obsidian Leaflet`

Пример использования (в заметке о месте):

````markdown
```leaflet
id: kostroma-map
height: 400px
coordinates: [57.7676, 40.9267]
zoom: 12
marker: default, 57.7676, 40.9267, "Кострома"
```
````

### 3.2 DB Folder

Открывает папку как редактируемую таблицу — удобно для массового ввода данных по персонам.

`Settings → Community Plugins → Browse → DB Folder`

### 3.3 Breadcrumbs

Навигация по иерархии родства (parent → child).

`Settings → Community Plugins → Browse → Breadcrumbs`

Настройка полей:

- `отец` → тип: **up**
- `мать` → тип: **up**

### 3.4 Другие (по желанию)

| Плагин       | Зачем                      |
| ------------ | -------------------------- |
| Kanban       | Доска задач исследования   |
| Calendar     | Навигация по журналу       |
| Excalidraw   | Ручные схемы деревьев      |
| Tag Wrangler | Массовое управление тегами |

---

## 4. Настройка Graph View

**Filters:**

- Exclude: `_templates`, `_dashboards`, `_config`

**Groups (цвета по папкам):**

| Путь            | Цвет          |
| --------------- | ------------- |
| `path:Persons`  | 🔵 синий      |
| `path:Families` | 🟢 зелёный    |
| `path:Places`   | 🟠 оранжевый  |
| `path:Sources`  | 🟣 фиолетовый |
| `path:Stories`  | 🟡 жёлтый     |

---

## 5. Примеры Dataview-запросов

### Все персоны по поколениям

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Поколение",
  дата_рождения AS "Рождение",
  место_рождения AS "Место",
  достоверность AS "Достоверность"
FROM "Persons"
WHERE тип = "персона"
SORT поколение ASC, дата_рождения ASC
```

### Источники без оцифровки

```dataview
TABLE WITHOUT ID
  file.link AS "Источник",
  категория AS "Категория",
  архив AS "Архив",
  год_документа AS "Год"
FROM "Sources"
WHERE оцифровано = "нет"
SORT год_документа ASC
```

### Места с наибольшим числом рождений

```dataview
TABLE WITHOUT ID
  место_рождения AS "Место",
  length(rows) AS "Рождений"
FROM "Persons"
WHERE место_рождения
GROUP BY место_рождения
SORT length(rows) DESC
LIMIT 20
```

### Истории, требующие проверки

```dataview
TABLE WITHOUT ID
  file.link AS "История",
  рассказчик AS "Рассказчик",
  достоверность AS "Достоверность"
FROM "Stories"
WHERE достоверность = "низкая" OR достоверность = "средняя"
```

### Персоны без связи с источниками

```dataview
LIST
FROM "Persons"
WHERE тип = "персона"
FLATTEN file.outlinks AS outlink
WHERE !contains(string(outlink), "Sources")
GROUP BY file.link
```

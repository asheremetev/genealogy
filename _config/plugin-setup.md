# ⚙️ Настройка плагинов и Obsidian

Полная инструкция по настройке Vault.
Обзор структуры: [README.md](../README.md) · Схема данных: [data-schema.md](../_schema/data-schema.md)

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

**Использование в заметках мест:**

В YAML указываем координаты:

```yaml
координаты: [57.7676, 40.9267] # [широта, долгота]
```

В теле заметки карта рендерится автоматически через dataviewjs (см. шаблон place.md).

**Как найти координаты:**

1. Открой [Google Maps](https://maps.google.com)
2. Найди место, кликни правой кнопкой
3. Скопируй координаты (первое число — широта, второе — долгота)

**Пример блока Leaflet:**

````markdown
```leaflet
id: kostroma-map
height: 400px
coordinates: [57.7676, 40.9267]
zoom: 12
marker: default, 57.7676, 40.9267, "Кострома"
```
````

---

### 3.2 DB Folder

Открывает папку как редактируемую таблицу — удобно для массового ввода.

`Settings → Community Plugins → Browse → DB Folder`

---

### 3.3 Breadcrumbs

Навигация по иерархии родства (parent → child).

`Settings → Community Plugins → Browse → Breadcrumbs`

Настройка полей:

- `отец` → тип: **up**
- `мать` → тип: **up**

---

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

- Exclude: `_templates`, `_dashboards`, `_config`, `_schema`

**Groups (цвета по папкам):**

| Путь            | Цвет          |
| --------------- | ------------- |
| `path:persons`  | 🔵 синий      |
| `path:families` | 🟢 зелёный    |
| `path:places`   | 🟠 оранжевый  |
| `path:sources`  | 🟣 фиолетовый |
| `path:stories`  | 🟡 жёлтый     |

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
FROM "persons"
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
FROM "sources"
WHERE оцифровано = "нет"
SORT год_документа ASC
```

### Места с наибольшим числом рождений

```dataview
TABLE WITHOUT ID
  место_рождения AS "Место",
  length(rows) AS "Рождений"
FROM "persons"
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
FROM "stories"
WHERE достоверность = "низкая" OR достоверность = "средняя"
```

### Персоны без связи с источниками

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const sources = dv.pages('"sources"').where(s => s.тип === "источник");

const unsourced = persons.where(p => {
  return !sources.some(s =>
    s.персоны && s.персоны.some(per => per.path === p.file.path)
  );
});

if (unsourced.length > 0) {
  dv.table(["Персона", "Поколение", "Достоверность"],
    unsourced.map(p => [p.file.link, p.поколение, p.достоверность])
  );
} else {
  dv.paragraph("✅ Все персоны связаны с источниками");
}
```

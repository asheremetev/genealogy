---
тип: дашборд
название: Главная
---

# 🌳 Главная панель

Закрепи эту заметку (`Pin`) или установи как стартовую.

---

## 🧭 Навигация

| Дашборд                                 | Для чего                                         |
| --------------------------------------- | ------------------------------------------------ |
| 🔍 [[data-quality\|Качество данных]]    | Только ошибки: противоречия, схема, битые ссылки |
| 🎯 [[research-progress\|Прогресс]]      | Что ещё искать: приоритеты, пустые поля, пробелы |
| 📊 [[statistics\|Статистика]]           | Счётчики, покрытие источниками, регионы          |
| 👥 [[persons-list\|Персоны]]            | Все персоны и прогресс по поколениям             |
| 🗺️ [[places-map\|Карта мест]]           | Интерактивная карта                              |
| 📓 [[research-log\|Журнал]]             | Дневник исследования                             |
| 📘 [[scenarios\|Сценарии]]              | Типовые рабочие сценарии                         |
| 📐 [[data-schema\|Схема данных]]        | Справочник YAML-полей                            |
| ⚙️ [[plugin-setup\|Настройка плагинов]] | Dataview, Leaflet и др.                          |

---

## 📊 Коротко о объёме

```dataviewjs
const count = (folder, type) =>
  dv.pages(`"${folder}"`).where(p => p.тип === type).length;

dv.table(
  ["👤 Персон", "👨‍👩‍👧 Семей", "📅 Событий", "📄 Источников", "📍 Мест", "📖 Историй"],
  [[
    count("persons", "персона"),
    count("families", "семья"),
    count("events", "событие"),
    count("sources", "источник"),
    count("places", "место"),
    count("stories", "история")
  ]]
);
```

Подробнее — в [[statistics|📊 Статистике]].

---

## ⚠️ Требуют внимания

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const places  = dv.pages('"places"').where(p => p.тип === "место");

const noBirth      = persons.where(p => !p.дата_рождения).length;
const noParents    = persons.where(p => p.поколение > 0 && !p.отец && !p.мать).length;
const lowConf      = persons.where(p => p.достоверность === "предположение" || p.достоверность === "низкая").length;
const placesNoCoord = places.where(p => !p.широта || !p.долгота).length;
const highPriority = persons.where(p => p.приоритет === "высокий").length;

const items = [
  noBirth      && `Без даты рождения: **${noBirth}**`,
  noParents    && `Без родителей (пок. > 0): **${noParents}**`,
  lowConf      && `Низкая достоверность: **${lowConf}**`,
  placesNoCoord && `Мест без координат: **${placesNoCoord}**`,
  highPriority && `Высокий приоритет: **${highPriority}**`
].filter(Boolean);

if (items.length === 0) {
  dv.paragraph("✅ Все основные показатели в норме");
} else {
  items.forEach(i => dv.paragraph("• " + i));
  dv.paragraph("→ подробности в [[research-progress|🎯 Прогрессе]] и [[data-quality|🔍 Качестве данных]]");
}
```

---

## 🕐 Недавно изменённое

```dataview
TABLE WITHOUT ID
  file.link AS "Заметка",
  file.folder AS "Раздел",
  file.mday AS "Изменено"
FROM "persons" OR "families" OR "sources" OR "places" OR "stories" OR "events"
SORT file.mday DESC
LIMIT 8
```

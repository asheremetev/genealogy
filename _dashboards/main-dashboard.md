# 🌳 Главная панель

> ← Это главная рабочая панель. Рекомендуется закрепить её (`Pin`) или задать как стартовую заметку.

---

## 📊 Статистика

```dataviewjs
const persons = dv.pages('"Persons"').where(p => p.тип === "персона").length;
const families = dv.pages('"Families"').where(p => p.тип === "семья").length;
const sources = dv.pages('"Sources"').where(p => p.тип === "источник").length;
const places = dv.pages('"Places"').where(p => p.тип === "место").length;
const stories = dv.pages('"Stories"').where(p => p.тип === "история").length;

dv.table(
  ["👤 Персон", "👨‍👩‍👧 Семей", "📄 Источников", "📍 Мест", "📖 Историй"],
  [[persons, families, sources, places, stories]]
);
```

---

## ⚠️ Требуют внимания

### Низкая достоверность

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  достоверность AS "Достоверность",
  поколение AS "Поколение"
FROM "Persons"
WHERE достоверность = "предположение" OR достоверность = "низкая"
SORT поколение ASC
LIMIT 15
```

### Нет даты рождения

```dataview
LIST
FROM "Persons"
WHERE тип = "персона" AND !дата_рождения
LIMIT 15
```

### Нет родителей (поколение > 0)

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Поколение"
FROM "Persons"
WHERE тип = "персона" AND (!отец AND !мать) AND поколение > 0
SORT поколение ASC
LIMIT 15
```

---

## 👥 Все персоны

```dataview
TABLE WITHOUT ID
  file.link AS "Имя",
  поколение AS "Пок.",
  дата_рождения AS "Рождение",
  место_рождения AS "Место",
  дата_смерти AS "Смерть",
  достоверность AS "Дост."
FROM "Persons"
WHERE тип = "персона"
SORT поколение ASC, дата_рождения ASC
```

---

## 📋 Прогресс по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Поколение",
  length(rows) AS "Найдено",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "Persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

## 📄 Последние источники

```dataview
TABLE WITHOUT ID
  file.link AS "Источник",
  категория AS "Тип",
  год_документа AS "Год",
  оцифровано AS "Оцифр."
FROM "Sources"
SORT создано DESC
LIMIT 10
```

### Требуют оцифровки / запроса в архив

```dataview
TABLE WITHOUT ID
  file.link AS "Документ",
  архив AS "Архив",
  фонд AS "Фонд"
FROM "Sources"
WHERE (оцифровано = "нет" OR оцифровано = "частично")
  AND (!ссылка_онлайн OR ссылка_онлайн = "")
SORT год_документа ASC
```

---

## 🗺️ Места

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  существует AS "Сущ."
FROM "Places"
SORT file.name ASC
```

---

## ✅ Открытые задачи

```dataview
TASK
FROM "Persons" OR "Sources" OR "Places" OR "Reports"
WHERE !completed
LIMIT 25
```

---

## 🕐 Последние изменения

```dataview
TABLE WITHOUT ID
  file.link AS "Заметка",
  file.folder AS "Раздел",
  file.mday AS "Изменено"
FROM "Persons" OR "Families" OR "Sources" OR "Places" OR "Stories"
SORT file.mday DESC
LIMIT 10
```

---

## 🔗 Навигация

- 📂 [Persons](Persons/) — все персоны
- 📂 [Families](Families/) — семьи
- 📂 [Places](Places/) — места
- 📂 [Sources](Sources/) — источники
- 📂 [Stories](Stories/) — истории
- 📓 [Журнал исследования](Reports/research-log.md)
- ⚙️ [Настройка плагинов](_config/plugin-setup.md)

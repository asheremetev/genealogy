# 🧙‍♂️ Демо-дашборд: Семья Поттер-Уизли

> Это демонстрационная панель. В реальном проекте используйте `_dashboards/main-dashboard.md`.
> Все Dataview-запросы ссылаются на папку `_demo-harry-potter/`.

---

## 📊 Статистика

```dataviewjs
const base = "_demo-harry-potter";
const persons = dv.pages(`"${base}/Persons"`).where(p => p.тип === "персона").length;
const families = dv.pages(`"${base}/Families"`).where(p => p.тип === "семья").length;
const sources = dv.pages(`"${base}/Sources"`).where(p => p.тип === "источник").length;
const places = dv.pages(`"${base}/Places"`).where(p => p.тип === "место").length;
const stories = dv.pages(`"${base}/Stories"`).where(p => p.тип === "история").length;

dv.table(
  ["👤 Персон", "👨‍👩‍👧 Семей", "📄 Источников", "📍 Мест", "📖 Историй"],
  [[persons, families, sources, places, stories]]
);
```

> Ожидаемый результат: 10 персон, 4 семьи, 2 источника, 3 места, 1 история.

---

## 📋 Прогресс по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Поколение",
  length(rows) AS "Найдено",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "_demo/HP/persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

> Ожидаемый результат:
>
> | Поколение | Найдено | Выс. дост. | Есть отец | Есть мать |
> | --------- | ------- | ---------- | --------- | --------- |
> | -1        | 1       | 0          | 1         | 1         |
> | 0         | 3       | 3          | 1         | 1         |
> | 1         | 4       | 3          | 1         | 1         |
> | 2         | 2       | 0          | 0         | 0         |

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
FROM "_demo/HP/persons"
WHERE тип = "персона"
SORT поколение ASC, дата_рождения ASC
```

---

## ⚠️ Требуют внимания

### Низкая достоверность / предположения

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  достоверность AS "Достоверность",
  поколение AS "Пок."
FROM "_demo/HP/persons"
WHERE достоверность = "предположение" OR достоверность = "низкая" OR достоверность = "средняя"
SORT поколение ASC
```

### Нет данных о родителях

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Пок."
FROM "_demo/HP/persons"
WHERE тип = "персона" AND (!отец AND !мать) AND поколение > 0
SORT поколение ASC
```

---

## 👨‍👩‍👧 Семьи

```dataview
TABLE WITHOUT ID
  file.link AS "Семья",
  муж AS "Муж",
  жена AS "Жена",
  дата_брака AS "Брак",
  статус_брака AS "Статус"
FROM "_demo/HP/families"
SORT дата_брака ASC
```

---

## 🗺️ Места

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  регион_сейчас AS "Регион",
  существует AS "Сущ."
FROM "_demo/HP/Places"
SORT file.name ASC
```

---

## 📄 Источники

```dataview
TABLE WITHOUT ID
  file.link AS "Источник",
  категория AS "Тип",
  год_документа AS "Год",
  оцифровано AS "Оцифр.",
  достоверность AS "Дост."
FROM "_demo/HP/sources"
SORT год_документа ASC
```

---

## ✅ Открытые задачи

```dataview
TASK
FROM "_demo-harry-potter"
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
FROM "_demo-harry-potter"
SORT file.mday DESC
LIMIT 10
```

---

## 🔗 Навигация

- 📂 Persons — `_demo-harry-potter/Persons/`
- 📂 Families — `_demo-harry-potter/Families/`
- 📂 Places — `_demo-harry-potter/Places/`
- 📂 Sources — `_demo-harry-potter/Sources/`
- 📂 Stories — `_demo-harry-potter/Stories/`
- 📂 Events — `_demo-harry-potter/Events/`
- 📓 [Журнал](\_demo-harry-potter/Reports/2025-06-20 - initial-research.md)

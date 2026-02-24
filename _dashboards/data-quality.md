# 🔍 Качество данных — Валидация

Запускай этот дашборд раз в неделю для проверки целостности базы.

>  [Главная панель](_dashboards/main-dashboard.md)

---

## 📊 Общий статус

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const total = persons.length;
const withBirth = persons.where(p => p.дата_рождения).length;
const withFather = persons.where(p => p.отец).length;
const withMother = persons.where(p => p.мать).length;
const highConf = persons.where(p => p.достоверность === "высокая").length;

dv.table(
  ["Всего персон", "Есть д.р.", "Есть отец", "Есть мать", "Выс. дост."],
  [[total, withBirth, withFather, withMother, highConf]]
);

const pct = total > 0 ? Math.round((withBirth / total) * 100) : 0;
dv.paragraph(`**Полнота дат рождения:** ${pct}%`);
```

---

## ❌ Персоны без даты рождения

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Пок.",
  достоверность AS "Дост."
FROM "Persons"
WHERE тип = "персона" AND !дата_рождения
SORT поколение ASC
```

---

## ❌ Персоны без родителей (поколение > 0)

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Пок.",
  приоритет AS "Приоритет"
FROM "Persons"
WHERE тип = "персона"
  AND поколение > 0
  AND (!отец AND !мать)
SORT поколение ASC
```

---

## ❌ Персоны без пола

```dataview
TABLE WITHOUT ID file.link AS "Персона"
FROM "Persons"
WHERE тип = "персона" AND (!пол OR pол = "")
```

---

## ❌ Персоны без поколения

```dataview
TABLE WITHOUT ID file.link AS "Персона"
FROM "Persons"
WHERE тип = "персона" AND (!поколение AND поколение != 0)
```

---

## ⚠️ Некорректные enum-значения

### Пол

```dataview
TABLE WITHOUT ID file.link AS "Персона", пол AS "Значение"
FROM "Persons"
WHERE тип = "персона"
  AND пол
  AND пол != "М"
  AND пол != "Ж"
  AND пол != "неизвестно"
```

### Достоверность

```dataview
TABLE WITHOUT ID file.link AS "Заметка", достоверность AS "Значение"
FROM "Persons" OR "Sources" OR "Families"
WHERE достоверность
  AND достоверность != "высокая"
  AND достоверность != "средняя"
  AND достоверность != "низкая"
  AND достоверность != "предположение"
```

### Жизненный статус

```dataview
TABLE WITHOUT ID file.link AS "Персона", жив AS "Значение"
FROM "Persons"
WHERE жив
  AND жив != "да"
  AND жив != "нет"
  AND жив != "неизвестно"
```

### Оцифровано (источники)

```dataview
TABLE WITHOUT ID file.link AS "Источник", оцифровано AS "Значение"
FROM "Sources"
WHERE оцифровано
  AND оцифровано != "да"
  AND оцифровано != "нет"
  AND оцифровано != "частично"
```

---

## ⚠️ Источники без привязки к персонам

```dataview
TABLE WITHOUT ID
  file.link AS "Источник",
  категория AS "Тип",
  год_документа AS "Год"
FROM "Sources"
WHERE тип = "источник" AND (!персоны OR length(персоны) = 0)
```

---

## ⚠️ Семьи без даты брака и без детей

```dataview
TABLE WITHOUT ID
  file.link AS "Семья",
  муж AS "Муж",
  жена AS "Жена"
FROM "Families"
WHERE тип = "семья" AND !дата_брака
```

---

## ⚠️ Места без координат

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип"
FROM "Places"
WHERE тип = "место" AND !координаты
```

---

## 📋 Приоритеты исследования

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  поколение AS "Пок.",
  приоритет AS "Приоритет",
  статус_исследования AS "Статус",
  достоверность AS "Дост."
FROM "Persons"
WHERE тип = "персона"
  AND (приоритет = "высокий" OR статус_исследования = "не_начато")
SORT приоритет ASC, поколение ASC
```

---

## 📈 Статус исследования по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Пок.",
  length(rows) AS "Всего",
  length(filter(rows, (r) => r.статус_исследования = "полностью")) AS "✅ Готово",
  length(filter(rows, (r) => r.статус_исследования = "частично")) AS "🔶 Частично",
  length(filter(rows, (r) => r.статус_исследования = "начато")) AS "🔷 Начато",
  length(filter(rows, (r) => r.статус_исследования = "не_начато" OR !r.статус_исследования)) AS "⬜ Не начато"
FROM "Persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

_Последняя проверка: `= date(today)`_

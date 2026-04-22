---
тип: дашборд
название: Персоны
---

# 👥 Все персоны

> [[main-dashboard|← Главная]] · [[data-quality|🔍 Качество]] · [[research-progress|🎯 Прогресс]] · [[statistics|📊 Статистика]]

---

## Полный список

```dataview
TABLE WITHOUT ID
  file.link AS "Имя",
  поколение AS "Пок.",
  пол AS "Пол",
  дата_рождения AS "Рождение",
  место_рождения AS "Место",
  дата_смерти AS "Смерть",
  достоверность AS "Дост."
FROM "persons"
WHERE тип = "персона"
SORT поколение ASC, дата_рождения ASC
```

---

## Прогресс по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Пок.",
  length(rows) AS "Всего",
  length(filter(rows, (r) => r.пол = "М")) AS "М",
  length(filter(rows, (r) => r.пол = "Ж")) AS "Ж",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

## 🔝 Живущие сейчас

```dataview
TABLE WITHOUT ID
  file.link AS "Персона", поколение AS "Пок.", дата_рождения AS "Рождение"
FROM "persons"
WHERE тип = "персона" AND жив = "да"
SORT поколение ASC, дата_рождения ASC
```

---

## 🗓️ Самые ранние предки

По дате рождения (включая приблизительные).

```dataview
TABLE WITHOUT ID
  file.link AS "Персона", поколение AS "Пок.", дата_рождения AS "Рождение", достоверность AS "Дост."
FROM "persons"
WHERE тип = "персона" AND дата_рождения
SORT дата_рождения ASC
LIMIT 15
```

---

## 🔤 По фамилиям

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const surnames = {};

persons.forEach(p => {
  const s = p.фамилия_при_рождении || p.фамилия || "(без фамилии)";
  if (!surnames[s]) surnames[s] = [];
  surnames[s].push(p);
});

const rows = Object.entries(surnames)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([s, list]) => [s, list.length]);

dv.table(["Фамилия", "Кол-во"], rows);
```

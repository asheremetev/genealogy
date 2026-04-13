# 👥 Все персоны

> [[main-dashboard|← Главная]] · [[data-quality|Качество данных]]

---

## Список

```dataview
TABLE WITHOUT ID
  file.link AS "Имя",
  поколение AS "Пок.",
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
  поколение AS "Поколение",
  length(rows) AS "Найдено",
  length(filter(rows, (r) => r.достоверность = "высокая")) AS "Выс. дост.",
  length(filter(rows, (r) => r.отец)) AS "Есть отец",
  length(filter(rows, (r) => r.мать)) AS "Есть мать"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

# 🌳 Генеалогическое древо

## Статистика

```dataview
TABLE WITHOUT ID
  length(rows) as "Кол-во"
FROM "People"
GROUP BY type
```

```dataview
TABLE WITHOUT ID "Людей" as Категория, length(rows) as Количество
FROM "People" WHERE type = "person"
FLATTEN 1 as dummy
GROUP BY dummy
```

## 📊 Обзор по поколениям

```dataview
TABLE rows.file.link as "Люди", length(rows) as "Кол-во"
FROM "People"
WHERE type = "person"
GROUP BY generation
SORT generation ASC
```

## ⚠️ Требует проверки

```dataview
TABLE full_name, birth_date, reliability
FROM "People"
WHERE type = "person" AND reliability = "speculative"
SORT generation ASC
```

## ❓ Не установлены родители

```dataview
TABLE full_name, generation, birth_date
FROM "People"
WHERE type = "person" AND (father = "" OR father = null) AND generation > 1
SORT generation ASC
```

## 🕐 Последние изменения

```dataview
TABLE file.mtime as "Изменено"
FROM "People" OR "Sources" OR "Places"
SORT file.mtime DESC
LIMIT 10
```

## 🗺️ Географический охват

```dataview
TABLE rows.file.link as "Люди"
FROM "People"
WHERE type = "person" AND birth_place != ""
GROUP BY birth_place
SORT length(rows) DESC
```

---

## 🔗 Быстрая навигация

- [[People/]] — все персоны
- [[Families/]] — семейные единицы  
- [[Places/]] — места
- [[Sources/]] — источники
- [[Events/]] — события
- [[Reports/Research Log]] — журнал исследования

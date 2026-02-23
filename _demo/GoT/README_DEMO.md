# ⚔️ Игра Престолов — Демо-архив

> Демонстрация возможностей генеалогического vault на материале «Игры Престолов»

## 📊 Статистика

```dataview
TABLE WITHOUT ID
  length(rows) AS "Персонажей"
FROM "_DEMO_GameOfThrones/Persons"
FLATTEN file AS rows
GROUP BY true
```

## 🌐 Интерактивная визуализация

> Открой файл `ГЕНЕАЛОГИЯ_ВИЗУАЛИЗАЦИЯ.html` в браузере для просмотра:
> - Интерактивного генеалогического дерева с D3.js
> - Хронологической шкалы жизни всех персонажей
> - Персональных досье с фильтрами по домам

## 🐺 Дом Старк

```dataview
TABLE дата_рождения AS "Рождение", дата_смерти AS "Смерть", титул AS "Титул", статус AS "Статус"
FROM "_DEMO_GameOfThrones/Persons"
WHERE contains(дом, "Старк")
SORT дата_рождения ASC
```

## 🦁 Дом Ланнистер

```dataview
TABLE дата_рождения AS "Рождение", дата_смерти AS "Смерть", титул AS "Титул", статус AS "Статус"
FROM "_DEMO_GameOfThrones/Persons"
WHERE contains(дом, "Ланнистер")
SORT дата_рождения ASC
```

## 🐉 Дом Таргариен

```dataview
TABLE дата_рождения AS "Рождение", дата_смерти AS "Смерть", титул AS "Титул", статус AS "Статус"
FROM "_DEMO_GameOfThrones/Persons"
WHERE contains(дом, "Таргариен")
SORT дата_рождения ASC
```

## 🦌 Дом Баратеон

```dataview
TABLE дата_рождения AS "Рождение", дата_смерти AS "Смерть", статус AS "Статус"
FROM "_DEMO_GameOfThrones/Persons"
WHERE contains(дом, "Баратеон")
SORT дата_рождения ASC
```

## ⚔️ Жертвы конфликтов

```dataview
TABLE дата_смерти AS "Год гибели", место_смерти AS "Место гибели", дом AS "Дом"
FROM "_DEMO_GameOfThrones/Persons"
WHERE статус = "умер" AND дата_смерти >= 298
SORT дата_смерти ASC
```

## 👑 Выжившие

```dataview
TABLE титул AS "Титул", дом AS "Дом"
FROM "_DEMO_GameOfThrones/Persons"
WHERE статус = "жив"
```

## 📖 Истории

```dataview
TABLE дата_событий AS "Год", место AS "Место"
FROM "_DEMO_GameOfThrones/Stories"
SORT дата_событий ASC
```

## 🔗 Граф связей

Откройте **Graph View** в Obsidian (`Ctrl+G`) и отфильтруйте по тегу `#ДемоGoT` — 
вы увидите сеть связей между персонажами через ссылки `[[...]]` в их карточках.

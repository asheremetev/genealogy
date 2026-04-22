---
тип: дашборд
название: Карта мест
---

# 🗺️ Карта мест

> [[main-dashboard|← Главная]] · [[persons-list|👥 Персоны]] · [[research-progress|🎯 Прогресс]]
> Пропущенные координаты — в [[research-progress#Места-без-координат|Прогрессе]].

---

## Карта

````dataviewjs
const places = dv.pages('"places"').where(p => p.тип === "место");
const withCoords = places.where(p => typeof p.широта === "number" && typeof p.долгота === "number").array();

dv.paragraph(
  `📍 Всего мест: **${places.length}** · ` +
  `На карте: **${withCoords.length}** · ` +
  `Без координат: **${places.length - withCoords.length}**`
);

if (withCoords.length === 0) {
  dv.paragraph("⚠️ Ни у одного места не заполнены поля `широта` и `долгота`.");
} else {
  // Карта всегда открывается с центром на Москве — удобная точка отсчёта
  // для российской генеалогии. При необходимости пользователь сам зумится к маркерам.
  const MOSCOW = { lat: 55.7558, lng: 37.6173 };
  const DEFAULT_ZOOM = 5;

  const markerLines = withCoords.map(p => {
    const name = (p.название || p.file.name).replace(/"/g, '\\"');
    const link = p.file.path.replace(/\.md$/, "");
    return `marker: default, ${p.широта}, ${p.долгота}, "${name}", [[${link}]]`;
  }).join("\n");

  const mapBlock =
    "```leaflet\n" +
    "id: places-map-all\n" +
    "height: 600px\n" +
    `lat: ${MOSCOW.lat}\n` +
    `long: ${MOSCOW.lng}\n` +
    `defaultZoom: ${DEFAULT_ZOOM}\n` +
    "minZoom: 2\n" +
    "maxZoom: 18\n" +
    `${markerLines}\n` +
    "```";

  dv.paragraph(mapBlock);
}
````

---

## Все места

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  страна_сейчас AS "Страна",
  регион_сейчас AS "Регион",
  choice(широта AND долгота, "✅", "❌") AS "Коорд."
FROM "places"
WHERE тип = "место"
SORT тип_места ASC, file.name ASC
```

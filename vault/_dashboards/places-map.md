---
тип: дашборд
название: Карта мест
---

# 🗺️ Карта мест

> [[main-dashboard|← Главная]] · [[persons-list|Все персоны]] · [[data-quality|Качество данных]]

---

```dataviewjs
const places = dv.pages('"places"').where(p => p.тип === "место");
const withCoords = places.where(p => p.широта && p.долгота);
const withoutCoords = places.where(p => !p.широта || !p.долгота);

dv.paragraph(
  `📍 Мест всего: **${places.length}** · ` +
  `На карте: **${withCoords.length}** · ` +
  `Без координат: **${withoutCoords.length}**`
);

if (withCoords.length === 0) {
  dv.paragraph("⚠️ Ни у одного места не заполнены поля `широта` и `долгота`.");
} else {
  // Compute map center as average of all coordinates
  const coordsArr = withCoords.array();
  const avgLat = coordsArr.reduce((a, p) => a + p.широта, 0) / coordsArr.length;
  const avgLng = coordsArr.reduce((a, p) => a + p.долгота, 0) / coordsArr.length;

  // Build marker lines: marker: default, lat, lng, "Tooltip", [[link]]
  const markerLines = coordsArr.map(p => {
    const name = p.название || p.file.name;
    const link = p.file.path.replace(/\.md$/, "");
    return `marker: default, ${p.широта}, ${p.долгота}, "${name}", [[${link}]]`;
  }).join("\n");

  const mapId = "places-map-all";
  const mapBlock = `\`\`\`leaflet\nid: ${mapId}\nheight: 600px\ncoordinates: [${avgLat.toFixed(4)}, ${avgLng.toFixed(4)}]\nzoom: 5\n${markerLines}\n\`\`\``;

  dv.paragraph(mapBlock);
}
```

---

## 📋 Все места

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  страна_сейчас AS "Страна",
  регион_сейчас AS "Регион",
  существует AS "Сущ.",
  choice(широта AND долгота, "✅", "❌") AS "Коорд."
FROM "places"
WHERE тип = "место"
SORT тип_места ASC, file.name ASC
```

---

## ⚠️ Места без координат

```dataview
TABLE WITHOUT ID
  file.link AS "Место",
  тип_места AS "Тип",
  страна_сейчас AS "Страна",
  регион_сейчас AS "Регион"
FROM "places"
WHERE тип = "место" AND (!широта OR !долгота)
SORT file.name ASC
```

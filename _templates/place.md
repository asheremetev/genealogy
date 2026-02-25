---
тип: место
название: "<% tp.file.title %>"
тип_места: # деревня | село | город | губерния | уезд | волость | район | область | другое
современное_название:
страна_сейчас:
регион_сейчас:
страна_исторически:
регион_исторически:
координаты: [] # [lat, lng] — например [57.7676, 40.9267]
период_связи: # например "1850–1920"
существует: неизвестно # да | нет | неизвестно
теги: [место]
создано: <% tp.date.now("YYYY-MM-DD") %>
обновлено: <% tp.date.now("YYYY-MM-DD") %>
---

# <% tp.file.title %>

> [Главная](_dashboards/main-dashboard.md) · [Схема полей](_schema/data-schema.md)

## 📍 Географические данные

| Поле                              | Значение                                                 |
| --------------------------------- | -------------------------------------------------------- |
| **Тип**                           | `= this.тип_места`                                       |
| **Современное название**          | `= this.современное_название`                            |
| **Страна / регион (сейчас)**      | `= this.страна_сейчас`, `= this.регион_сейчас`           |
| **Страна / регион (исторически)** | `= this.страна_исторически`, `= this.регион_исторически` |
| **Координаты**                    | `= this.координаты`                                      |
| **Существует**                    | `= this.существует`                                      |

## 🗺️ Карта

```dataviewjs
const coords = dv.current().координаты;
if (coords && coords.length === 2) {
  const [lat, lng] = coords;
  const name = dv.current().название || dv.current().file.name;

  dv.paragraph(`📍 **Координаты:** ${lat}, ${lng}`);
  dv.paragraph(`🔗 [OpenStreetMap](https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}) · [Google Maps](https://www.google.com/maps/@${lat},${lng},14z)`);

  // Leaflet карта
  dv.paragraph(`
\`\`\`leaflet
id: map-${dv.current().file.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '-')}
height: 400px
coordinates: [${lat}, ${lng}]
zoom: 12
marker: default, ${lat}, ${lng}, "${name}"
\`\`\`
  `);
} else {
  dv.paragraph("⚠️ Укажи координаты в поле `координаты: [lat, lng]` для отображения карты");
  dv.paragraph("💡 Как найти: Google Maps → ПКМ на точке → скопировать координаты");
}
```

## 👥 Связанные персоны

### Родились здесь

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  дата_рождения AS "Дата"
FROM "persons"
WHERE место_рождения = this.file.link
SORT дата_рождения ASC
```

### Умерли здесь

```dataview
TABLE WITHOUT ID
  file.link AS "Персона",
  дата_смерти AS "Дата"
FROM "persons"
WHERE место_смерти = this.file.link
SORT дата_смерти ASC
```

### Жили здесь

```dataview
LIST
FROM "persons"
WHERE contains(места_жизни, this.file.link)
```

### Венчались здесь

```dataview
TABLE WITHOUT ID
  file.link AS "Семья",
  дата_брака AS "Дата"
FROM "families"
WHERE место_венчания = this.file.link
SORT дата_брака ASC
```

### События здесь

```dataview
TABLE WITHOUT ID
  вид_события AS "Тип",
  дата AS "Дата",
  file.link AS "Событие"
FROM "events"
WHERE место = this.file.link
SORT дата ASC
```

## 📚 История места

> Краткая история, административная принадлежность в разные эпохи.

## 🏛️ Где искать документы

| Ресурс              | Ссылка / описание |
| ------------------- | ----------------- |
| Архив               |                   |
| Фонд                |                   |
| FamilySearch        |                   |
| Региональный портал |                   |

## 📝 Примечания

# 🔍 Качество данных — Валидация

Запускай раз в неделю. Пустые таблицы и нули — хороший знак ✅

> [Главная](_dashboards/main-dashboard.md) · [Схема данных](_schema/data-schema.md)

---

## 📊 Общий статус

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const total = persons.length;
const withBirth = persons.where(p => p.дата_рождения).length;
const withFather = persons.where(p => p.отец).length;
const withMother = persons.where(p => p.мать).length;
const withGender = persons.where(p => p.пол && p.пол !== "неизвестно").length;
const highConf = persons.where(p => p.достоверность === "высокая").length;

dv.table(
  ["Всего", "Есть д.р.", "Есть отец", "Есть мать", "Пол известен", "Выс. дост."],
  [[total, withBirth, withFather, withMother, withGender, highConf]]
);

const pctBirth = total > 0 ? Math.round((withBirth / total) * 100) : 0;
const pctParents = total > 0 ? Math.round(((withFather + withMother) / (total * 2)) * 100) : 0;
dv.paragraph(`**Полнота:** дата рождения ${pctBirth}% · родители ${pctParents}%`);
```

---

## 🔴 Критические — обязательные поля

### Персоны без даты рождения

```dataview
TABLE WITHOUT ID
  file.link AS "Персона", поколение AS "Пок.", достоверность AS "Дост."
FROM "persons"
WHERE тип = "персона" AND !дата_рождения
SORT поколение ASC
```

### Персоны без пола

```dataview
TABLE WITHOUT ID file.link AS "Персона", поколение AS "Пок."
FROM "persons"
WHERE тип = "персона" AND (!пол OR пол = "")
```

### Персоны без поколения

```dataview
TABLE WITHOUT ID file.link AS "Персона"
FROM "persons"
WHERE тип = "персона" AND (поколение = null)
```

### Персоны без родителей (поколение > 0)

```dataview
TABLE WITHOUT ID
  file.link AS "Персона", поколение AS "Пок.", приоритет AS "Приоритет"
FROM "persons"
WHERE тип = "персона" AND поколение > 0 AND (!отец AND !мать)
SORT поколение ASC
```

### Замужние женщины без фамилии при рождении

```dataviewjs
const women = dv.pages('"persons"').where(p =>
  p.тип === "персона" &&
  p.пол === "Ж" &&
  !p.фамилия_при_рождении
);

const married = women.where(w => {
  const families = dv.pages('"families"').where(f =>
    f.жена && f.жена.path === w.file.path
  );
  return families.length > 0;
});

if (married.length > 0) {
  dv.table(["Персона", "Текущая фамилия", "Поколение"],
    married.map(p => [p.file.link, p.фамилия, p.поколение])
  );
} else {
  dv.paragraph("✅ У всех замужних женщин указана фамилия при рождении");
}
```

---

## 🟠 Некорректные значения (enum)

### Пол

```dataview
TABLE WITHOUT ID file.link AS "Персона", пол AS "Значение"
FROM "persons"
WHERE тип = "персона" AND пол
  AND пол != "М" AND пол != "Ж" AND пол != "неизвестно"
```

### Достоверность (персоны, семьи, события, истории)

```dataview
TABLE WITHOUT ID file.link AS "Заметка", достоверность AS "Значение", file.folder AS "Тип"
FROM "persons" OR "families" OR "events" OR "stories"
WHERE достоверность
  AND достоверность != "высокая"
  AND достоверность != "средняя"
  AND достоверность != "низкая"
  AND достоверность != "предположение"
```

### Достоверность (источники — без «предположение»)

```dataview
TABLE WITHOUT ID file.link AS "Источник", достоверность AS "Значение"
FROM "sources"
WHERE достоверность
  AND достоверность != "высокая"
  AND достоверность != "средняя"
  AND достоверность != "низкая"
```

### Жизненный статус

```dataview
TABLE WITHOUT ID file.link AS "Персона", жив AS "Значение"
FROM "persons"
WHERE жив AND жив != "да" AND жив != "нет" AND жив != "неизвестно"
```

### Оцифровано

```dataview
TABLE WITHOUT ID file.link AS "Источник", оцифровано AS "Значение"
FROM "sources"
WHERE оцифровано AND оцифровано != "да" AND оцифровано != "нет" AND оцифровано != "частично"
```

### Статус брака

```dataview
TABLE WITHOUT ID file.link AS "Семья", статус_брака AS "Значение"
FROM "families"
WHERE статус_брака
  AND статус_брака != "в_браке"
  AND статус_брака != "вдовство"
  AND статус_брака != "развод"
  AND статус_брака != "неизвестно"
```

### Статус исследования

```dataview
TABLE WITHOUT ID file.link AS "Персона", статус_исследования AS "Значение"
FROM "persons"
WHERE статус_исследования
  AND статус_исследования != "полностью"
  AND статус_исследования != "частично"
  AND статус_исследования != "начато"
  AND статус_исследования != "не_начато"
```

### Приоритет

```dataview
TABLE WITHOUT ID file.link AS "Персона", приоритет AS "Значение"
FROM "persons"
WHERE приоритет
  AND приоритет != "высокий"
  AND приоритет != "средний"
  AND приоритет != "низкий"
```

### Тип места

```dataview
TABLE WITHOUT ID file.link AS "Место", тип_места AS "Значение"
FROM "places"
WHERE тип_места
  AND тип_места != "деревня"
  AND тип_места != "село"
  AND тип_места != "город"
  AND тип_места != "губерния"
  AND тип_места != "уезд"
  AND тип_места != "волость"
  AND тип_места != "район"
  AND тип_места != "область"
  AND тип_места != "другое"
```

### Категория источника

```dataview
TABLE WITHOUT ID file.link AS "Источник", категория AS "Значение"
FROM "sources"
WHERE категория
  AND категория != "метрическая_книга"
  AND категория != "перепись"
  AND категория != "ревизская_сказка"
  AND категория != "архивный_документ"
  AND категория != "фото"
  AND категория != "паспорт"
  AND категория != "письмо"
  AND категория != "справка"
  AND категория != "грамота"
  AND категория != "устный"
  AND категория != "книга"
  AND категория != "сайт"
  AND категория != "другое"
```

### Вид события

```dataview
TABLE WITHOUT ID file.link AS "Событие", вид_события AS "Значение"
FROM "events"
WHERE вид_события
  AND вид_события != "рождение"
  AND вид_события != "смерть"
  AND вид_события != "брак"
  AND вид_события != "развод"
  AND вид_события != "миграция"
  AND вид_события != "мобилизация"
  AND вид_события != "арест"
  AND вид_события != "раскулачивание"
  AND вид_события != "другое"
```

### Существует (место)

```dataview
TABLE WITHOUT ID file.link AS "Место", существует AS "Значение"
FROM "places"
WHERE существует AND существует != "да" AND существует != "нет" AND существует != "неизвестно"
```

### Состояние источника

```dataview
TABLE WITHOUT ID file.link AS "Источник", состояние AS "Значение"
FROM "sources"
WHERE состояние
  AND состояние != "хорошее"
  AND состояние != "повреждён"
  AND состояние != "частично_читаем"
  AND состояние != "копия"
```

### Источник истории

```dataview
TABLE WITHOUT ID file.link AS "История", источник_истории AS "Значение"
FROM "stories"
WHERE источник_истории
  AND источник_истории != "устный_рассказ"
  AND источник_истории != "письмо"
  AND источник_истории != "дневник"
  AND источник_истории != "мемуары"
  AND источник_истории != "другое"
```

### Тип сущности (файл в неправильной папке)

```dataviewjs
const expected = {
  "persons": "персона",
  "families": "семья",
  "sources": "источник",
  "places": "место",
  "stories": "история",
  "events": "событие"
};

let errors = [];
for (const [folder, type] of Object.entries(expected)) {
  const pages = dv.pages(`"${folder}"`).where(p => p.тип && p.тип !== type);
  pages.forEach(p => errors.push([p.file.link, folder, p.тип, type]));
}

if (errors.length > 0) {
  dv.table(["Файл", "Папка", "Указан тип", "Ожидается"], errors);
} else {
  dv.paragraph("✅ Все типы соответствуют папкам");
}
```

---

## 🟡 Перекрёстные проверки

### Отец — не мужского пола

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона" && p.отец);
const errors = [];

persons.forEach(p => {
  const father = dv.page(p.отец.path);
  if (father && father.пол && father.пол !== "М") {
    errors.push([p.file.link, p.отец, father.пол]);
  }
});

if (errors.length > 0) {
  dv.table(["Персона", "Отец", "Пол отца"], errors);
} else {
  dv.paragraph("✅ Все отцы — мужского пола");
}
```

### Мать — не женского пола

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона" && p.мать);
const errors = [];

persons.forEach(p => {
  const mother = dv.page(p.мать.path);
  if (mother && mother.пол && mother.пол !== "Ж") {
    errors.push([p.file.link, p.мать, mother.пол]);
  }
});

if (errors.length > 0) {
  dv.table(["Персона", "Мать", "Пол матери"], errors);
} else {
  dv.paragraph("✅ Все матери — женского пола");
}
```

### Дата смерти раньше даты рождения

```dataviewjs
const persons = dv.pages('"persons"').where(p =>
  p.тип === "персона" && p.дата_рождения && p.дата_смерти
);
const errors = [];

persons.forEach(p => {
  const birth = dv.date(String(p.дата_рождения));
  const death = dv.date(String(p.дата_смерти));
  if (birth && death && death < birth) {
    errors.push([p.file.link, p.дата_рождения, p.дата_смерти]);
  }
});

if (errors.length > 0) {
  dv.table(["Персона", "Рождение", "Смерть"], errors);
} else {
  dv.paragraph("✅ Даты смерти корректны");
}
```

### Неправдоподобный возраст (> 120 лет)

```dataviewjs
const persons = dv.pages('"persons"').where(p =>
  p.тип === "персона" && p.дата_рождения && p.дата_смерти
);
const errors = [];

persons.forEach(p => {
  const birth = dv.date(String(p.дата_рождения));
  const death = dv.date(String(p.дата_смерти));
  if (birth && death) {
    const years = (death - birth) / 31557600000;
    if (years > 120) errors.push([p.file.link, Math.round(years)]);
  }
});

if (errors.length > 0) {
  dv.table(["Персона", "Возраст"], errors);
} else {
  dv.paragraph("✅ Нет персон старше 120 лет");
}
```

### Битые ссылки

```dataviewjs
const linkFields = [
  { folder: "persons", fields: ["отец", "мать", "место_рождения", "место_смерти", "место_крещения"] },
  { folder: "families", fields: ["муж", "жена", "место_брака", "место_венчания"] },
  { folder: "events", fields: ["место"] }
];

let errors = [];
for (const { folder, fields } of linkFields) {
  dv.pages(`"${folder}"`).forEach(p => {
    fields.forEach(f => {
      const val = p[f];
      if (val && val.path) {
        const target = dv.page(val.path);
        if (!target) {
          errors.push([p.file.link, f, String(val)]);
        }
      }
    });
  });
}

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Битая ссылка"], errors);
} else {
  dv.paragraph("✅ Все ссылки ведут на существующие файлы");
}
```

### Возможные дубликаты

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const keys = {};
const dupes = [];

persons.forEach(p => {
  const key = `${p.фамилия || ""}|${p.имя || ""}|${p.отчество || ""}|${String(p.дата_рождения || "")}`;
  if (keys[key]) {
    dupes.push([keys[key].file.link, p.file.link, key]);
  } else {
    keys[key] = p;
  }
});

if (dupes.length > 0) {
  dv.table(["Запись 1", "Запись 2", "Ключ (ФИО|Дата)"], dupes);
} else {
  dv.paragraph("✅ Дубликатов не обнаружено");
}
```

---

## ⚠️ Полнота данных

### Источники без привязки к персонам

```dataview
TABLE WITHOUT ID
  file.link AS "Источник", категория AS "Тип", год_документа AS "Год"
FROM "sources"
WHERE тип = "источник" AND (!персоны OR length(персоны) = 0)
```

### Семьи без даты брака

```dataview
TABLE WITHOUT ID file.link AS "Семья", муж AS "Муж", жена AS "Жена"
FROM "families"
WHERE тип = "семья" AND !дата_брака
```

### Места без координат

```dataview
TABLE WITHOUT ID file.link AS "Место", тип_места AS "Тип"
FROM "places"
WHERE тип = "место" AND !координаты
```

### Персоны без источников

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const sources = dv.pages('"sources"').where(s => s.тип === "источник");

const unsourced = persons.where(p => {
  return !sources.some(s =>
    s.персоны && s.персоны.some(per => per.path === p.file.path)
  );
});

if (unsourced.length > 0) {
  dv.table(["Персона", "Поколение"],
    unsourced.sort(p => p.поколение).map(p => [p.file.link, p.поколение])
  );
} else {
  dv.paragraph("✅ Все персоны связаны с источниками");
}
```

---

## 📈 Статус исследования по поколениям

```dataview
TABLE WITHOUT ID
  поколение AS "Пок.",
  length(rows) AS "Всего",
  length(filter(rows, (r) => r.статус_исследования = "полностью")) AS "✅",
  length(filter(rows, (r) => r.статус_исследования = "частично")) AS "🔶",
  length(filter(rows, (r) => r.статус_исследования = "начато")) AS "🔷",
  length(filter(rows, (r) => r.статус_исследования = "не_начато" OR !r.статус_исследования)) AS "⬜"
FROM "persons"
WHERE тип = "персона"
GROUP BY поколение
SORT поколение ASC
```

---

## 📋 Приоритетные задачи

```dataview
TABLE WITHOUT ID
  file.link AS "Персона", поколение AS "Пок.", приоритет AS "Приоритет",
  статус_исследования AS "Статус", достоверность AS "Дост."
FROM "persons"
WHERE тип = "персона"
  AND (приоритет = "высокий" OR статус_исследования = "не_начато")
SORT приоритет ASC, поколение ASC
LIMIT 20
```

---

## 📏 Именование файлов

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const badNames = persons.where(p => {
  const name = p.file.name;
  // Ожидается: Слово Слово ... (год) или (ок. год)
  return !name.match(/^.+\s.+\(.+\)$/);
});

if (badNames.length > 0) {
  dv.header(4, "⚠️ Нестандартные имена файлов");
  dv.table(["Файл", "Имя"], badNames.map(p => [p.file.link, p.file.name]));
} else {
  dv.paragraph("✅ Все имена файлов соответствуют формату");
}
```

---

_Последняя проверка: `= date(today)`_

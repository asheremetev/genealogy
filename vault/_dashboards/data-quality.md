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

## 🆘 Критические ошибки

> Эти ошибки вызывают зависание или некорректное отображение дерева. Исправлять в первую очередь.

### Персона — собственный родитель (самоссылка)

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const errors = [];

persons.forEach(p => {
  if (p.отец && p.отец.path === p.file.path)
    errors.push([p.file.link, "отец"]);
  if (p.мать && p.мать.path === p.file.path)
    errors.push([p.file.link, "мать"]);
});

if (errors.length > 0) {
  dv.table(["Персона", "Поле"], errors);
} else {
  dv.paragraph("✅ Нет персон, являющихся собственным родителем");
}
```

### Прямые циклы в цепочке родителей (A → B → A)

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const errors = [];

persons.forEach(p => {
  ["отец", "мать"].forEach(field => {
    if (!p[field] || typeof p[field].path !== "string") return;
    const parent = dv.page(p[field].path);
    if (!parent) return;
    ["отец", "мать"].forEach(pField => {
      if (!parent[pField] || typeof parent[pField].path !== "string") return;
      if (parent[pField].path === p.file.path) {
        errors.push([p.file.link, field, parent.file.link, pField]);
      }
    });
  });
});

if (errors.length > 0) {
  dv.table(["Персона", "Поле", "Родитель", "Поле у родителя"], errors);
} else {
  dv.paragraph("✅ Прямых циклов A→B→A не обнаружено");
}
```

### Пустые семьи (шаблон не заполнен)

```dataviewjs
const families = dv.pages('"families"').where(f => f.тип === "семья");
const empty = families.where(f => !f.муж && !f.жена);

if (empty.length > 0) {
  dv.table(["Семья"], empty.map(f => [f.file.link]));
} else {
  dv.paragraph("✅ Нет пустых семей без супругов");
}
```

### Несоответствие типов полей

Проверяет что ссылочные поля — ссылки, строковые — строки, числовые — числа. Охватывает persons, families, places.

```dataviewjs
const isLink = v => v != null && typeof v === "object" && typeof v.path === "string";
const isString = v => typeof v === "string";
const isNumber = v => typeof v === "number";
const errors = [];

const check = (file, field, val, expected) => {
  if (val == null || val === "") return;
  const actual = isLink(val) ? "ссылка" : isNumber(val) ? "число" : isString(val) ? "строка" : typeof val;
  if (actual !== expected) errors.push([file, field, actual, expected]);
};

const checkList = (file, field, val, expected) => {
  if (!val) return;
  const list = Array.isArray(val) ? val : [val];
  list.forEach((item, i) => {
    if (item == null || item === "") return;
    const actual = isLink(item) ? "ссылка" : isNumber(item) ? "число" : isString(item) ? "строка" : typeof item;
    if (actual !== expected) errors.push([file, `${field}[${i}]`, actual, expected]);
  });
};

// Персоны
const PERSON_STR  = ["фамилия", "фамилия_при_рождении", "имя_в_источнике", "прозвище", "имя", "отчество", "профессия", "сословие", "образование", "религия"];
const PERSON_LINK = ["отец", "мать", "место_рождения", "место_смерти", "место_крещения"];
const PERSON_NUM  = ["поколение"];
const PERSON_LINK_LIST = ["места_жизни"];

dv.pages('"persons"').where(p => p.тип === "персона").forEach(p => {
  PERSON_STR.forEach(f => check(p.file.link, f, p[f], "строка"));
  PERSON_LINK.forEach(f => check(p.file.link, f, p[f], "ссылка"));
  PERSON_NUM.forEach(f => check(p.file.link, f, p[f], "число"));
  PERSON_LINK_LIST.forEach(f => checkList(p.file.link, f, p[f], "ссылка"));
});

// Семьи
const FAMILY_STR  = ["статус_брака", "достоверность"];
const FAMILY_LINK = ["муж", "жена", "место_брака", "место_венчания"];

dv.pages('"families"').where(f => f.тип === "семья").forEach(f => {
  FAMILY_STR.forEach(field => check(f.file.link, field, f[field], "строка"));
  FAMILY_LINK.forEach(field => check(f.file.link, field, f[field], "ссылка"));
});

// Места
const PLACE_STR = ["название", "тип_места", "современное_название", "страна_сейчас", "регион_сейчас", "страна_исторически", "регион_исторически", "период_связи", "существует"];
const PLACE_NUM = ["широта", "долгота"];

dv.pages('"places"').where(p => p.тип === "место").forEach(p => {
  PLACE_STR.forEach(f => check(p.file.link, f, p[f], "строка"));
  PLACE_NUM.forEach(f => check(p.file.link, f, p[f], "число"));
});

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Текущий тип", "Ожидается"], errors);
} else {
  dv.paragraph("✅ Все поля соответствуют ожидаемым типам");
}
```

### Неправильный формат приблизительных дат

Допустимые форматы строк: `~YYYY`, `YYYY`, `YYYY-MM`. Ошибки: `~1720)`, `1844.01.21` и т.п.
Корректные даты вида `YYYY-MM-DD` Dataview разбирает сам в объект — они проверяются отдельно.

```dataviewjs
const validStr = /^~?\d{4}(-\d{2})?$/;
const errors = [];

dv.pages('"persons"').where(p => p.тип === "персона").forEach(p => {
  ["дата_рождения", "дата_смерти", "дата_крещения"].forEach(field => {
    const val = p[field];
    if (!val || typeof val !== "string") return;
    const str = val.trim();
    if (!validStr.test(str)) {
      errors.push([p.file.link, field, str]);
    }
  });
});

dv.pages('"families"').where(f => f.тип === "семья").forEach(f => {
  const val = f["дата_брака"];
  if (!val || typeof val !== "string") return;
  const str = val.trim();
  if (!validStr.test(str)) {
    errors.push([f.file.link, "дата_брака", str]);
  }
});

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Значение"], errors);
} else {
  dv.paragraph("✅ Все приблизительные даты в правильном формате");
}
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

### Супруги одного пола

```dataviewjs
const families = dv.pages('"families"').where(f => f.тип === "семья" && f.муж && f.жена);
const errors = [];

families.forEach(f => {
  const husband = dv.page(f.муж.path);
  const wife = dv.page(f.жена.path);
  if (husband && wife && husband.пол && wife.пол && husband.пол === wife.пол) {
    errors.push([f.file.link, f.муж, husband.пол, f.жена, wife.пол]);
  }
});

if (errors.length > 0) {
  dv.table(["Семья", "Муж", "Пол", "Жена", "Пол"], errors);
} else {
  dv.paragraph("✅ Супруги всегда разного пола");
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

### Неправдоподобный возраст родителя при рождении ребёнка (< 12 или > 80 лет)

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона" && p.дата_рождения);
const errors = [];

persons.forEach(child => {
  const childBirth = dv.date(String(child.дата_рождения));
  if (!childBirth) return;

  ["отец", "мать"].forEach(field => {
    if (!child[field]) return;
    const parent = dv.page(child[field].path);
    if (!parent || !parent.дата_рождения) return;
    const parentBirth = dv.date(String(parent.дата_рождения));
    if (!parentBirth) return;

    const age = (childBirth - parentBirth) / 31557600000;
    if (age < 12 || age > 80) {
      errors.push([child.file.link, field, parent.file.link, Math.round(age)]);
    }
  });
});

if (errors.length > 0) {
  dv.table(["Ребёнок", "Поле", "Родитель", "Лет родителю"], errors);
} else {
  dv.paragraph("✅ Возраст родителей при рождении детей в допустимых пределах");
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

### Возможные дубликаты персон

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

### Семьи без даты брака

```dataview
TABLE WITHOUT ID file.link AS "Семья", муж AS "Муж", жена AS "Жена"
FROM "families"
WHERE тип = "семья" AND муж AND жена AND !дата_брака
```

### Источники без привязки к персонам

```dataview
TABLE WITHOUT ID
  file.link AS "Источник", категория AS "Тип", год_документа AS "Год"
FROM "sources"
WHERE тип = "источник" AND (!персоны OR length(персоны) = 0)
```

### Места без координат

```dataview
TABLE WITHOUT ID file.link AS "Место", тип_места AS "Тип"
FROM "places"
WHERE тип = "место" AND (!широта OR !долгота)
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
  // Форматы:
  //   Фамилия Имя Отчество (год)       — стандарт
  //   Имя Отчество (~год)              — без фамилии, приблизительный год
  //   Имя Отчество                     — без фамилии, год неизвестен
  return !name.match(/^.+\s.+\(.+\)$/) && !name.match(/^[А-ЯЁа-яё]+\s[А-ЯЁа-яё]+$/);
});

if (badNames.length > 0) {
  dv.table(["Файл", "Имя"], badNames.map(p => [p.file.link, p.file.name]));
} else {
  dv.paragraph("✅ Все имена файлов соответствуют формату");
}
```

---

_Последняя проверка: `= date(today)`_

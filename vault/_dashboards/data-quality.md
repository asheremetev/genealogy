---
тип: дашборд
название: Качество данных
---

# 🔍 Качество данных — Валидация

Запускай раз в неделю. **Пустые таблицы и зелёные ✅ — хороший знак.**
Здесь только настоящие ошибки: противоречия, нарушения схемы, битые связи.
Для работы над полнотой данных см. [[research-progress|🎯 Прогресс исследования]].

> [[main-dashboard|← Главная]] · [[research-progress|🎯 Прогресс]] · [[statistics|📊 Статистика]] · [[data-schema|📐 Схема]]

---

## 🆘 Критические ошибки

> Эти ошибки ломают дерево, вызывают зависания или логически невозможны. **Исправлять в первую очередь.**

### Циклы в цепочке родителей

Ловит самоссылки (A→A) и цепочки любой длины: A→B→A, A→B→C→A и т.д.

```dataviewjs
const persons = dv.pages('"persons"').where(p => p.тип === "персона");
const byPath = Object.fromEntries(persons.array().map(p => [p.file.path, p]));

const state = {};
const cycles = [];
const reported = new Set();

function dfs(path, ancestors) {
  if (!path || !byPath[path] || state[path] === "closed") return;
  if (state[path] === "open") {
    const idx = ancestors.indexOf(path);
    if (idx >= 0 && !reported.has(path)) {
      const cycle = ancestors.slice(idx);
      cycle.forEach(p => reported.add(p));
      cycles.push(cycle.map(p => byPath[p]?.file.link || p));
    }
    return;
  }
  state[path] = "open";
  const p = byPath[path];
  if (p.отец?.path) dfs(p.отец.path, [...ancestors, path]);
  if (p.мать?.path) dfs(p.мать.path, [...ancestors, path]);
  state[path] = "closed";
}

persons.forEach(p => dfs(p.file.path, []));

if (cycles.length > 0) {
  cycles.forEach(c => dv.paragraph("⚠️ " + c.map(String).join(" → ") + " → (цикл)"));
} else {
  dv.paragraph("✅ Циклов в цепочке родителей нет");
}
```

### Муж = жена в одной семье

```dataviewjs
const errors = dv.pages('"families"')
  .where(f => f.тип === "семья" && f.муж?.path && f.жена?.path && f.муж.path === f.жена.path);

if (errors.length > 0) {
  dv.table(["Семья"], errors.map(f => [f.file.link]));
} else {
  dv.paragraph("✅ Муж и жена — разные люди");
}
```

### Пустые семьи (ни мужа, ни жены)

```dataviewjs
const empty = dv.pages('"families"').where(f => f.тип === "семья" && !f.муж && !f.жена);

if (empty.length > 0) {
  dv.table(["Семья"], empty.map(f => [f.file.link]));
} else {
  dv.paragraph("✅ Нет пустых семей");
}
```

### Персоны: незаполнены обязательные поля схемы

По [[data-schema#🔹-Персона-тип-персона|схеме]] у персоны обязательны: `имя`, `пол`, `поколение`, `достоверность`.

```dataviewjs
const required = ["имя", "пол", "поколение", "достоверность"];
const errors = [];

dv.pages('"persons"').where(p => p.тип === "персона").forEach(p => {
  const missing = required.filter(f => p[f] == null || p[f] === "");
  if (missing.length > 0) errors.push([p.file.link, missing.join(", ")]);
});

if (errors.length > 0) {
  dv.table(["Персона", "Незаполнены"], errors);
} else {
  dv.paragraph(`✅ У всех персон заполнены: ${required.join(" · ")}`);
}
```

### Дата крещения раньше даты рождения

```dataviewjs
const errors = [];
dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.дата_рождения && p.дата_крещения)
  .forEach(p => {
    const birth = dv.date(String(p.дата_рождения));
    const baptism = dv.date(String(p.дата_крещения));
    if (birth && baptism && baptism < birth) {
      errors.push([p.file.link, p.дата_рождения, p.дата_крещения]);
    }
  });

if (errors.length > 0) {
  dv.table(["Персона", "Рождение", "Крещение"], errors);
} else {
  dv.paragraph("✅ Даты крещения не раньше дат рождения");
}
```

### Жив = "да", но указана дата смерти

```dataviewjs
const errors = dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.жив === "да" && p.дата_смерти);

if (errors.length > 0) {
  dv.table(["Персона", "Дата смерти"], errors.map(p => [p.file.link, p.дата_смерти]));
} else {
  dv.paragraph("✅ Нет противоречий жив / дата_смерти");
}
```

---

## 📏 Схема и форматы

### Тип сущности не соответствует папке

```dataviewjs
const expected = {
  "persons": "персона",
  "families": "семья",
  "sources": "источник",
  "places": "место",
  "stories": "история",
  "events": "событие"
};

const errors = [];
for (const [folder, type] of Object.entries(expected)) {
  dv.pages(`"${folder}"`)
    .where(p => p.тип && p.тип !== type)
    .forEach(p => errors.push([p.file.link, folder, p.тип, type]));
}

if (errors.length > 0) {
  dv.table(["Файл", "Папка", "Указан тип", "Ожидается"], errors);
} else {
  dv.paragraph("✅ Все типы соответствуют папкам");
}
```

### Несоответствие типов полей

Проверяет что ссылочные поля — ссылки, строковые — строки, числовые — числа.

```dataviewjs
const isLink   = v => v != null && typeof v === "object" && typeof v.path === "string";
const isString = v => typeof v === "string";
const isNumber = v => typeof v === "number";
const typeOf = v =>
  isLink(v)   ? "ссылка" :
  isNumber(v) ? "число"  :
  isString(v) ? "строка" : typeof v;

const errors = [];
const check = (file, field, val, expected) => {
  if (val == null || val === "") return;
  const actual = typeOf(val);
  if (actual !== expected) errors.push([file, field, actual, expected]);
};
const checkList = (file, field, val, expected) => {
  if (!val) return;
  (Array.isArray(val) ? val : [val]).forEach((item, i) => {
    if (item == null || item === "") return;
    const actual = typeOf(item);
    if (actual !== expected) errors.push([file, `${field}[${i}]`, actual, expected]);
  });
};

const schema = [
  { folder: "persons", type: "персона", str: ["фамилия", "фамилия_при_рождении", "имя_в_источнике", "прозвище", "имя", "отчество", "профессия", "сословие", "образование", "религия"], link: ["отец", "мать", "место_рождения", "место_смерти", "место_крещения"], num: ["поколение"], linkList: ["места_жизни"] },
  { folder: "families", type: "семья", str: ["статус_брака", "достоверность"], link: ["муж", "жена", "место_брака", "место_венчания"] },
  { folder: "places", type: "место", str: ["название", "тип_места", "современное_название", "страна_сейчас", "регион_сейчас", "страна_исторически", "регион_исторически", "период_связи", "существует"], num: ["широта", "долгота"] },
  { folder: "events", type: "событие", str: ["вид_события", "описание_кратко", "достоверность"], link: ["место"], linkList: ["участники", "связанные_семьи", "источники"] },
  { folder: "sources", type: "источник", str: ["категория", "архив", "фонд", "опись", "дело", "лист", "ссылка_онлайн", "достоверность", "оцифровано", "состояние"], num: ["год_документа"], linkList: ["персоны"] },
  { folder: "stories", type: "история", str: ["заголовок", "рассказчик", "период_событий", "источник_истории", "достоверность"], linkList: ["персоны", "места"] }
];

schema.forEach(({ folder, type, str = [], link = [], num = [], linkList = [] }) => {
  dv.pages(`"${folder}"`).where(p => p.тип === type).forEach(p => {
    str.forEach(f => check(p.file.link, f, p[f], "строка"));
    link.forEach(f => check(p.file.link, f, p[f], "ссылка"));
    num.forEach(f => check(p.file.link, f, p[f], "число"));
    linkList.forEach(f => checkList(p.file.link, f, p[f], "ссылка"));
  });
});

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Текущий тип", "Ожидается"], errors);
} else {
  dv.paragraph("✅ Все поля соответствуют ожидаемым типам");
}
```

### Неправильный формат приблизительных дат

Допустимые строковые форматы: `~YYYY`, `YYYY`, `YYYY-MM`. Даты `YYYY-MM-DD` Dataview разбирает автоматически.

```dataviewjs
const validStr = /^~?\d{4}(-\d{2})?$/;
const errors = [];

const checkDateFields = (folder, type, fields) => {
  dv.pages(`"${folder}"`).where(p => p.тип === type).forEach(p => {
    fields.forEach(field => {
      const val = p[field];
      if (!val || typeof val !== "string") return;
      const str = val.trim();
      if (!validStr.test(str)) errors.push([p.file.link, field, str]);
    });
  });
};

checkDateFields("persons", "персона", ["дата_рождения", "дата_смерти", "дата_крещения"]);
checkDateFields("families", "семья", ["дата_брака", "дата_развода"]);
checkDateFields("events", "событие", ["дата", "дата_окончания"]);

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Значение"], errors);
} else {
  dv.paragraph("✅ Все приблизительные даты в правильном формате");
}
```

### Битые ссылки

```dataviewjs
const singleFields = [
  { folder: "persons",  fields: ["отец", "мать", "место_рождения", "место_смерти", "место_крещения"] },
  { folder: "families", fields: ["муж", "жена", "место_брака", "место_венчания"] },
  { folder: "events",   fields: ["место"] }
];
const listFields = [
  { folder: "persons",  fields: ["места_жизни"] },
  { folder: "events",   fields: ["участники", "источники", "связанные_семьи"] },
  { folder: "sources",  fields: ["персоны"] },
  { folder: "stories",  fields: ["персоны", "места"] }
];

const errors = [];

for (const { folder, fields } of singleFields) {
  dv.pages(`"${folder}"`).forEach(p => {
    fields.forEach(f => {
      const val = p[f];
      if (val?.path && !dv.page(val.path)) errors.push([p.file.link, f, String(val)]);
    });
  });
}
for (const { folder, fields } of listFields) {
  dv.pages(`"${folder}"`).forEach(p => {
    fields.forEach(f => {
      const val = p[f];
      if (!val) return;
      (Array.isArray(val) ? val : [val]).forEach((item, i) => {
        if (item?.path && !dv.page(item.path)) errors.push([p.file.link, `${f}[${i}]`, String(item)]);
      });
    });
  });
}

if (errors.length > 0) {
  dv.table(["Файл", "Поле", "Битая ссылка"], errors);
} else {
  dv.paragraph("✅ Все ссылки ведут на существующие файлы");
}
```

### Именование файлов (персоны)

Ожидаемые форматы: `Фамилия Имя Отчество (год)`, `Имя Отчество (~год)`, `Имя Отчество`.

```dataviewjs
const pattern = /^(.+\s.+\(.+\)|[А-ЯЁа-яё]+\s[А-ЯЁа-яё]+)$/;
const bad = dv.pages('"persons"')
  .where(p => p.тип === "персона" && !pattern.test(p.file.name));

if (bad.length > 0) {
  dv.table(["Файл"], bad.map(p => [p.file.link]));
} else {
  dv.paragraph("✅ Все имена файлов соответствуют формату");
}
```

---

## 🎯 Некорректные значения (enum)

Одна проверка на все enum-поля. Под каждым заголовком — зелёный ✅ если всё хорошо,
таблица ошибок если есть отклонения.

```dataviewjs
const checks = [
  { label: "Пол",                               folder: "persons",   type: "персона",  field: "пол",                  valid: ["М", "Ж", "неизвестно"],                                                                                                                                       col: "Персона" },
  { label: "Жив",                               folder: "persons",   type: "персона",  field: "жив",                  valid: ["да", "нет", "неизвестно"],                                                                                                                                    col: "Персона" },
  { label: "Достоверность (персоны)",           folder: "persons",   type: "персона",  field: "достоверность",        valid: ["высокая", "средняя", "низкая", "предположение"],                                                                                                              col: "Персона" },
  { label: "Достоверность (семьи)",             folder: "families",  type: "семья",    field: "достоверность",        valid: ["высокая", "средняя", "низкая", "предположение"],                                                                                                              col: "Семья" },
  { label: "Достоверность (события)",           folder: "events",    type: "событие",  field: "достоверность",        valid: ["высокая", "средняя", "низкая", "предположение"],                                                                                                              col: "Событие" },
  { label: "Достоверность (истории)",           folder: "stories",   type: "история",  field: "достоверность",        valid: ["высокая", "средняя", "низкая", "предположение"],                                                                                                              col: "История" },
  { label: "Достоверность (источники)",         folder: "sources",   type: "источник", field: "достоверность",        valid: ["высокая", "средняя", "низкая", "предположение"],                                                                                                             col: "Источник" },
  { label: "Статус брака",                      folder: "families",  type: "семья",    field: "статус_брака",         valid: ["в_браке", "вдовство", "развод", "неизвестно"],                                                                                                                col: "Семья" },
  { label: "Статус исследования",               folder: "persons",   type: "персона",  field: "статус_исследования",  valid: ["полностью", "частично", "начато", "не_начато"],                                                                                                               col: "Персона" },
  { label: "Приоритет",                         folder: "persons",   type: "персона",  field: "приоритет",            valid: ["высокий", "средний", "низкий"],                                                                                                                               col: "Персона" },
  { label: "Тип места",                         folder: "places",    type: "место",    field: "тип_места",            valid: ["деревня", "село", "город", "посёлок", "губерния", "уезд", "волость", "район", "область", "страна", "другое"],                                                col: "Место" },
  { label: "Категория источника",               folder: "sources",   type: "источник", field: "категория",            valid: ["метрическая_книга", "перепись", "ревизская_сказка", "архивный_документ", "фото", "паспорт", "письмо", "справка", "грамота", "устный", "книга", "сайт", "другое"], col: "Источник" },
  { label: "Вид события",                       folder: "events",    type: "событие",  field: "вид_события",          valid: ["рождение", "смерть", "брак", "развод", "миграция", "мобилизация", "арест", "раскулачивание", "другое"],                                                     col: "Событие" }
];

for (const { label, folder, type, field, valid, col } of checks) {
  dv.header(4, label);
  const bad = dv.pages(`"${folder}"`)
    .where(p => p.тип === type && p[field] && !valid.includes(p[field]));
  if (bad.length > 0) {
    dv.table([col, "Значение"], bad.map(p => [p.file.link, p[field]]));
  } else {
    dv.paragraph(`✅ Все значения в пределах: ${valid.join(" · ")}`);
  }
}
```

---

## 🧬 Логические противоречия

### Отец — не мужского пола / мать — не женского

```dataviewjs
const errors = [];
dv.pages('"persons"').where(p => p.тип === "персона").forEach(p => {
  if (p.отец?.path) {
    const f = dv.page(p.отец.path);
    if (f?.пол && f.пол !== "М") errors.push([p.file.link, "отец", p.отец, f.пол]);
  }
  if (p.мать?.path) {
    const m = dv.page(p.мать.path);
    if (m?.пол && m.пол !== "Ж") errors.push([p.file.link, "мать", p.мать, m.пол]);
  }
});

if (errors.length > 0) {
  dv.table(["Персона", "Поле", "Родитель", "Пол родителя"], errors);
} else {
  dv.paragraph("✅ Пол родителей соответствует роли");
}
```

### Роль в семье не соответствует полу / однополые супруги

```dataviewjs
const errors = [];
dv.pages('"families"').where(f => f.тип === "семья").forEach(f => {
  const h = f.муж?.path ? dv.page(f.муж.path) : null;
  const w = f.жена?.path ? dv.page(f.жена.path) : null;

  if (h?.пол === "Ж") errors.push([f.file.link, "муж не мужчина", f.муж]);
  if (w?.пол === "М") errors.push([f.file.link, "жена не женщина", f.жена]);
  if (h?.пол && w?.пол && h.пол === w.пол) {
    errors.push([f.file.link, `однополые супруги (${h.пол})`, `${f.муж} + ${f.жена}`]);
  }
});

if (errors.length > 0) {
  dv.table(["Семья", "Проблема", "Детали"], errors);
} else {
  dv.paragraph("✅ Роли супругов соответствуют полу");
}
```

### Поколения родителя и ребёнка не согласованы

Если родитель имеет поколение N, ребёнок должен иметь N−1.

```dataviewjs
const errors = [];
dv.pages('"persons"').where(p => p.тип === "персона" && p.поколение != null).forEach(child => {
  ["отец", "мать"].forEach(field => {
    if (!child[field]?.path) return;
    const parent = dv.page(child[field].path);
    if (!parent || parent.поколение == null) return;
    const expected = parent.поколение - 1;
    if (child.поколение !== expected) {
      errors.push([child.file.link, child.поколение, field, parent.file.link, parent.поколение, expected]);
    }
  });
});

if (errors.length > 0) {
  dv.table(["Ребёнок", "Пок.", "Поле", "Родитель", "Пок. род.", "Ожидалось"], errors);
} else {
  dv.paragraph("✅ Поколения согласованы");
}
```

### Дата смерти раньше даты рождения

```dataviewjs
const errors = [];
dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.дата_рождения && p.дата_смерти)
  .forEach(p => {
    const b = dv.date(String(p.дата_рождения));
    const d = dv.date(String(p.дата_смерти));
    if (b && d && d < b) errors.push([p.file.link, p.дата_рождения, p.дата_смерти]);
  });

if (errors.length > 0) {
  dv.table(["Персона", "Рождение", "Смерть"], errors);
} else {
  dv.paragraph("✅ Все даты смерти позже дат рождения");
}
```

### Родитель умер до рождения ребёнка

```dataviewjs
const errors = [];
dv.pages('"persons"').where(p => p.тип === "персона" && p.дата_рождения).forEach(child => {
  const cb = dv.date(String(child.дата_рождения));
  if (!cb) return;
  ["отец", "мать"].forEach(field => {
    if (!child[field]?.path) return;
    const parent = dv.page(child[field].path);
    if (!parent?.дата_смерти) return;
    const pd = dv.date(String(parent.дата_смерти));
    if (pd && cb > pd) {
      errors.push([child.file.link, field, parent.file.link, String(parent.дата_смерти), String(child.дата_рождения)]);
    }
  });
});

if (errors.length > 0) {
  dv.table(["Ребёнок", "Поле", "Родитель", "Смерть род.", "Рождение реб."], errors);
} else {
  dv.paragraph("✅ Все дети рождены при живых родителях");
}
```

### Возраст родителя при рождении ребёнка вне нормы (< 12 или > 80)

```dataviewjs
const errors = [];
dv.pages('"persons"').where(p => p.тип === "персона" && p.дата_рождения).forEach(child => {
  const cb = dv.date(String(child.дата_рождения));
  if (!cb) return;
  ["отец", "мать"].forEach(field => {
    if (!child[field]?.path) return;
    const parent = dv.page(child[field].path);
    if (!parent?.дата_рождения) return;
    const pb = dv.date(String(parent.дата_рождения));
    if (!pb) return;
    const age = (cb - pb) / 31557600000;
    if (age < 12 || age > 80) {
      errors.push([child.file.link, field, parent.file.link, Math.round(age)]);
    }
  });
});

if (errors.length > 0) {
  dv.table(["Ребёнок", "Поле", "Родитель", "Лет родителю"], errors);
} else {
  dv.paragraph("✅ Возраст родителей при рождении детей в пределах нормы");
}
```

### Возраст персоны > 120 лет

```dataviewjs
const errors = [];
dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.дата_рождения && p.дата_смерти)
  .forEach(p => {
    const b = dv.date(String(p.дата_рождения));
    const d = dv.date(String(p.дата_смерти));
    if (b && d) {
      const y = (d - b) / 31557600000;
      if (y > 120) errors.push([p.file.link, Math.round(y)]);
    }
  });

if (errors.length > 0) {
  dv.table(["Персона", "Возраст"], errors);
} else {
  dv.paragraph("✅ Нет персон старше 120 лет");
}
```

### Жив = "да", но возраст > 110 лет

```dataviewjs
const currentYear = new Date().getFullYear();
const errors = [];
dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.жив === "да" && p.дата_рождения)
  .forEach(p => {
    const b = dv.date(String(p.дата_рождения));
    if (!b) return;
    const age = currentYear - b.year;
    if (age > 110) errors.push([p.file.link, b.year, age]);
  });

if (errors.length > 0) {
  dv.table(["Персона", "Год рождения", "Лет сейчас"], errors);
} else {
  dv.paragraph("✅ Нет живых персон возрастом > 110 лет");
}
```

### Дата рождения в будущем

Скорее всего опечатка (например, `2887` вместо `1887`).

```dataviewjs
const currentYear = new Date().getFullYear();
const errors = [];
dv.pages('"persons"')
  .where(p => p.тип === "персона" && p.дата_рождения)
  .forEach(p => {
    const b = dv.date(String(p.дата_рождения));
    if (b && b.year > currentYear) errors.push([p.file.link, p.дата_рождения]);
  });

if (errors.length > 0) {
  dv.table(["Персона", "Дата рождения"], errors);
} else {
  dv.paragraph("✅ Нет дат рождения в будущем");
}
```

### Дата развода раньше даты брака

```dataviewjs
const errors = [];
dv.pages('"families"')
  .where(f => f.тип === "семья" && f.дата_брака && f.дата_развода)
  .forEach(f => {
    const m = dv.date(String(f.дата_брака));
    const d = dv.date(String(f.дата_развода));
    if (m && d && d < m) errors.push([f.file.link, f.дата_брака, f.дата_развода]);
  });

if (errors.length > 0) {
  dv.table(["Семья", "Брак", "Развод"], errors);
} else {
  dv.paragraph("✅ Все даты развода позже дат брака");
}
```

---

## 🔁 Дубликаты

### Возможные дубликаты персон

Совпадение по ФИО + дате рождения.

```dataviewjs
const keys = {};
const dupes = [];

dv.pages('"persons"').where(p => p.тип === "персона").forEach(p => {
  const key = `${p.фамилия || ""}|${p.имя || ""}|${p.отчество || ""}|${String(p.дата_рождения || "")}`;
  if (key === "|||") return;
  if (keys[key]) dupes.push([keys[key].file.link, p.file.link, key]);
  else keys[key] = p;
});

if (dupes.length > 0) {
  dv.table(["Запись 1", "Запись 2", "Ключ (ФИО|Дата)"], dupes);
} else {
  dv.paragraph("✅ Дубликатов персон не обнаружено");
}
```

### Дубликаты семей (одна пара в разных файлах)

```dataviewjs
const keys = {};
const dupes = [];

dv.pages('"families"').where(f => f.тип === "семья" && f.муж?.path && f.жена?.path).forEach(f => {
  const key = `${f.муж.path}|${f.жена.path}`;
  if (keys[key]) dupes.push([keys[key].file.link, f.file.link, f.муж, f.жена]);
  else keys[key] = f;
});

if (dupes.length > 0) {
  dv.table(["Файл 1", "Файл 2", "Муж", "Жена"], dupes);
} else {
  dv.paragraph("✅ Дубликатов семей не обнаружено");
}
```

---

_Последняя проверка: `= date(today)`_

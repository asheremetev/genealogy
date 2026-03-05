#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the vault data
const vaultData = JSON.parse(fs.readFileSync('vault-data.json', 'utf8'));
const persons = vaultData.persons;

// Read the base excalidraw file
const baseExcalidraw = JSON.parse(fs.readFileSync('genealogy-tree.excalidraw', 'utf8'));

// Color palette
const MALE_FILL = '#dbeafe';
const MALE_STROKE = '#1e3a8a';
const FEMALE_FILL = '#fce7f3';
const FEMALE_STROKE = '#9d174d';
const LINE_COLOR = '#1e3a5f';
const SPOUSE_LINE_COLOR = '#9d174d';

// Generation positions (Y coordinates)
const generationY = {
  11: 115,
  10: 260,
  9: 410,
  8: 560,
  7: 710,
  6: 860,
  5: 1010,
  4: 1150,
  3: 1310,
  2: 1460,
  1: 1610,
  0: 1760,
  '-1': 1910,
  '-2': 2060,
};

// Generate unique ID
let seed = 9000;

function generateId() {
  return `gen_${seed++}`;
}

// Create person card element
function createPersonCard(person, x, y) {
  const isMale = person.data.gender === 'M';
  const fill = isMale ? MALE_FILL : FEMALE_FILL;
  const stroke = isMale ? MALE_STROKE : FEMALE_STROKE;

  const id = generateId();
  const cardId = `card_${id}`;
  const textId = `text_${id}`;

  // Extract name and year
  const name = person.data.givenName || '';
  const patronymic = person.data.patronymic || '';
  const year = person.data.birthDate ? person.data.birthDate.substring(0, 4) : '?';

  const displayName = patronymic ? `${name}\n${patronymic}, ${year}` : `${name}\n${year}`;

  return [
    {
      type: 'rectangle',
      id: cardId,
      x: x,
      y: y,
      width: 160,
      height: 45,
      strokeColor: stroke,
      backgroundColor: fill,
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      angle: 0,
      seed: seed++,
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000000),
      isDeleted: false,
      groupIds: [],
      boundElements: [],
      link: null,
      locked: false,
      index: `gen${seed}`,
      frameId: null,
      roundness: null,
      updated: Date.now(),
    },
    {
      type: 'text',
      id: textId,
      x: x + 80,
      y: y + 12,
      width: 1,
      height: 20,
      text: displayName,
      originalText: displayName,
      fontSize: 11,
      fontFamily: 3,
      textAlign: 'center',
      verticalAlign: 'top',
      strokeColor: '#1e3a5f',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      angle: 0,
      seed: seed++,
      version: 1,
      versionNonce: Math.floor(Math.random() * 1000000000),
      isDeleted: false,
      groupIds: [],
      boundElements: [],
      link: null,
      locked: false,
      containerId: cardId,
      lineHeight: 1.2,
      autoResize: true,
      index: `gen${seed}`,
      frameId: null,
      roundness: null,
      updated: Date.now(),
    },
  ];
}

// Create connection line
function createConnectionLine(fromX, fromY, toX, toY, isSpouse = false) {
  const id = `line_${seed++}`;
  return {
    type: 'line',
    id: id,
    x: fromX,
    y: fromY,
    width: toX - fromX,
    height: toY - fromY,
    strokeColor: isSpouse ? SPOUSE_LINE_COLOR : LINE_COLOR,
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: isSpouse ? 'dashed' : 'solid',
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: seed++,
    version: 1,
    versionNonce: Math.floor(Math.random() * 1000000000),
    isDeleted: false,
    groupIds: [],
    boundElements: [],
    link: null,
    locked: false,
    points: [
      [0, 0],
      [toX - fromX, toY - fromY],
    ],
    index: `gen${seed}`,
    frameId: null,
    roundness: null,
    updated: Date.now(),
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    polygon: false,
  };
}

// Determine gender from name
function getGender(name) {
  const femaleNames = [
    'Шереметьева',
    'Анна',
    'Мария',
    'Елена',
    'Вера',
    'Елизавета',
    'Евдокия',
    'Ксения',
    'Софья',
    'Анастасия',
    'Лилия',
    'Лариса',
    'Алла',
    'Дарья',
    'Евлампия',
    'Екатерина',
    'Федосья',
    'Степанида',
    'Федора',
    'Ирина',
  ];
  for (const fn of femaleNames) {
    if (name.includes(fn)) return 'F';
  }
  return 'M';
}

// Define the main lineage with positions
const lineage = [
  { id: 'Григорий Михайлович (ок.1636)', gen: '11', x: 350 },
  { id: 'Иван Григорьевич (ок.1664)', gen: '10', x: 350 },
  { id: 'Андрей Иванович (ок.1715)', gen: '9', x: 350 },
  { id: 'Иван Андреевич (1735)', gen: '8', x: 350 },
  { id: 'Шереметьев Игнатий Кузьмич (ок.1754)', gen: '7', x: 320 },
  { id: 'Елена Ивановна (ок.1756)', gen: '7', x: 480 },
  { id: 'Шереметьев Марк Игнатьевич (ок.1779)', gen: '6', x: 320 },
  { id: 'Ефимья Ивановна (ок.1781)', gen: '6', x: 480 },
  { id: 'Шереметьев Иван Маркович-2 (1838)', gen: '5', x: 250 },
  { id: 'Шереметьев Максим Иванович (1864)', gen: '3', x: 250 },
  { id: 'Анастасия Григорьевна (ок.1840)', gen: '5', x: 450 },
  { id: 'Шереметьев Василий Максимович (1885)', gen: '2', x: 250 },
  { id: 'Мордвинова Мария Андреевна (ок.1889)', gen: '2', x: 450 },
  { id: 'Шереметьев Виктор Васильевич (1909)', gen: '1', x: 250 },
  { id: 'Вавилова Анна Гавриловна (1913)', gen: '1', x: 450 },
  { id: 'Шереметьев Анатолий Викторович (1931)', gen: '0', x: 250 },
  { id: 'Балясникова Лариса Александровна (1936)', gen: '0', x: 450 },
  { id: 'Шереметьев Александр Анатольевич (1960)', gen: '-1', x: 200 },
  { id: 'Шереметьев Юрий Анатольевич (1956)', gen: '-1', x: 380 },
  { id: 'Шереметьев Виктор Александрович (1985)', gen: '-1', x: 550 },
  { id: 'Долгушина Мария Львовна (1962)', gen: '-1', x: 300 },
  { id: 'Зябликова Алла Александровна (1962)', gen: '-1', x: 480 },
  { id: 'Шереметьев Александр Юрьевич (1987)', gen: '-2', x: 300 },
  { id: 'Шереметьева Ирина Юрьевна (1988)', gen: '-2', x: 480 },
  { id: 'Шереметьева Анастасия Александровна (1986)', gen: '-2', x: 650 },
  { id: 'Пивко Мария Александровна (1987)', gen: '-2', x: 420 },
  { id: 'Шереметьева Анна Александровна (2021)', gen: '-2', x: 250 },
  { id: 'Шереметьев Михаил Александрович (2024 )', gen: '-2', x: 400 },
  { id: 'Шереметьева Софья Викторовна (2011)', gen: '-2', x: 500 },
  { id: 'Шереметьева Ксения Викторовна (2020)', gen: '-2', x: 680 },
  { id: 'Черевкова Софья Константиновна (2023)', gen: '-2', x: 580 },
  { id: 'Исайкин Николай Константинович (2015)', gen: '-2', x: 780 },
  { id: 'Исайкина Елена Константиновна (2011)', gen: '-2', x: 900 },
];

// Create elements
const newElements = [];

// Add person cards
lineage.forEach((item) => {
  const y = generationY[item.gen];
  if (y) {
    const gender = getGender(item.id);
    const nameParts = item.id.split('(')[0].trim().split(' ');
    const givenName = nameParts[0] || '';
    const patronymic = nameParts.slice(1).join(' ') || '';
    const yearMatch = item.id.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : '?';

    const cards = createPersonCard(
      { data: { givenName, patronymic, gender, birthDate: year + '-01-01' } },
      item.x,
      y,
    );
    newElements.push(...cards);
  }
});

// Add connection lines (parent-child)
const connections = [
  { from: 'Григорий Михайлович (ок.1636)', to: 'Иван Григорьевич (ок.1664)' },
  { from: 'Иван Григорьевич (ок.1664)', to: 'Андрей Иванович (ок.1715)' },
  { from: 'Андрей Иванович (ок.1715)', to: 'Иван Андреевич (1735)' },
  { from: 'Иван Андреевич (1735)', to: 'Шереметьев Игнатий Кузьмич (ок.1754)' },
  { from: 'Шереметьев Игнатий Кузьмич (ок.1754)', to: 'Шереметьев Марк Игнатьевич (ок.1779)' },
  { from: 'Шереметьев Марк Игнатьевич (ок.1779)', to: 'Шереметьев Иван Маркович-2 (1838)' },
  { from: 'Шереметьев Иван Маркович-2 (1838)', to: 'Шереметьев Максим Иванович (1864)' },
  { from: 'Шереметьев Максим Иванович (1864)', to: 'Шереметьев Василий Максимович (1885)' },
  { from: 'Шереметьев Василий Максимович (1885)', to: 'Шереметьев Виктор Васильевич (1909)' },
  { from: 'Шереметьев Виктор Васильевич (1909)', to: 'Шереметьев Анатолий Викторович (1931)' },
  { from: 'Шереметьев Анатолий Викторович (1931)', to: 'Шереметьев Александр Анатольевич (1960)' },
  { from: 'Шереметьев Анатолий Викторович (1931)', to: 'Шереметьев Юрий Анатольевич (1956)' },
  { from: 'Шереметьев Александр Анатольевич (1960)', to: 'Шереметьев Виктор Александрович (1985)' },
  {
    from: 'Шереметьев Александр Анатольевич (1960)',
    to: 'Шереметьева Анастасия Александровна (1986)',
  },
  { from: 'Шереметьев Юрий Анатольевич (1956)', to: 'Шереметьев Александр Юрьевич (1987)' },
  { from: 'Шереметьев Юрий Анатольевич (1956)', to: 'Шереметьева Ирина Юрьевна (1988)' },
  { from: 'Шереметьев Александр Юрьевич (1987)', to: 'Шереметьева Анна Александровна (2021)' },
  { from: 'Шереметьев Александр Юрьевич (1987)', to: 'Шереметьев Михаил Александрович (2024 )' },
  { from: 'Шереметьев Виктор Александрович (1985)', to: 'Шереметьева Софья Викторовна (2011)' },
  { from: 'Шереметьев Виктор Александрович (1985)', to: 'Шереметьева Ксения Викторовна (2020)' },
  { from: 'Шереметьева Ирина Юрьевна (1988)', to: 'Черевкова Софья Константиновна (2023)' },
  {
    from: 'Шереметьева Анастасия Александровна (1986)',
    to: 'Исайкин Николай Константинович (2015)',
  },
  {
    from: 'Шереметьева Анастасия Александровна (1986)',
    to: 'Исайкина Елена Константиновна (2011)',
  },
];

// Add spouse connections
const spouseConnections = [
  { p1: 'Шереметьев Игнатий Кузьмич (ок.1754)', p2: 'Елена Ивановна (ок.1756)' },
  { p1: 'Шереметьев Марк Игнатьевич (ок.1779)', p2: 'Ефимья Ивановна (ок.1781)' },
  { p1: 'Шереметьев Иван Маркович-2 (1838)', p2: 'Анастасия Григорьевна (ок.1840)' },
  { p1: 'Шереметьев Василий Максимович (1885)', p2: 'Мордвинова Мария Андреевна (ок.1889)' },
  { p1: 'Шереметьев Виктор Васильевич (1909)', p2: 'Вавилова Анна Гавриловна (1913)' },
  { p1: 'Шереметьев Анатолий Викторович (1931)', p2: 'Балясникова Лариса Александровна (1936)' },
  { p1: 'Шереметьев Александр Анатольевич (1960)', p2: 'Долгушина Мария Львовна (1962)' },
  { p1: 'Шереметьев Юрий Анатольевич (1956)', p2: 'Зябликова Алла Александровна (1962)' },
  { p1: 'Шереметьев Александр Юрьевич (1987)', p2: 'Пивко Мария Александровна (1987)' },
];

// Add parent-child lines
connections.forEach((conn) => {
  const fromItem = lineage.find((l) => l.id === conn.from);
  const toItem = lineage.find((l) => l.id === conn.to);

  if (fromItem && toItem) {
    const fromY = generationY[fromItem.gen];
    const toY = generationY[toItem.gen];
    if (fromY && toY) {
      newElements.push(createConnectionLine(fromItem.x + 80, fromY + 45, toItem.x + 80, toY));
    }
  }
});

// Add spouse lines
spouseConnections.forEach((conn) => {
  const p1 = lineage.find((l) => l.id === conn.p1);
  const p2 = lineage.find((l) => l.id === conn.p2);
  if (p1 && p2) {
    const y1 = generationY[p1.gen];
    const y2 = generationY[p2.gen];
    if (y1 === y2 && y1) {
      newElements.push(createConnectionLine(p1.x + 160, y1 + 22, p2.x, y2 + 22, true));
    }
  }
});

// Add new elements to the base excalidraw
baseExcalidraw.elements.push(...newElements);

// Write the result
fs.writeFileSync('genealogy-tree.excalidraw', JSON.stringify(baseExcalidraw, null, 2));

console.log(`Added ${newElements.length} elements to genealogy-tree.excalidraw`);
console.log(`  - ${lineage.length} person cards`);
console.log(`  - ${connections.length} parent-child connections`);
console.log(`  - ${spouseConnections.length} spouse connections`);

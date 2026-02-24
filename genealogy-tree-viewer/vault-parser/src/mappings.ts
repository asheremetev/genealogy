/**
 * Comprehensive Russian → English mappings for YAML fields and values.
 * Single source of truth for the entire RU→EN transformation layer.
 */

export const TYPE_MAP: Readonly<Record<string, string>> = {
  персона: 'person',
  семья: 'family',
  событие: 'event',
  источник: 'source',
  место: 'place',
  история: 'story',
  документ: 'document',
  запись_журнала: 'research_entry',
};

export const COMMON_FIELDS: Readonly<Record<string, string>> = {
  тип: 'type',
  теги: 'tags',
  создано: 'createdAt',
  обновлено: 'updatedAt',
  достоверность: 'confidence',
};

const PERSON_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  фамилия: 'surname',
  имя: 'givenName',
  отчество: 'patronymic',
  пол: 'gender',
  дата_рождения: 'birthDate',
  место_рождения: 'birthPlace',
  дата_смерти: 'deathDate',
  место_смерти: 'deathPlace',
  дата_крещения: 'baptismDate',
  место_крещения: 'baptismPlace',
  отец: 'fatherId',
  мать: 'motherId',
  семьи: 'familyIds',
  профессия: 'occupation',
  сословие: 'socialClass',
  образование: 'education',
  религия: 'religion',
  поколение: 'generation',
  места_жизни: 'residences',
  жив: 'isAlive',
  статус_исследования: 'researchStatus',
  приоритет: 'priority',
};

const FAMILY_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  муж: 'husbandId',
  жена: 'wifeId',
  дата_брака: 'marriageDate',
  место_брака: 'marriagePlace',
  место_венчания: 'weddingPlace',
  дата_развода: 'divorceDate',
  статус_брака: 'marriageStatus',
};

const EVENT_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  заголовок: 'title',
  вид_события: 'eventType',
  дата: 'date',
  дата_окончания: 'endDate',
  место: 'placeId',
  участники: 'participantIds',
  связанные_семьи: 'relatedFamilyIds',
  источники: 'sourceIds',
  описание_кратко: 'summary',
};

const SOURCE_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  категория: 'category',
  архив: 'archive',
  фонд: 'fund',
  опись: 'inventory',
  дело: 'fileRef',
  лист: 'sheet',
  год_документа: 'documentYear',
  дата_обнаружения: 'discoveryDate',
  ссылка_онлайн: 'onlineUrl',
  персоны: 'personIds',
  оцифровано: 'digitized',
  состояние: 'condition',
};

const PLACE_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  название: 'name',
  тип_места: 'placeType',
  современное_название: 'modernName',
  страна_сейчас: 'currentCountry',
  регион_сейчас: 'currentRegion',
  страна_исторически: 'historicalCountry',
  регион_исторически: 'historicalRegion',
  координаты: 'coordinates',
  период_связи: 'relevancePeriod',
  существует: 'exists',
};

const STORY_FIELDS: Readonly<Record<string, string>> = {
  ...COMMON_FIELDS,
  заголовок: 'title',
  рассказчик: 'narrator',
  дата_записи: 'recordDate',
  период_событий: 'eventPeriod',
  персоны: 'personIds',
  места: 'placeIds',
  источник_истории: 'sourceType',
};

export const FIELD_MAPS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  person: PERSON_FIELDS,
  family: FAMILY_FIELDS,
  event: EVENT_FIELDS,
  source: SOURCE_FIELDS,
  place: PLACE_FIELDS,
  story: STORY_FIELDS,
};

export const VALUE_MAPS: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  type: TYPE_MAP,

  gender: {
    М: 'M',
    Ж: 'F',
    неизвестно: 'unknown',
  },

  confidence: {
    высокая: 'high',
    средняя: 'medium',
    низкая: 'low',
    предположение: 'speculative',
  },

  isAlive: {
    да: true,
    нет: false,
    неизвестно: null,
  },

  marriageStatus: {
    в_браке: 'married',
    'в браке': 'married',
    вдовство: 'widowed',
    'вдовец/вдова': 'widowed',
    развод: 'divorced',
    неизвестно: 'unknown',
  },

  digitized: {
    да: 'yes',
    нет: 'no',
    частично: 'partial',
  },

  exists: {
    да: true,
    нет: false,
    неизвестно: null,
  },

  researchStatus: {
    полностью: 'complete',
    частично: 'partial',
    начато: 'started',
    не_начато: 'not_started',
  },

  priority: {
    высокий: 'high',
    средний: 'medium',
    низкий: 'low',
  },

  eventType: {
    рождение: 'birth',
    смерть: 'death',
    брак: 'marriage',
    развод: 'divorce',
    миграция: 'migration',
    мобилизация: 'mobilization',
    арест: 'arrest',
    раскулачивание: 'dekulakization',
    другое: 'other',
  },

  condition: {
    хорошее: 'good',
    повреждён: 'damaged',
    частично_читаем: 'partially_readable',
    копия: 'copy',
  },

  sourceType: {
    устный_рассказ: 'oral',
    письмо: 'letter',
    дневник: 'diary',
    мемуары: 'memoir',
    другое: 'other',
  },
};

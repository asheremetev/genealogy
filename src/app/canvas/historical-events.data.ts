import type { HistoricalEvent } from './canvas.types';

/**
 * Russian historical events shown in the canvas timeline.
 * Events outside the family tree's year range (±50 yr) are filtered out automatically.
 */
export const HISTORICAL_EVENTS: readonly HistoricalEvent[] = [
    { year: 1533, label: 'Правление Ивана IV (Грозного)' },
    { year: 1547, label: 'Венчание Ивана IV на царство' },
    { year: 1552, label: 'Взятие Казани' },
    { year: 1565, label: 'Опричнина' },
    { year: 1598, label: 'Смутное время' },
    { year: 1613, label: 'Начало правления Романовых' },
    { year: 1649, label: 'Соборное уложение' },
    { year: 1670, label: 'Восстание Степана Разина' },
    { year: 1703, label: 'Основание Петербурга' },
    { year: 1762, label: 'Эпоха Екатерины II' },
    { year: 1773, label: 'Пугачёвское восстание' },
    { year: 1812, label: 'Отечественная война' },
    { year: 1825, label: 'Восстание декабристов' },
    { year: 1853, label: 'Крымская война' },
    { year: 1861, label: 'Отмена крепостного права' },
    { year: 1877, label: 'Русско-турецкая война' },
    { year: 1881, label: 'Убийство Александра II' },
    { year: 1904, label: 'Русско-японская война' },
    { year: 1905, label: 'Революция 1905 г.' },
    { year: 1914, label: 'Первая мировая война' },
    { year: 1917, label: 'Октябрьская революция' },
    { year: 1918, label: 'Гражданская война' },
    { year: 1941, label: 'Великая Отечественная война' },
    { year: 1945, label: 'Победа в ВОВ' },
    { year: 1961, label: 'Полёт Гагарина' },
    { year: 1991, label: 'Распад СССР' },
    { year: 2020, label: 'Пандемия COVID-19' },
];

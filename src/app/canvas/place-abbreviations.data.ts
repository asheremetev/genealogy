/**
 * Substring → abbreviation mapping for verbose place names.
 * Keys are matched via `String.includes()`, first match wins.
 */
export const PLACE_ABBREVIATIONS: Record<string, string> = {
    'Санкт-Петербург': 'г. СПб',
    'Москва': 'г. Москва',
    'Ярославская': 'Ярославск. губ.',
    'Новосокольн': 'Псковская губ.',
    'Псковская': 'Псковская губ.',
    'Горбово': 'д. Горбово',
    'Бровцыно': 'д. Бровцыно',
    'Парнева': 'д. Парнева',
};

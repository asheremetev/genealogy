export interface PersonData {
    readonly gender: 'M' | 'F';
    readonly firstName: string;
    readonly lastName: string;
    readonly patronymic: string;
    readonly birthDate: string;
    readonly deathDate: string;
    readonly birthPlace: string;
    readonly deathPlace: string;
    readonly generation: number | null;
    readonly alive: boolean;
    readonly reliability: string;
    readonly religion?: string;
    readonly marriages?: Readonly<Record<string, string>>;
}

export interface SearchOption {
    readonly label: string;
    readonly value: string;
}

export const RELIGION_ICONS: Readonly<Record<string, string>> = {
    православие: '☦',
    ортодоксальное: '☦',
    ислам: '☪',
    католичество: '✝',
    иудаизм: '✡',
};

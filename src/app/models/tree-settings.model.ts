export interface TreeSettings {
    readonly showSiblings: boolean;
    readonly hoverPathToMain: boolean;
    readonly miniTree: boolean;
    readonly ancestryDepth: number | null; // null = ∞
    readonly progenyDepth: number | null; // null = ∞
    readonly cardXSpacing: number;
    readonly cardYSpacing: number;
    readonly orientation: 'vertical' | 'horizontal';
}

export const DEFAULT_TREE_SETTINGS: Readonly<TreeSettings> = {
    showSiblings: true,
    hoverPathToMain: true,
    miniTree: false,
    ancestryDepth: null,
    progenyDepth: null,
    cardXSpacing: 260,
    cardYSpacing: 150,
    orientation: 'vertical',
};

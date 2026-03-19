export type CanvasTextAlign = 'left' | 'center' | 'right';
export type CanvasBorder = 'thin' | 'thick' | 'dashed' | 'dotted' | 'invisible';

export interface TreeNodeDatum {
    readonly data: { readonly id: string; readonly data: import('../models/person.model').PersonData };
    readonly x: number;
    readonly y: number;
}

export interface CanvasNode {
    readonly id: string;
    readonly type: 'text';
    readonly text: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly color?: string;
    readonly styleAttributes?: {
        readonly textAlign?: CanvasTextAlign;
        readonly border?: CanvasBorder;
    };
}

export interface CanvasEdge {
    readonly id: string;
    readonly fromNode: string;
    readonly fromSide: string;
    readonly toNode: string;
    readonly toSide: string;
    readonly toEnd: string;
    readonly color?: string;
    readonly styleAttributes?: {
        readonly pathfindingMethod: string;
    };
}

export interface HistoricalEvent {
    readonly year: number;
    readonly label: string;
}

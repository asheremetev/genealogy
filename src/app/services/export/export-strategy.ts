export interface ExportStrategy {
    export(container: HTMLElement): Promise<void>;
}

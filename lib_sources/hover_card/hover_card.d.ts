export type HoverTarget = {
    kind: 'entity' | 'literal';
    idOrValue: string;
    dataType?: string;
    lang?: string;
};
export interface HoverCardData {
    title: string;
    subtitle: string;
    contentHtml: string;
}
export interface HoverCardConfig {
    entityResolver: (uri: string) => Promise<HoverCardData | null>;
}
export declare class HoverCard {
    private static config;
    private static hoverTimer;
    private static currentTarget;
    private static cardEl;
    private static isVisible;
    private static targetX;
    private static targetY;
    private static rafId;
    static init(config: HoverCardConfig): void;
    /**
     * Resolves DOM Element -> Abstract Target
     * Handles specific data contracts AND fallback heuristics.
     */
    private static resolveTarget;
    static showHoverCard(target: HoverTarget, x: number, y: number): Promise<void>;
    static hideHoverCard(): void;
    /**
     * Performance: RAF Loop for Positioning.
     * Separates Read/Write to avoid layout thrashing.
     */
    private static startRafLoop;
    private static requestPositionUpdate;
    private static escapeHtml;
    private static renderLiteral;
    private static render;
}

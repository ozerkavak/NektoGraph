declare class HoverCard {
    private static config;
    private static hoverTimer;
    private static currentTarget;
    private static cardEl;
    private static isVisible;
    private static targetX;
    private static targetY;
    private static rafId;
    private static initialized;
    private static eventsBound;
    static init(config: HoverCardConfig): void;
    static resolveTarget(el: HTMLElement): HoverTarget | null;
    static showHoverCard(target: HoverTarget, x: number, y: number): Promise<void>;
    static hideHoverCard(): void;
    private static startRafLoop;
    private static requestPositionUpdate;
    private static escapeHtml;
    private static renderLiteral;
    private static render;
}
export { HoverCard }
export default HoverCard;

declare interface HoverCardConfig {
    entityResolver: (uri: string) => Promise<HoverCardData | null>;
}

declare interface HoverCardData {
    title: string;
    subtitle: string;
    contentHtml: string;
}

declare type HoverTarget = {
    kind: 'entity' | 'literal';
    idOrValue: string;
    dataType?: string;
    lang?: string;
};

export { }

export interface ElementOptions {
    className?: string;
    id?: string;
    text?: string;
    html?: string;
    style?: Partial<CSSStyleDeclaration>;
    parent?: HTMLElement;
    attributes?: Record<string, string>;
    onClick?: (e: MouseEvent) => void;
}
export declare class DOM {
    static create(tag: string, options?: ElementOptions): HTMLElement;
    static setStyle(el: HTMLElement, style: Partial<CSSStyleDeclaration>): void;
}

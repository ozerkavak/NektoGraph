
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

export class DOM {
    static create(tag: string, options: ElementOptions = {}): HTMLElement {
        const el = document.createElement(tag);

        if (options.className) el.className = options.className;
        if (options.id) el.id = options.id;
        if (options.text) el.innerText = options.text;
        if (options.html) el.innerHTML = options.html;

        if (options.style) {
            Object.assign(el.style, options.style);
        }

        if (options.attributes) {
            Object.entries(options.attributes).forEach(([k, v]) => el.setAttribute(k, v));
        }

        if (options.onClick) {
            el.addEventListener('click', options.onClick);
        }

        if (options.parent) {
            options.parent.appendChild(el);
        }

        return el;
    }

    static setStyle(el: HTMLElement, style: Partial<CSSStyleDeclaration>) {
        Object.assign(el.style, style);
    }
}

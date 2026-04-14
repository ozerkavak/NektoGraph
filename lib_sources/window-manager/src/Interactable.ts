
import { WindowManager } from "./WindowManager";

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type InteractionMode = 'none' | 'drag' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | 'resize-ne' | 'resize-nw' | 'resize-se' | 'resize-sw';

export class Interactable {
    private mode: InteractionMode = 'none';
    private startX = 0;
    private startY = 0;
    private startRect: Rect = { x: 0, y: 0, width: 0, height: 0 };

    constructor(
        private element: HTMLElement,
        private handle: HTMLElement,
        private manager: WindowManager,
        private onUpdate: (rect: Rect) => void,
        private onInteractStart: () => void,
        private onInteractEnd: () => void
    ) {
        this.init();
    }

    private init() {
        this.handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).tagName === 'BUTTON') return;
            this.startInteraction(e, 'drag');
        });

        this.element.addEventListener('mousedown', (e) => {
            if (e.target !== this.element && !(e.target as HTMLElement).classList.contains('resize-handle')) return;

            const mode = this.getResizeMode(e);
            if (mode !== 'none') {
                this.startInteraction(e, mode);
            }
        });

        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    }

    private getResizeMode(e: MouseEvent): InteractionMode {
        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-handle')) {
            if (target.classList.contains('n')) return 'resize-n';
            if (target.classList.contains('s')) return 'resize-s';
            if (target.classList.contains('e')) return 'resize-e';
            if (target.classList.contains('w')) return 'resize-w';
            if (target.classList.contains('ne')) return 'resize-ne';
            if (target.classList.contains('nw')) return 'resize-nw';
            if (target.classList.contains('se')) return 'resize-se';
            if (target.classList.contains('sw')) return 'resize-sw';
        }
        return 'none';
    }

    private startInteraction(e: MouseEvent, mode: InteractionMode) {
        if (this.element.classList.contains('minimized')) return;
        
        this.mode = mode;
        this.startX = e.clientX;
        this.startY = e.clientY;

        this.startRect = {
            x: this.element.offsetLeft,
            y: this.element.offsetTop,
            width: this.element.offsetWidth,
            height: this.element.offsetHeight
        };

        this.onInteractStart();
        document.body.style.userSelect = 'none';
    }

    private onMouseMove(e: MouseEvent) {
        if (this.mode === 'none') return;

        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;

        let newRect = { ...this.startRect };

        if (this.mode === 'drag') {
            newRect.x += dx;
            newRect.y += dy;
        } else {
            // Resizing
            if (this.mode.includes('e')) {
                newRect.width = Math.max(300, this.startRect.width + dx);
            }
            if (this.mode.includes('w')) {
                const w = Math.max(300, this.startRect.width - dx);
                newRect.x = this.startRect.x + (this.startRect.width - w);
                newRect.width = w;
            }
            if (this.mode.includes('s')) {
                newRect.height = Math.max(200, this.startRect.height + dy);
            }
            if (this.mode.includes('n')) {
                const h = Math.max(200, this.startRect.height - dy);
                newRect.y = this.startRect.y + (this.startRect.height - h);
                newRect.height = h;
            }
        }

        const clamped = this.manager.clampToBounds(newRect, this.mode === 'drag');
        this.onUpdate(clamped);
    }

    private onMouseUp() {
        if (this.mode !== 'none') {
            this.mode = 'none';
            document.body.style.userSelect = 'auto';
            this.onInteractEnd();
        }
    }
}

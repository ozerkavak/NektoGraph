
import { DOM } from "./dom";
import { WindowManager } from "./WindowManager";
import { Interactable, Rect } from "./Interactable";

export type WindowContentRenderer = (container: HTMLElement, winId: string) => void;

export interface WindowState {
    id: string;
    entityId: string | null;
    title: string;
    metadata?: any;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    isMinimized: boolean;
    isMaximized: boolean;
    prevBounds?: Rect;
    group?: string;
}

export class WorkbenchWindow {
    public element: HTMLElement;
    private contentContainer!: HTMLElement;
    private titleEl!: HTMLElement;

    private _isDestroyed = false;

    constructor(
        public state: WindowState,
        private manager: WindowManager,
        private contentRenderer: WindowContentRenderer
    ) {
        this.element = this.render();
        const handle = this.element.querySelector('.window-header') as HTMLElement;
        new Interactable(
            this.element,
            handle,
            manager,
            (rect) => this.setBounds(rect),
            () => this.onInteractStart(),
            () => this.onInteractEnd()
        );
    }

    get id() { return this.state.id; }
    get entityId() { return this.state.entityId; }
    get content() { return this.contentContainer; }

    private render(): HTMLElement {
        const el = DOM.create('div', {
            id: this.state.id,
            className: 'wb-window',
            style: {
                left: this.state.x + 'px',
                top: this.state.y + 'px',
                width: this.state.width + 'px',
                height: this.state.height + 'px',
                zIndex: this.state.zIndex.toString()
            }
        });

        const header = DOM.create('div', {
            className: 'window-header',
            parent: el,
            html: `
                <div class="win-title">${this.state.title}</div>
                <div class="win-controls">
                    <button class="win-btn min" title="Minimize">_</button>
                    <button class="win-btn max" title="Maximize">□</button>
                    <button class="win-btn close" title="Close">×</button>
                </div>
            `
        });

        this.titleEl = header.querySelector('.win-title') as HTMLElement;

        header.querySelector('.min')?.addEventListener('click', (e) => { e.stopPropagation(); this.minimize(); });
        header.querySelector('.max')?.addEventListener('click', (e) => { e.stopPropagation(); this.maximize(); });
        header.querySelector('.close')?.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        header.addEventListener('dblclick', () => {
            if (this.state.isMinimized) this.restore();
            else this.maximize();
        });

        this.contentContainer = DOM.create('div', {
            className: 'window-content',
            parent: el
        });

        this.contentRenderer(this.contentContainer, this.state.id);

        const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
        handles.forEach(h => {
            DOM.create('div', {
                className: `resize-handle ${h}`,
                parent: el
            });
        });

        el.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.bringToFront();
        });

        return el;
    }

    public setTitle(title: string) {
        this.state.title = title;
        if (this.titleEl) this.titleEl.innerText = title;
    }

    public setActive(active: boolean) {
        if (active) this.element.classList.add('active');
        else this.element.classList.remove('active');
    }

    public setZIndex(z: number) {
        this.state.zIndex = z;
        this.element.style.zIndex = z.toString();
    }

    public bringToFront() {
        this.manager.focus(this.state.id);
    }

    public refresh(context: 'global' | 'targeted' = 'targeted') {
        if (context === 'global' && this.state.metadata?.granularOnly) {
            return;
        }
        this.contentContainer.innerHTML = '';
        this.contentRenderer(this.contentContainer, this.state.id);
    }

    public setBounds(rect: Rect) {
        if (this._isDestroyed) return;
        
        // While minimized, we only allow position updates, NEVER width/height pollution
        if (this.state.isMinimized) {
            this.element.style.left = rect.x + 'px';
            this.element.style.top = rect.y + 'px';
            return;
        }

        this.state.x = rect.x;
        this.state.y = rect.y;
        this.state.width = rect.width;
        this.state.height = rect.height;

        this.element.style.left = rect.x + 'px';
        this.element.style.top = rect.y + 'px';
        this.element.style.width = rect.width + 'px';
        this.element.style.height = rect.height + 'px';
    }

    public setDockPosition(x: number, y: number, width: number) {
        this.element.classList.add('minimized');
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
        this.element.style.width = width + 'px';
        this.element.style.height = '40px'; 
    }

    public minimize() {
        if (this.state.isMinimized) return;
        
        if (this.state.isMaximized) {
             this.state.isMaximized = false;
             this.element.classList.remove('maximized');
             if (this.state.prevBounds) {
                 this.state.x = this.state.prevBounds.x;
                 this.state.y = this.state.prevBounds.y;
                 this.state.width = this.state.prevBounds.width;
                 this.state.height = this.state.prevBounds.height;
             }
        }
        
        this.state.isMinimized = true;
        this.manager.minimize(this.state.id);
    }

    public maximize() {
        if (this.state.isMaximized) {
            this.restore();
            return;
        }

        if (this.state.isMinimized) {
            this.restore();
        }

        this.state.prevBounds = {
            x: this.state.x, y: this.state.y,
            width: this.state.width, height: this.state.height
        };

        this.state.isMaximized = true;
        this.element.classList.remove('minimized');
        this.element.classList.add('maximized');

        this.setBounds({
            x: 0,
            y: 0,
            width: this.element.parentElement?.clientWidth || window.innerWidth,
            height: this.element.parentElement?.clientHeight || window.innerHeight
        });

        this.bringToFront();
    }

    public restore() {
        if (this.state.isMinimized) {
            this.state.isMinimized = false;
            this.element.classList.remove('minimized');
            // We use the last known GOOD coordinates
            this.element.style.left = this.state.x + 'px';
            this.element.style.top = this.state.y + 'px';
            this.element.style.width = this.state.width + 'px';
            this.element.style.height = this.state.height + 'px';
            
            this.bringToFront();
            this.manager.arrangeMinimised();
        } else if (this.state.isMaximized) {
            this.state.isMaximized = false;
            this.element.classList.remove('maximized');
            if (this.state.prevBounds) {
                this.setBounds(this.state.prevBounds);
            }
        }
    }

    public close() {
        this.manager.close(this.state.id);
    }

    public destroy() {
        this._isDestroyed = true;
        this.element.remove();
    }

    private onInteractStart() {
        this.element.classList.add('interacting');
        this.bringToFront();
    }
    private onInteractEnd() {
        this.element.classList.remove('interacting');
    }
}

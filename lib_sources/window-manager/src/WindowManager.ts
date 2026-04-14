
import { WorkbenchWindow, WindowContentRenderer } from "./WorkbenchWindow";
import { Rect } from "./Interactable";

export class WindowManager {
    public windows: Map<string, WorkbenchWindow> = new Map();
    private _container: HTMLElement | null = null;
    private _activeId: string | null = null;
    private maxZ = 100;
    public onStateChange: () => void = () => { };

    private _containerRect: DOMRect | null = null;
    private containerId: string;

    constructor(containerId: string) {
        this.containerId = containerId;

        window.addEventListener('resize', () => {
            if (this._container) {
                this._containerRect = this._container.getBoundingClientRect();
                this.arrangeMinimised();
            }
        });
    }

    private get container(): HTMLElement {
        if (!this._container) {
            this._container = document.getElementById(this.containerId) || document.body || document.documentElement;
        }
        return this._container;
    }

    private get containerRect(): DOMRect {
        if (!this._containerRect) {
            const container = this.container;
            this._containerRect = container ? container.getBoundingClientRect() : new DOMRect(0, 0, 1024, 768);
        }
        return this._containerRect;
    }

    public setTheme(theme: 'day' | 'night' | 'custom') {
        const c = this.container;
        if (c) {
            c.setAttribute('data-wm-theme', theme);
        }
    }

    public setContainer(containerId: string) {
        const el = document.getElementById(containerId);
        if (el) {
            this._container = el;
            this._containerRect = el.getBoundingClientRect();
            this.windows.forEach(w => {
                if (w.element.parentElement !== el) {
                    el.appendChild(w.element);
                }
            });
        }
    }

    public get activeId() { return this._activeId; }

    public getWindow(id: string) { return this.windows.get(id); }

    public listWindows() {
        return Array.from(this.windows.values()).sort((a, b) => a.state.zIndex - b.state.zIndex);
    }

    public create(entityId: string | null, title: string, contentRenderer: WindowContentRenderer, metadata?: any, group?: string): WorkbenchWindow {
        if (entityId) {
            const existing = Array.from(this.windows.values()).find(w => w.state.entityId === entityId && w.state.group === group);
            if (existing) {
                if (existing.state.isMinimized) {
                    existing.restore();
                }
                this.focus(existing.id);
                if (title && title !== existing.state.title) {
                    existing.setTitle(title);
                }
                return existing;
            }
        }

        const id = 'win_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        const win = new WorkbenchWindow({
            id,
            entityId,
            title,
            metadata,
            x: 50 + (this.windows.size * 30),
            y: 50 + (this.windows.size * 30),
            width: 900,
            height: 450,
            zIndex: ++this.maxZ,
            isMinimized: false,
            isMaximized: false,
            group
        }, this, contentRenderer);

        this.windows.set(id, win);
        this.container.appendChild(win.element);
        this.focus(id);
        this.onStateChange();

        return win;
    }

    public focus(id: string) {
        const win = this.windows.get(id);
        if (win) {
            win.setZIndex(++this.maxZ);
            this._activeId = id;
            this.onStateChange();
            this.windows.forEach(w => w.setActive(w.id === id));
        }
    }

    public close(id: string) {
        const win = this.windows.get(id);
        if (win) {
            win.destroy();
            this.windows.delete(id);
            if (this._activeId === id) this._activeId = null;
        }
        this.arrangeMinimised();
        this.onStateChange();
    }

    public minimize(_id: string) {
        this.arrangeMinimised();
        this.onStateChange();
    }

    public minimizeAll() {
        this.windows.forEach(w => w.minimize());
    }

    public toggleMinimizeAll() {
        const allMinimized = Array.from(this.windows.values()).every(w => w.state.isMinimized);
        if (allMinimized) {
            this.restoreAll();
        } else {
            this.minimizeAll();
        }
    }

    public restoreAll() {
        this.windows.forEach(w => w.restore());
    }

    public closeAll() {
        Array.from(this.windows.values()).forEach(w => w.close());
    }

    public cascade() {
        let i = 0;
        const offset = 30;
        const startX = 50;
        const startY = 50;

        this.windows.forEach(w => {
            if (w.state.isMinimized) w.restore();
            w.setBounds({
                x: startX + (i * offset),
                y: startY + (i * offset),
                width: 900,
                height: 450
            });
            w.bringToFront();
            i++;
        });

        this.onStateChange();
    }

    public clampToBounds(rect: Rect, _strict: boolean): Rect {
        const bounds = this.containerRect;
        const newRect = { ...rect };

        newRect.width = Math.max(300, newRect.width);
        newRect.height = Math.max(200, newRect.height);

        if (newRect.x < 0) newRect.x = 0;
        if (newRect.y < 0) newRect.y = 0;

        if (newRect.x + newRect.width > bounds.width) {
            newRect.x = Math.max(0, bounds.width - newRect.width);
            if (newRect.x + newRect.width > bounds.width) newRect.width = bounds.width;
        }

        if (newRect.y + newRect.height > bounds.height) {
            newRect.y = Math.max(0, bounds.height - newRect.height);
            if (newRect.y + newRect.height > bounds.height) newRect.height = bounds.height;
        }

        return newRect;
    }

    public arrangeMinimised() {
        const minimized = Array.from(this.windows.values()).filter(w => w.state.isMinimized);
        const width = 140;
        const gap = 6;
        const startX = 6;

        minimized.forEach((w, i) => {
            const x = startX + (i * (width + gap));
            const y = this.containerRect.height - 50;
            w.setDockPosition(x, y, width);
        });
    }

    public refreshAllWindows() {
        this.windows.forEach(w => {
            try {
                w.refresh('global');
            } catch (e) {
                console.error(`[WindowManager] Window ${w.id} refresh failed`, e);
            }
        });
        if (this.onStateChange) this.onStateChange();
    }
 
    public refreshWindows(entityId: string) {
        this.windows.forEach(w => {
            if (w.state.entityId === entityId) {
                try {
                    w.refresh('targeted');
                } catch (e) {
                    console.error(`[WindowManager] Window ${w.id} refresh failed for ${entityId}`, e);
                }
            }
        });
        if (this.onStateChange) this.onStateChange();
    }

    public renameWindow(oldId: string, newEntityId: string) {
        const win = this.windows.get(oldId);
        if (win) {
            win.state.entityId = newEntityId;
            this.onStateChange();
        }
    }
}

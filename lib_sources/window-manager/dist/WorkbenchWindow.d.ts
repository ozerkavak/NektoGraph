import { WindowManager } from './WindowManager';
import { Rect } from './Interactable';

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
export declare class WorkbenchWindow {
    state: WindowState;
    private manager;
    private contentRenderer;
    element: HTMLElement;
    private contentContainer;
    private titleEl;
    private _isDestroyed;
    constructor(state: WindowState, manager: WindowManager, contentRenderer: WindowContentRenderer);
    get id(): string;
    get entityId(): string | null;
    get content(): HTMLElement;
    private render;
    setTitle(title: string): void;
    setActive(active: boolean): void;
    setZIndex(z: number): void;
    bringToFront(): void;
    refresh(): void;
    setBounds(rect: Rect): void;
    setDockPosition(x: number, y: number, width: number): void;
    minimize(): void;
    maximize(): void;
    restore(): void;
    close(): void;
    destroy(): void;
    private onInteractStart;
    private onInteractEnd;
}

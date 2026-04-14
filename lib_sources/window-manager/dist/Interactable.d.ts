import { WindowManager } from './WindowManager';

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
export type InteractionMode = 'none' | 'drag' | 'resize-n' | 'resize-s' | 'resize-e' | 'resize-w' | 'resize-ne' | 'resize-nw' | 'resize-se' | 'resize-sw';
export declare class Interactable {
    private element;
    private handle;
    private manager;
    private onUpdate;
    private onInteractStart;
    private onInteractEnd;
    private mode;
    private startX;
    private startY;
    private startRect;
    constructor(element: HTMLElement, handle: HTMLElement, manager: WindowManager, onUpdate: (rect: Rect) => void, onInteractStart: () => void, onInteractEnd: () => void);
    private init;
    private getResizeMode;
    private startInteraction;
    private onMouseMove;
    private onMouseUp;
}

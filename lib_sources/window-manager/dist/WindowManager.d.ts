import { WorkbenchWindow, WindowContentRenderer } from './WorkbenchWindow';
import { Rect } from './Interactable';

export declare class WindowManager {
    windows: Map<string, WorkbenchWindow>;
    private _container;
    private _activeId;
    private maxZ;
    onStateChange: () => void;
    private _containerRect;
    private containerId;
    constructor(containerId: string);
    private get container();
    private get containerRect();
    setTheme(theme: 'day' | 'night' | 'custom'): void;
    setContainer(containerId: string): void;
    get activeId(): string | null;
    getWindow(id: string): WorkbenchWindow | undefined;
    listWindows(): WorkbenchWindow[];
    create(entityId: string | null, title: string, contentRenderer: WindowContentRenderer, metadata?: any, group?: string): WorkbenchWindow;
    focus(id: string): void;
    close(id: string): void;
    minimize(_id: string): void;
    minimizeAll(): void;
    toggleMinimizeAll(): void;
    restoreAll(): void;
    closeAll(): void;
    cascade(): void;
    clampToBounds(rect: Rect, _strict: boolean): Rect;
    arrangeMinimised(): void;
    refreshAllWindows(): void;
    renameWindow(oldId: string, newEntityId: string): void;
}

import { DraftStore } from '@triplestore/session';

/**
 * UIState: Central store for non-persistent, ephemeral UI states.
 * Used for coordinating state between detached modules (Drag, Dashboards, Windows).
 */
export class UIState {
    public currentSession: DraftStore | null = null;
    public currentDashboardActive: boolean = true;

    // View Transformation State
    public isDragging: boolean = false;
    public dragWinId: string | null = null;
    public dragOffset: { x: number, y: number } = { x: 0, y: 0 };

    private static _instance: UIState;
    public static get instance(): UIState {
        if (!this._instance) this._instance = new UIState();
        return this._instance;
    }
}

export const uiState = UIState.instance;

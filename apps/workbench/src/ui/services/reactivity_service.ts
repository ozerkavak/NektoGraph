
import { IQuadStore } from '@triplestore/core';
import { WindowManager } from '@triplestore/window-manager';

/**
 * ReactivityService
 * Managed global UI refresh logic, debouncing updates when the store changes.
 */
export class ReactivityService {
    private refreshTimeout: any = null;

    constructor(
        private store: IQuadStore,
        private windowManager: WindowManager
    ) {}

    public init() {
        // Listen to data changes in the main store
        this.store.on('data', () => {
            if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
            
            this.refreshTimeout = setTimeout(() => {
                // If DataSync is OFF, suppress all automatic reactivity
                if (typeof (window as any).state !== 'undefined' && (window as any).state.dataSyncMode === 'off') {
                    return;
                }

                // Use DataSync engine for centralized refresh
                if (typeof (window as any).state !== 'undefined') {
                    (window as any).state.dataSync.refreshUI();
                } else {
                    // Fallback if state is not available (shouldn't happen)
                    this.windowManager.refreshAllWindows();
                }
            }, 100); // 100ms debounce
        });
    }

    public triggerManualRefresh() {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
        if (typeof (window as any).state !== 'undefined') {
            (window as any).state.dataSync.refreshUI();
        } else {
            this.windowManager.refreshAllWindows();
        }
    }
}

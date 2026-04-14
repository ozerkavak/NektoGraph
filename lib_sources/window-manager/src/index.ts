import style from './style.css?inline';

if (typeof document !== 'undefined') {
    const id = 'wm-standalone-style';
    if (!document.getElementById(id)) {
        const styleEl = document.createElement('style');
        styleEl.id = id;
        styleEl.textContent = style;
        document.head.appendChild(styleEl);
    }
}

export * from './WindowManager';
export * from './WorkbenchWindow';
export * from './Interactable';
export * from './dom';

import { WindowManager } from './WindowManager';
import { WorkbenchWindow } from './WorkbenchWindow';
import { Interactable } from './Interactable';
import { DOM } from './dom';

// Expose to Window for Standalone & Shim Adapter
if (typeof window !== 'undefined') {
    (window as any).WindowManagerLib = {
        WindowManager,
        WorkbenchWindow,
        Interactable,
        DOM
    };
}

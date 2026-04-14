import { WorkbenchLayout } from './layout/WorkbenchLayout';

/**
 * ViewManager - Core utilities for landing pages and view transitions.
 */
export class ViewManager {
    public static getMain() {
        let main = document.getElementById('main-content');
        if (!main) {
            WorkbenchLayout.renderAppShell();
            main = document.getElementById('main-content')!;
        }
        return main;
    }

    public static clearView(_main: HTMLElement) {
        const dash = document.getElementById('dashboard-layer');
        const wins = document.getElementById('windows-layer');
        if (dash) dash.style.display = 'none';
        if (wins) wins.style.display = 'none';

        document.querySelectorAll('.view-container').forEach(el => el.remove());

        const main = document.getElementById('main-content');
        if (main) {
            Array.from(main.children).forEach(child => {
                if (child.id !== 'dashboard-layer' && child.id !== 'windows-layer' && !child.classList.contains('view-container')) {
                    child.remove();
                }
            });
        }
    }
}

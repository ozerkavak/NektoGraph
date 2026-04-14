import { GraphManager } from '../components/GraphManager';
import { ViewManager } from '../ViewManager';

/**
 * GraphView - Named Graph management.
 */
export class GraphView {
    public static render() {
        const main = ViewManager.getMain();
        ViewManager.clearView(main);

        const container = document.createElement('div');
        container.className = 'view-container';
        container.style.cssText = "height:100%; width:100%; overflow-y:auto;";
        main.appendChild(container);

        const manager = new GraphManager(container);
        manager.render();
    }
}

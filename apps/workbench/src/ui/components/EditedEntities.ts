import { state } from '../../runtime/State';
import { uiState } from '../../runtime/UIState';
import { KGEntity } from '../services/kg_entity';

/**
 * EditedEntities - Manages the "Edited Entities" list in the Session Dashboard.
 * Encapsulates session modification tracking and RDF-star aware rendering.
 */
export class EditedEntities {

    /**
     * Renders the list of modified entities into the provided container.
     */
    static async render(container: HTMLElement) {
        const currentSession = uiState.currentSession;
        if (!currentSession) {
            container.innerHTML = '<div class="mod-item" style="color:var(--text-muted); padding-left:12px;">No active session</div>';
            return;
        }

        const modifiedNodes = this.getModifiedNodeIds();
        if (modifiedNodes.size === 0) {
            container.innerHTML = '<div class="mod-item" style="color:var(--text-muted); padding-left:12px;">No changes yet</div>';
            return;
        }

        // Render sorted list (Entities first, then Triples)
        const sortedNodes = Array.from(modifiedNodes).sort((a, b) => {
            const termA = state.factory.decode(a);
            const termB = state.factory.decode(b);
            if (termA.termType !== termB.termType) {
                return termA.termType === 'Triple' ? 1 : -1;
            }
            return 0;
        });

        // 4. PREFETCH: Recursive metadata hydration for all modified nodes
        const allDeepIds = new Set<bigint>();
        for (const nodeId of modifiedNodes) {
             (state as any).collectDeepIds(nodeId).forEach((id: bigint) => allDeepIds.add(id));
        }
        await KGEntity.ensureMany(Array.from(allDeepIds), 'metadata');

        container.innerHTML = (await Promise.all(sortedNodes.map(nodeId => this.renderItem(nodeId)))).join('');
    }

    /**
     * Unifies Session Additions, Deletions, and Open Windows into a single set of NodeIDs.
     * Corrects the Triple ID vs Display String mismatch.
     */
    private static getModifiedNodeIds(): Set<bigint> {
        const currentSession = uiState.currentSession;
        const modifiedNodes = new Set<bigint>();
        if (!currentSession) return modifiedNodes;

        // 1. Collect from Session Additions (Match all quads in session)
        for (const raw of currentSession.additions.match(null, null, null, null)) {
            modifiedNodes.add(raw[0]); // Subject ID (BigInt)
        }

        // 2. Collect from Session Deletions
        currentSession.deletions.forEach((key: string) => {
            try {
                // Deployment: Deletion keys are formatted as S_P_O_G
                const parts = key.split('_');
                if (parts[0]) modifiedNodes.add(BigInt(parts[0]));
            } catch (e) {
                /* Ignore invalid keys */
            }
        });

        // 3. Collect from Active Windows (Sync open editors)
        const wins = (state.windowManager as any).windows;
        wins.forEach((w: any) => {
            const eid = w.state.entityId;
            if (!eid) return;

            if (eid.startsWith('triple_')) {
                // Triple View Window ID resolution
                try {
                    const tid = BigInt(eid.split('_')[1]);
                    modifiedNodes.add(tid);
                } catch (e) {}
            } else {
                // Entity Editor Window ID resolution
                try {
                    modifiedNodes.add(state.factory.namedNode(eid));
                } catch (e) {}
            }
        });

        return modifiedNodes;
    }

    /**
     * Renders a single entity/triple row.
     * Implements Premium Header logic for RDF-star structures.
     */
    private static async renderItem(nodeId: bigint): Promise<string> {
        const kg = KGEntity.get(nodeId);
        const term = state.factory.decode(nodeId);
        const isTriple = term.termType === 'Triple';
        
        let displayName = '';
        let openAction = '';

        if (isTriple) {
            // Premium Triple Title Generation
            displayName = state.getTriplePremiumLabel(nodeId);
            openAction = `window.state.openTripleEditor('${nodeId}')`;
        } else {
            // Standard Entity Display
            displayName = kg.getDisplayName();
            openAction = `window.openEntity('${kg.uri}')`;
        }

        const iconStyle = 'font-size: 10px; opacity: 0.8; margin-right: 8px;';
        
        // Use data-id=URI for Entities to trigger valid HoverCards.
        // Use data-node-id for Triples to avoid the broken global HoverCard logic for BigInts.
        const hoverAttrs = isTriple 
            ? `data-node-id="${nodeId}"` 
            : `data-id="${kg.uri}" data-kind="entity"`;

        return `
            <div class="mod-item" onclick="${openAction}" ${hoverAttrs} title="${isTriple ? 'Edit Triple Annotations' : 'Edit Entity'}">
                <span class="tree-icon" style="${iconStyle}">${isTriple ? '📋' : '✏️'}</span>
                <span class="mod-label">${displayName}</span>
            </div>
        `;
    }
}

import { RichEntityStructured } from '@triplestore/edit-engine';
import { ThreeDGraphData, Node3DData } from '@triplestore/3dview';
import { KGEntity } from './kg_entity';
import { state } from '../../runtime/State';

export class Entity3DAdapter {
    static adapt(entity: RichEntityStructured, showEmpty: boolean = false, showOrphans: boolean = false, showInheritance: boolean = true): ThreeDGraphData {
        const nodes: Node3DData[] = [];
        const focusId = typeof entity.id === 'bigint' ? entity.id.toString() : (entity.id as any).id;

        // Metadata for deduplication
        const nodeMap = new Map<string, Node3DData>();

        // Helper: Add or Get Node
        const getOrCreateNode = (data: Node3DData): Node3DData => {
            if (nodeMap.has(data.id)) {
                const existing = nodeMap.get(data.id)!;
                // Merge labels/colors if higher priority (e.g. focus > class > value)
                if (data.type === 'focus' || (data.type === 'class' && existing.type !== 'focus')) {
                    existing.label = data.label;
                    existing.color = data.color;
                    existing.shape = data.shape;
                }
                return existing;
            }
            nodeMap.set(data.id, data);
            nodes.push(data);
            return data;
        };

        // Helper: Add Edge
        const addEdge = (sourceId: string, targetId: string, label: string, style: 'solid' | 'dashed' = 'solid') => {
            const sNode = nodeMap.get(sourceId);
            if (sNode) {
                // Deduplicate edges
                const exists = sNode.neighbors.some(n => n.targetId === targetId && n.label === label);
                if (!exists) {
                    sNode.neighbors.push({ targetId, label, direction: 'out', style });
                }
            }
        };

        // Waterfall Layout Constants
        const FOCUS_BOTTOM = -1.5;
        const NODE_HEIGHT = 0.8; 

        // --- 1. Focus Node (Core) ---
        getOrCreateNode({
            id: focusId,
            label: entity.label || focusId,
            type: 'focus',
            shape: 'inverted_pyramid',
            neighbors: [],
            color: '#ffffff',
            position: [0, 0, 0],
            semanticData: { uri: entity.uri, nodeId: focusId }
        });

        // Filter and Sort Classes
        // Respect the showInheritance flag from the UI
        const classes = [...entity.classGroups]
            .filter(g => showInheritance || !g.isInherited || g.isAvailable)
            .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

        const CLASS_R = 1.32; 
        const CLASS_CY = FOCUS_BOTTOM - (NODE_HEIGHT / 2); 

        classes.forEach((group, groupIdx) => {
            const angleRange = Math.PI * 0.8;
            const angle = (groupIdx / Math.max(1, classes.length - 1)) * angleRange - (angleRange / 2);
            const cx = Math.sin(angle) * CLASS_R;
            const cz = Math.cos(angle) * CLASS_R;
            const cy = CLASS_CY;

            const classId = typeof group.classID === 'bigint' ? group.classID.toString() : (group.classID as any).id;
            
            getOrCreateNode({
                id: classId,
                label: group.label || 'Class',
                type: 'class',
                shape: 'cube',
                color: '#88ccff',
                position: [cx, cy, cz],
                neighbors: [],
                semanticData: { 
                    uri: typeof group.classID === 'bigint' ? state.factory.decode(group.classID).value : (group.classID as any).value || String(group.classID),
                    nodeId: classId
                }
            });
            addEdge(focusId, classId, 'type');

            // --- Properties ---
            const allProps = [...group.dataProperties, ...group.objectProperties];
            const filteredProps = showEmpty ? allProps : allProps.filter(p => p.values.length > 0);

            if (filteredProps.length === 0) return;

            const PROP_R = 4.875; 
            const SHELL_R = CLASS_R + PROP_R;

            filteredProps.forEach((prop, propIdx) => {
                const isInverse = prop.isInverse;
                const propUriPart = typeof prop.property === 'bigint' ? state.factory.decode(prop.property).value : (prop.property as any).value || String(prop.property);
                const propId = typeof prop.property === 'bigint' ? prop.property.toString() : (prop.property as any).id;
                
                // GLOBAL PROPERTY ID: Dedupes property pyramids across classes if they were shared
                const pNodeId = `p_${propId}`; 

                const pSpread = Math.PI * 0.5;
                const pAngle = (propIdx / Math.max(1, filteredProps.length - 1)) * pSpread - (pSpread / 2);

                const px = Math.sin(angle + pAngle) * SHELL_R;
                const pz = Math.cos(angle + pAngle) * SHELL_R;
                const py = CLASS_CY - 1.2 - (propIdx * 1.5);

                const isDataProp = group.dataProperties.some(dp => dp.property === prop.property) || prop.schema?.type === 'Data';

                getOrCreateNode({
                    id: pNodeId,
                    label: prop.label || 'Property',
                    type: 'property',
                    shape: 'pyramid',
                    color: '#88ff88',
                    position: [px, py, pz],
                    neighbors: [],
                    semanticData: { uri: propUriPart, nodeId: propId }
                });
                addEdge(classId, pNodeId, isInverse ? 'inv' : 'has', isInverse ? 'dashed' : 'solid');

                const vSpread = isDataProp ? Math.PI * 0.3 : Math.PI * 1.2;
                const MIN_NODE_GAP = 2.4; 
                const adaptiveRadius = (prop.values.length > 1)
                    ? (MIN_NODE_GAP * (prop.values.length - 1)) / vSpread
                    : 0;

                const VAL_DIST = Math.max(isDataProp ? 1.5 : 4.0, adaptiveRadius);

                prop.values.forEach((val, valIdx) => {
                    const term = state.factory.decode(val.value);
                    const isRef = term.termType === 'NamedNode';
                    const isLiteral = term.termType === 'Literal';
                    
                    // GLOBAL VALUE ID: If it's a reference, use URI based unique ID.
                    const valIdStr = typeof val.value === 'bigint' ? val.value.toString() : (val.value as any).id;
                    const valNodeId = isRef ? `v_${valIdStr}` : `${pNodeId}_v_${valIdx}`;

                    let vx, vy, vz;
                    if (isDataProp) {
                        const vAngleX = (valIdx / Math.max(1, prop.values.length - 1)) * vSpread - (vSpread / 2);
                        vx = px + Math.sin(angle + pAngle + vAngleX) * VAL_DIST;
                        vz = pz + Math.cos(angle + pAngle + vAngleX) * VAL_DIST;
                        vy = py;
                    } else {
                        const vCircleAngle = (valIdx / Math.max(1, prop.values.length - 1)) * vSpread - (vSpread / 2);
                        vx = px + Math.sin(angle + pAngle + vCircleAngle) * VAL_DIST;
                        vz = pz + Math.cos(angle + pAngle + vCircleAngle) * VAL_DIST;
                        vy = py - 1.2;
                    }

                    const valLabel = isRef ? KGEntity.get(val.value).getDisplayName() : (term as any).value;
                    const isGhost = val.source === 'inference';

                    getOrCreateNode({
                        id: valNodeId,
                        label: valLabel,
                        type: 'value',
                        shape: 'cube',
                        color: val.source === 'new' ? '#ffff00' : (isGhost ? '#800080' : '#cccccc'),
                        position: [vx, vy, vz],
                        isGhost,
                        isNew: val.source === 'new',
                        isData: isDataProp,
                        neighbors: [],
                        semanticData: isLiteral ? {
                            literal: { value: term.value, dataType: term.datatype, lang: term.language }
                        } : { uri: term.value, nodeId: valIdStr }
                    });
                    addEdge(pNodeId, valNodeId, 'val', isGhost ? 'dashed' : 'solid');
                });
            });
        });

        // --- 3. Orphans ---
        if (showOrphans && entity.orphanProperties.length > 0) {
            const orphanClassId = 'special_orphans';
            const angle = Math.PI;
            const cx = Math.sin(angle) * CLASS_R;
            const cz = Math.cos(angle) * CLASS_R;
            const cy = CLASS_CY;

            getOrCreateNode({
                id: orphanClassId,
                label: 'Orphan Properties',
                type: 'class',
                shape: 'cube',
                color: '#f59e0b',
                position: [cx, cy, cz],
                neighbors: [],
                semanticData: { uri: 'http://example.org/internal/Orphans' }
            });
            addEdge(focusId, orphanClassId, 'has_orphans', 'dashed');

            const filteredOrphans = showEmpty ? entity.orphanProperties : entity.orphanProperties.filter(p => p.values.length > 0);
            const SHELL_R = CLASS_R + 3.0;

            filteredOrphans.forEach((prop, propIdx) => {
                const propId = typeof prop.property === 'bigint' ? prop.property.toString() : (prop.property as any).id;
                const pNodeId = `p_orph_${propId}`;
                const pSpread = Math.PI * 0.4;
                const pAngle = (propIdx / Math.max(1, filteredOrphans.length - 1)) * pSpread - (pSpread / 2);
                
                const px = Math.sin(angle + pAngle) * SHELL_R;
                const pz = Math.cos(angle + pAngle) * SHELL_R;
                const py = CLASS_CY - 1.2 - (propIdx * 1.5);

                getOrCreateNode({
                    id: pNodeId,
                    label: prop.label || 'Property',
                    type: 'property',
                    shape: 'pyramid',
                    color: '#fbbf24',
                    position: [px, py, pz],
                    neighbors: [],
                    semanticData: { uri: typeof prop.property === 'bigint' ? state.factory.decode(prop.property).value : (prop.property as any).value || String(prop.property) }
                });
                addEdge(orphanClassId, pNodeId, 'has');

                const VAL_DIST = 2.5;
                prop.values.forEach((val, valIdx) => {
                    const term = state.factory.decode(val.value);
                    const isRef = term.termType === 'NamedNode';
                    const valIdStr = typeof val.value === 'bigint' ? val.value.toString() : (val.value as any).id;
                    const valNodeId = isRef ? `v_${valIdStr}` : `${pNodeId}_v_${valIdx}`;

                    const vAngle = (valIdx / Math.max(1, prop.values.length - 1)) * (Math.PI / 2) - (Math.PI / 4);
                    const vx = px + Math.sin(angle + pAngle + vAngle) * VAL_DIST;
                    const vz = pz + Math.cos(angle + pAngle + vAngle) * VAL_DIST;
                    const vy = py - 0.8;

                    const valLabel = isRef ? KGEntity.get(val.value).getDisplayName() : (term as any).value;
                    const isGhost = val.source === 'inference';

                    getOrCreateNode({
                        id: valNodeId,
                        label: valLabel,
                        type: 'value',
                        shape: 'cube',
                        color: val.source === 'new' ? '#ffff00' : (isGhost ? '#800080' : '#cccccc'),
                        position: [vx, vy, vz],
                        isGhost,
                        isNew: val.source === 'new',
                        neighbors: [],
                        semanticData: term.termType === 'Literal' ? {
                            literal: { value: term.value, dataType: term.datatype, lang: term.language }
                        } : { uri: (term as any).value, nodeId: valIdStr }
                    });
                    addEdge(pNodeId, valNodeId, 'val', isGhost ? 'dashed' : 'solid');
                });
            });
        }

        return { nodes, focusNodeId: focusId };
    }
}

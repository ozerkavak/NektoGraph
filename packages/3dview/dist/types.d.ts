export interface Node3DData {
    id: string;
    label: string;
    type: 'focus' | 'class' | 'property' | 'value' | 'inverse';
    color?: string;
    shape?: 'cube' | 'prism' | 'pyramid' | 'sphere' | 'inverted_pyramid';
    position?: [number, number, number];
    neighbors: Edge3DData[];
    isGhost?: boolean;
    isNew?: boolean;
    isData?: boolean;
    semanticData?: {
        uri?: string;
        literal?: {
            value: string;
            dataType?: string;
            lang?: string;
        };
    };
}
export interface Edge3DData {
    targetId: string;
    label: string;
    direction: 'in' | 'out';
    style?: 'solid' | 'dashed';
}
export interface ThreeDGraphData {
    nodes: Node3DData[];
    focusNodeId: string;
}
export interface WebGLContainerOptions {
    container: HTMLElement;
    onNodeClick?: (nodeId: string, container: any) => void;
    onNodeContextMenu?: (nodeId: string, x: number, y: number, container: any) => void;
    onBackgroundClick?: () => void;
    onToggleEmptyProps?: (show: boolean) => void;
}

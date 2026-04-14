// AppState import removed to satisfy TS6133

export interface MenuQuadInfo {
    graph: string;
    graphID: string;
    source: string;
}

export class ChipMenu {
    public static show(options: {
        event: MouseEvent;
        subject: string;
        predicate: string;
        object: string;
        tripleID: string;
        quads: MenuQuadInfo[];
        isInference?: boolean;
    }) {
        const { event, subject, predicate, object, tripleID, quads, isInference } = options;
        const state = (window as any).state;

        event.preventDefault();
        event.stopPropagation();

        const existing = document.getElementById('chip-context-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.id = 'chip-context-menu';
        Object.assign(menu.style, {
            position: 'fixed', left: `${event.clientX}px`, top: `${event.clientY}px`,
            background: 'rgba(20, 20, 20, 0.98)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '4px', zIndex: '20000', boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            width: '200px', backdropFilter: 'blur(10px)', fontFamily: 'var(--font-main)'
        });

        const addItem = (label: string, icon: string, color: string, onClick: () => void) => {
            const item = document.createElement('div');
            item.innerHTML = `<span style="width:18px; display:inline-block; opacity:0.8;">${icon}</span> ${label}`;
            Object.assign(item.style, {
                padding: '8px 12px', fontSize: '12px', color: color, cursor: 'pointer',
                borderRadius: '4px', display: 'flex', alignItems: 'center'
            });
            item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.05)';
            item.onmouseout = () => item.style.background = 'transparent';
            item.onclick = (ev) => { ev.stopPropagation(); onClick(); menu.remove(); };
            menu.appendChild(item);
        };

        // Close Button (X)
        const closeBtn = document.createElement('div');
        closeBtn.innerHTML = '✕';
        Object.assign(closeBtn.style, {
            position: 'absolute', right: '8px', top: '8px', cursor: 'pointer',
            fontSize: '10px', color: 'var(--text-muted)', opacity: '0.6',
            width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
        });
        closeBtn.onclick = (e) => { e.stopPropagation(); menu.remove(); };
        menu.appendChild(closeBtn);

        // Layout spacer for close button
        const spacer = document.createElement('div');
        spacer.style.height = '14px';
        menu.appendChild(spacer);

        if (isInference) {
            addItem('Materialize Triple', '✨', '#8b5cf6', () => {
                const headQuad = quads[0];
                (window as any).materializeTriple(subject, predicate, object, headQuad?.graphID || headQuad?.graph);
            });
        } else {
            addItem('Delete Triple', '🗑️', 'var(--accent-red)', () => {
                const headQuad = quads[0];
                (window as any).removeTriple(null, subject, predicate, object, headQuad?.graphID || headQuad?.graph || '');
            });
        }

        const dupeCount = quads.length - 1;
        addItem(dupeCount > 0 ? `View Triple (+${dupeCount})` : 'View Triple', '👁️', 'var(--accent-primary)', () => {
            state.openTripleEditor(tripleID);
        });

        // Provenance list
        if (quads.length > 0) {
            const hr = document.createElement('div');
            hr.style.height = '1px'; hr.style.background = 'var(--border-subtle)'; hr.style.margin = '4px';
            menu.appendChild(hr);

            quads.forEach((q) => {
                const gid = q.graph;
                const isInf = q.source === 'inference' || gid.includes('/inference/');
                const gName = gid.split('/').pop()?.split('#').pop() || 'Default';
                
                const gItem = document.createElement('div');
                gItem.innerHTML = `<span style="font-size:8px; width:12px; opacity:0.5;">📡</span> ${gName}`;
                Object.assign(gItem.style, {
                    padding: '4px 12px 4px 30px', fontSize: '10px', fontWeight: '800',
                    color: isInf ? '#a78bfa' : '#fb923c', opacity: '0.9'
                });
                menu.appendChild(gItem);
            });
        }

        document.body.appendChild(menu);
        
        const removeMenu = (e: any) => {
            if (e.type === 'keydown' && e.key === 'Escape') {
                menu.remove();
                cleanup();
            } else if (e.type === 'mousedown' && e.target !== menu && !menu.contains(e.target as Node)) {
                menu.remove();
                cleanup();
            }
        };

        const cleanup = () => {
            document.removeEventListener('mousedown', removeMenu);
            document.removeEventListener('keydown', removeMenu);
        };

        setTimeout(() => {
            document.addEventListener('mousedown', removeMenu);
            document.addEventListener('keydown', removeMenu);
        }, 10);
    }
}

// Bind to window for global access from HTML templates
(window as any).ChipMenu = ChipMenu;

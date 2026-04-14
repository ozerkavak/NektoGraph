
type HoverTarget = {
    kind: 'entity' | 'literal';
    idOrValue: string;
    // Metadata for Literals
    dataType?: string;
    lang?: string;
};

interface HoverCardData {
    title: string;
    subtitle: string;
    contentHtml: string;
}

interface HoverCardConfig {
    entityResolver: (uri: string) => Promise<HoverCardData | null>;
}

class HoverCard {

    private static config: HoverCardConfig;
    private static hoverTimer: any;
    private static currentTarget: HoverTarget | null = null;
    private static cardEl: HTMLElement | null = null;

    // RAF State
    private static isVisible = false;
    private static targetX = 0;
    private static targetY = 0;
    private static rafId: number | null = null;
    private static initialized = false;
    private static eventsBound = false;

    static init(config: HoverCardConfig) {
        if (HoverCard.initialized && HoverCard.eventsBound) return;

        HoverCard.config = config;
        HoverCard.cardEl = document.getElementById('entity-hover-card');

        if (!HoverCard.cardEl) {
            console.warn('[HoverCard] Deferred: #entity-hover-card not found. Initialization will retry via UI life-cycle.');
            return;
        }

        HoverCard.initialized = true;
        HoverCard.eventsBound = true;

        // Enable pointer events on the card to allow interaction (selecting text, etc)
        HoverCard.cardEl.style.pointerEvents = 'auto';

        // Force-refresh core styles to ensure design-system compatibility across reloads.
        const existingStyles = document.getElementById('hover-card-styles');
        if (existingStyles) existingStyles.remove();

        const style = document.createElement('style');
        style.id = 'hover-card-styles';
        style.innerHTML = `
                #entity-hover-card {
                    position: fixed !important;
                    z-index: 10000;
                    background: #121212;
                    background: var(--bg-panel, #121212);
                    border: 1px solid var(--border-subtle, #333);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border-radius: 8px;
                    max-width: 380px;
                    pointer-events: auto;
                    display: none;
                    box-sizing: border-box;
                    padding: 0;
                    margin: 0;
                    font-family: var(--font-main, sans-serif);
                }
                #entity-hover-card .hover-header { 
                    padding: 14px; 
                    border-bottom: 1px solid var(--border-subtle); 
                    background: rgba(255,255,255,0.02);
                }
                #entity-hover-card .hover-title { 
                    font-weight: 700; 
                    font-size: 13px; 
                    color: var(--text-main); 
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                }
                #entity-hover-card .hover-subtitle { 
                    font-size: 10px; 
                    color: var(--text-muted); 
                    margin-top: 4px; 
                    letter-spacing: 0.05em;
                }
                #entity-hover-card .type-badge {
                    font-size: 9px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                #entity-hover-card .type-badge.lang {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60a5fa;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
                #entity-hover-card .type-badge.datatype {
                    background: rgba(16, 185, 129, 0.15);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                #entity-hover-card .hover-body { 
                    padding: 14px; 
                    font-size: 12px; 
                    color: var(--text-main); 
                    line-height: 1.6; 
                }
                #entity-hover-card .hover-desc { 
                    text-align: left !important; 
                    display: -webkit-box; 
                    -webkit-line-clamp: 10; 
                    -webkit-box-orient: vertical; 
                    overflow: hidden; 
                    white-space: pre-wrap; 
                    opacity: 0.9;
                }
            `;
        document.head.appendChild(style);

        // --- Event Delegation Controller ---
        document.addEventListener('mouseover', (e) => {
            const targetEl = e.target as HTMLElement;
            const hoverable = targetEl.closest('[data-id], .unified-item, .chip, .prop-key, .val-text');
            if (!hoverable) return;

            const targetData = (HoverCard as any).resolveTarget(hoverable as HTMLElement);
            if (!targetData) return;

            if (HoverCard.currentTarget?.idOrValue === targetData.idOrValue && HoverCard.currentTarget?.kind === targetData.kind && HoverCard.isVisible) return;

            clearTimeout(HoverCard.hoverTimer);
            HoverCard.hoverTimer = setTimeout(() => {
                HoverCard.showHoverCard(targetData, e.clientX, e.clientY);
            }, 400);
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-id], .unified-item, .prop-key, .val-text')) {
                clearTimeout(HoverCard.hoverTimer);
                HoverCard.hoverTimer = setTimeout(() => {
                    if (!HoverCard.cardEl?.matches(':hover')) {
                        HoverCard.hideHoverCard();
                    }
                }, 200);
            }
        });

        HoverCard.cardEl.addEventListener('mouseleave', () => {
            HoverCard.hideHoverCard();
        });
    }

    public static resolveTarget(el: HTMLElement): HoverTarget | null {
        if (el.hasAttribute('data-kind')) {
            return {
                kind: el.getAttribute('data-kind') as 'entity' | 'literal',
                idOrValue: el.getAttribute('data-value') || el.getAttribute('data-id') || '',
                dataType: el.getAttribute('data-type') || undefined,
                lang: el.getAttribute('data-lang') || undefined
            };
        }

        let id = el.getAttribute('data-id');
        if (!id && el.classList.contains('prop-key')) {
            id = el.getAttribute('title');
        }

        if (!id) return null;

        const isUri = id.startsWith('http') || id.startsWith('urn:') || id.includes('://');

        if (el.classList.contains('prop-key')) {
            return { kind: 'entity', idOrValue: id };
        }

        if (el.classList.contains('unified-item')) {
            return { kind: 'entity', idOrValue: id };
        }

        if (isUri) {
            return { kind: 'entity', idOrValue: id };
        } else {
            return { kind: 'literal', idOrValue: id };
        }
    }

    static async showHoverCard(target: HoverTarget, x: number, y: number) {
        if (!HoverCard.cardEl) return;

        HoverCard.currentTarget = target;
        HoverCard.targetX = x;
        HoverCard.targetY = y;
        HoverCard.isVisible = true;

        HoverCard.cardEl.innerHTML = `<div style="padding:12px; font-size:11px; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
            <div class="dot ok-bg" style="width:8px; height:8px; border-radius:50%;"></div>
            Searching Knowledge Graph...
        </div>`;

        HoverCard.cardEl.style.left = '-9999px';
        HoverCard.cardEl.style.top = '-9999px';
        HoverCard.cardEl.style.display = 'block';
        HoverCard.cardEl.style.pointerEvents = 'auto';

        HoverCard.startRafLoop();

        if (target.kind === 'entity') {
            try {
                if (!HoverCard.config?.entityResolver) return;

                const data = await HoverCard.config.entityResolver(target.idOrValue);

                if (HoverCard.currentTarget === target && HoverCard.isVisible && data) {
                    HoverCard.render(data);
                } else if (!data) {
                    HoverCard.cardEl.style.display = 'none';
                }
            } catch (e) {
                HoverCard.cardEl.style.display = 'none';
            }
        } else {
            HoverCard.renderLiteral(target);
        }
    }

    static hideHoverCard() {
        if (HoverCard.cardEl) {
            HoverCard.cardEl.style.display = 'none';
            HoverCard.isVisible = false;
            HoverCard.currentTarget = null;
            if (HoverCard.rafId) {
                cancelAnimationFrame(HoverCard.rafId);
                HoverCard.rafId = null;
            }
        }
    }

    private static startRafLoop() {
        if (HoverCard.rafId) cancelAnimationFrame(HoverCard.rafId);

        const loop = () => {
            if (!HoverCard.isVisible || !HoverCard.cardEl) return;

            const cardReq = HoverCard.cardEl.getBoundingClientRect();
            const winW = window.innerWidth;
            const winH = window.innerHeight;

            let left = HoverCard.targetX + 16;
            let top = HoverCard.targetY + 16;

            if (left + cardReq.width > winW) left = HoverCard.targetX - cardReq.width - 16;
            if (top + cardReq.height > winH) top = HoverCard.targetY - cardReq.height - 16;

            HoverCard.cardEl.style.left = left + 'px';
            HoverCard.cardEl.style.top = top + 'px';

            HoverCard.rafId = requestAnimationFrame(loop);
        };

        HoverCard.rafId = requestAnimationFrame(loop);
    }

    private static requestPositionUpdate() {
        HoverCard.startRafLoop();
    }

    private static escapeHtml(str: string | undefined | null): string {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    private static renderLiteral(target: HoverTarget) {
        if (!HoverCard.cardEl) return;

        let subTitle = 'LITERAL';
        let badge = '';

        if (target.lang) {
            subTitle = 'LANGUAGE STRING';
            badge = `<span class="type-badge lang">${HoverCard.escapeHtml(target.lang)}</span>`;
        } else if (target.dataType) {
            let typeName = target.dataType;
            if (typeName.startsWith('http://www.w3.org/2001/XMLSchema#')) {
                typeName = 'xsd:' + typeName.split('#')[1];
            } else {
                typeName = typeName.split('#')[1] || typeName.split('/').pop() || typeName;
            }
            subTitle = 'TYPED LITERAL';
            badge = `<span class="type-badge datatype">${HoverCard.escapeHtml(typeName)}</span>`;
        }

        const safeValue = HoverCard.escapeHtml(target.idOrValue);

        const html = `
            <div class="hover-header">
                <div class="hover-title">
                    <span style="font-family:var(--font-mono); font-size:11px; word-break:break-all; flex:1;">${safeValue}</span>
                    ${badge}
                </div>
                <div class="hover-subtitle">${subTitle}</div>
            </div>
            <div class="hover-body">
                <div class="hover-desc" style="font-family:var(--font-mono);">${safeValue}</div>
            </div>
        `;

        HoverCard.cardEl.innerHTML = html;
        HoverCard.requestPositionUpdate();
    }

    private static render(data: HoverCardData) {
        if (!HoverCard.cardEl) return;

        const html = `
            <div class="hover-header">
                <div class="hover-title">${data.title}</div>
                <div class="hover-subtitle">${data.subtitle}</div>
            </div>
            <div class="hover-body">
                ${data.contentHtml}
            </div>
        `;

        HoverCard.cardEl.innerHTML = html;
        HoverCard.requestPositionUpdate();
    }
}

export { HoverCard };
export default HoverCard;

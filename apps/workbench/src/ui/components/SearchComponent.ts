import { state } from '../../runtime/State';
import { KGEntity } from '../services/kg_entity';

export interface SearchOptions {
    onSelect: (id: string, label: string) => void;
    preferredClassURI?: string;
    excludedIds?: string[];
    createAction?: {
        label: string;
        onClick: () => void;
    };
    debounceMs?: number;
    strictTypes?: boolean;
    suppressDescription?: boolean;
}

/**
 * SearchComponent - Entity Lookup Service
 * Reusable UI component for entity lookup. 
 * Attaches high-performance, asynchronous entity search and suggestion behavior to any text input.
 * 
 * @category UI Components
 */
export class SearchComponent {
    private input: HTMLInputElement;
    private dropdown: HTMLElement;
    private options: SearchOptions;
    private debounceTimer: any;
    private activeResults: any[] = [];
    private boundCloseHandler: (e: MouseEvent) => void;
    private boundInputHandler: () => void;
    private boundFocusHandler: () => void;
    private isExternalDropdown: boolean = false;
    private lastQuery: string = '';
    private destroyed: boolean = false;

    constructor(input: HTMLInputElement, options: SearchOptions, existingDropdown?: HTMLElement) {
        // Enforce Singleton: Prevent multiple components on the same input
        if ((input as any)._searchComponent) {
            (input as any)._searchComponent.destroy();
        }
        (input as any)._searchComponent = this;

        this.input = input;
        this.options = options;

        if (existingDropdown) {
            this.dropdown = existingDropdown;
            this.isExternalDropdown = true;
        } else {
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'search-dropdown';
            this.dropdown.style.display = 'none';
            if (input.parentElement) {
                input.parentElement.appendChild(this.dropdown);
                const style = window.getComputedStyle(input.parentElement);
                if (style.position === 'static') input.parentElement.style.position = 'relative';
            }
        }

        // Initialize listeners
        this.dropdown.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const item = target.closest('.unified-item');
            if (item) {
                const index = parseInt(item.getAttribute('data-index') || '-1');
                if (index >= 0 && this.activeResults[index]) {
                    const r = this.activeResults[index];
                    const idVal = state.factory.decode(r.id).value;
                    const label = r.labels[0] || idVal;

                    this.options.onSelect(idVal, label);
                    this.hide();
                }
            }

            const createBtn = target.closest('.unified-footer');
            if (createBtn && this.options.createAction) {
                this.options.createAction.onClick();
                this.hide();
            }
        });

        this.boundInputHandler = () => this.onInput();
        this.boundFocusHandler = () => {
            if (this.input.value.length >= 2) {
                this.search(this.input.value);
            } else if (this.options.createAction) {
                this.render([]);
                this.dropdown.style.display = 'block';
            }
        };

        this.input.addEventListener('input', this.boundInputHandler);
        this.input.addEventListener('focus', this.boundFocusHandler);

        this.boundCloseHandler = (e: MouseEvent) => {
            if (!this.input.contains(e.target as Node) && !this.dropdown.contains(e.target as Node)) {
                this.hide();
            }
        };
        document.addEventListener('click', this.boundCloseHandler);
    }

    public destroy() {
        document.removeEventListener('click', this.boundCloseHandler);
        
        if (!this.isExternalDropdown && this.dropdown && this.dropdown.parentElement) {
            this.dropdown.remove();
        }

        if (this.input) {
            this.input.removeEventListener('input', this.boundInputHandler);
            this.input.removeEventListener('focus', this.boundFocusHandler);
        }

        if ((this.input as any)._searchComponent === this) {
            (this.input as any)._searchComponent = null;
        }

        this.destroyed = true;
        clearTimeout(this.debounceTimer);
    }

    private onInput() {
        if (this.destroyed) return;
        if (!document.body.contains(this.input)) {
            this.destroy();
            return;
        }

        const query = this.input.value;
        if (query === this.lastQuery) return;
        this.lastQuery = query;

        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            if (query.length < 2) {
                if (this.options.createAction) {
                    this.render([]);
                    this.dropdown.style.display = 'block';
                } else {
                    this.hide();
                }
                return;
            }
            this.search(query);
        }, this.options.debounceMs || 200);
    }

    private async search(query: string) {
        let preferredClass: any = undefined;
        if (this.options.preferredClassURI) {
            preferredClass = state.factory.namedNode(this.options.preferredClassURI);
        }

        try {
            let results = await state.search.search(state.store, query, {
                language: state.language,
                preferredClass,
                session: state.currentSession || undefined,
                strictTypes: this.options.strictTypes,
                suppressDescription: this.options.suppressDescription
            });

            if (this.options.excludedIds && this.options.excludedIds.length > 0) {
                const exSet = new Set(this.options.excludedIds);
                results = results.filter(r => {
                    const uri = state.factory.decode(r.id).value;
                    return !exSet.has(uri);
                });
            }

            await KGEntity.ensureMany(results.map(r => r.id), 'metadata');

            this.activeResults = results;
            this.render(results);

            this.dropdown.style.display = (results.length > 0 || !!this.options.createAction) ? 'block' : 'none';
        } catch (e) {
            // Search error
        }
    }

    private hide() {
        this.dropdown.style.display = 'none';
    }

    private render(results: any[]) {
        if (results.length === 0 && !this.options.createAction) {
            this.dropdown.innerHTML = `<div style="padding:12px; color:var(--text-muted); font-size:12px; text-align:center;">No results found.</div>`;
            return;
        }

        let hasSeparator = false;
        const items = results.map((r, index) => {
            const kg = KGEntity.get(r.id);
            const label = kg.getDisplayName();
            const uniqueId = kg.uri.includes('#') ? kg.uri.split('#').pop() : kg.uri.split('/').pop();
            const isClassMatch = r.isClassMatch === true;

            let prefix = '';
            if (!isClassMatch && !hasSeparator && index > 0 && results[0].isClassMatch) {
                hasSeparator = true;
                prefix = `<div class="search-separator" style="border-bottom:1px solid var(--border-subtle); margin:4px 0; padding:4px 12px; font-size:10px; color:var(--text-muted); letter-spacing:0.05em;">Entities without matching class</div>`;
            }

            return `
                ${prefix}
                <div class="unified-item" data-index="${index}" data-id="${kg.uri}">
                    <div class="item-main">
                        <div class="item-label">
                            ${label}
                            <span style="font-weight:400; color:var(--text-muted); opacity:0.8; margin-left:6px; font-size:0.9em;">(${uniqueId})</span>
                        </div>
                    </div>
                    ${isClassMatch ? '<span class="chip src-ont" style="font-size:9px;">Match</span>' : ''}
                </div>
            `;
        });

        let html = '';
        if (this.options.createAction) {
            html += `
                <div class="unified-footer" style="padding:10px 12px; cursor:pointer; background:rgba(255,255,255,0.08); border-bottom:1px solid var(--border-subtle); transition: background 0.2s;">
                    <span style="font-size:14px; font-weight:bold; margin-right:8px; color:var(--accent-primary);">+</span>
                    <span style="font-weight:600; font-size:12px; color:var(--accent-primary);">${this.options.createAction.label}</span>
                </div>
            `;
        }
        html += items.join('');

        this.dropdown.innerHTML = html;
    }
}

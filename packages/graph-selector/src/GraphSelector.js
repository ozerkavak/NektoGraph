import './GraphSelector.css';
/**
 * GraphSelector: A premium, isolated UI component for graph selection.
 * Features a high-density triple-row layout with metadata badges and clipboard integration.
 */
export class GraphSelector {
    static USER_GRAPH_URI = 'http://example.org/graphs/user';
    static async request(params) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'gs-overlay';
            const dialog = document.createElement('div');
            dialog.className = 'gs-dialog';
            // 1. Header
            if (params.title) {
                const header = document.createElement('h3');
                header.className = 'gs-header';
                header.innerText = params.title;
                dialog.appendChild(header);
            }
            // 2. Description
            if (params.description) {
                const desc = document.createElement('p');
                desc.className = 'gs-description';
                desc.innerText = params.description;
                dialog.appendChild(desc);
            }
            // --- Categorization Logic ---
            const options = [...params.options];
            // Group 1: Recommended/Data (Priority 1: isDefault subject, Priority 2: local/remote)
            const recommended = options.filter(o => o.isDefault || (o.type === 'data' && (o.sourceType === 'local' || o.sourceType === 'remote')) || (o.type === 'ontology' && o.isDefault)).filter(o => (o.uri !== this.USER_GRAPH_URI && o.label !== 'user') || o.isDefault);
            recommended.sort((a, b) => {
                if (a.isDefault && !b.isDefault)
                    return -1;
                if (!a.isDefault && b.isDefault)
                    return 1;
                return a.label.localeCompare(b.label);
            });
            // Group 2: System User graph (Priority 3)
            const userGraphEntry = options.find(o => (o.uri === this.USER_GRAPH_URI || o.label === 'user') &&
                !recommended.find(r => r.uri === o.uri));
            // Group 3: Others (Ontology, system, etc)
            const others = options.filter(o => !recommended.find(r => r.uri === o.uri) &&
                (!userGraphEntry || userGraphEntry.uri !== o.uri));
            others.sort((a, b) => a.label.localeCompare(b.label));
            // 3. Option List
            const list = document.createElement('div');
            list.className = 'gs-list';
            // Determination of Pre-Selected Value (Input Box):
            // 1. Explicitly marked isDefault graph
            // 2. First Recommended/Data graph
            // 3. System user graph
            // 4. Fallback (first available)
            let selectedUri = params.options.find(o => o.isDefault)?.uri ||
                (recommended.length > 0 ? recommended[0].uri :
                    (userGraphEntry ? userGraphEntry.uri :
                        (params.options.length > 0 ? params.options[0].uri : '')));
            const renderOption = (opt, container) => {
                const btn = document.createElement('div');
                btn.className = `gs-option-container ${opt.isDefault ? 'is-default' : ''} ${selectedUri === opt.uri ? 'gs-selected' : ''}`;
                const typeColor = opt.type === 'ontology' ? '#3b82f6' : opt.type === 'data' ? '#22c55e' : '#a1a1aa';
                const sourceColor = opt.sourceType === 'system' ? '#f59e0b' : '#6b7280';
                btn.innerHTML = `
                    <div class="gs-opt-row gs-opt-main-row">
                        <div class="gs-opt-identity">
                            <span class="gs-opt-circle" style="background:${typeColor};"></span>
                            <span class="gs-opt-label">${opt.label}</span>
                            <div class="gs-badge-group">
                                <span class="gs-badge" style="background:${typeColor}20; border-color:${typeColor}40; color:${typeColor}">${opt.type}</span>
                                <span class="gs-badge" style="background:${sourceColor}20; border-color:${sourceColor}40; color:${sourceColor}">${opt.sourceType}</span>
                            </div>
                        </div>
                        <div class="gs-opt-metrics">
                            <span class="gs-count-main">${opt.mainCount ?? 0}</span>
                            ${opt.draftCount ? `<span class="gs-count-draft">+${opt.draftCount}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="gs-opt-row gs-opt-meta-row">
                        <span class="gs-meta-label">Full Name:</span>
                        <span class="gs-meta-val gs-meta-uri" title="Click to copy">${opt.fullUri}</span>
                        <button class="gs-copy-btn" title="Copy URI">📋</button>
                    </div>

                    <div class="gs-opt-row gs-opt-meta-row">
                        <span class="gs-meta-label">Source location/URL:</span>
                        <span class="gs-meta-val">${opt.location}</span>
                    </div>

                    ${opt.isDefault ? `<div class="gs-default-marker">${opt.defaultLabel || 'DEFAULT CHOICE'}</div>` : ''}
                `;
                btn.onclick = (e) => {
                    const target = e.target;
                    if (target.closest('.gs-copy-btn')) {
                        e.stopPropagation();
                        navigator.clipboard.writeText(opt.fullUri);
                        const copyBtn = target.closest('.gs-copy-btn');
                        copyBtn.innerText = '✅';
                        setTimeout(() => copyBtn.innerText = '📋', 1000);
                        return;
                    }
                    selectedUri = opt.uri;
                    newGraphInput.value = selectedUri;
                    list.querySelectorAll('.gs-option-container').forEach(el => el.classList.remove('gs-selected'));
                    btn.classList.add('gs-selected');
                };
                container.appendChild(btn);
            };
            // Render Sections
            if (recommended.length > 0) {
                const header = document.createElement('div');
                header.className = 'gs-section-header';
                header.innerText = 'Recommended Graphs';
                list.appendChild(header);
                recommended.forEach(o => renderOption(o, list));
            }
            if (userGraphEntry) {
                const header = document.createElement('div');
                header.className = 'gs-section-header';
                header.innerText = 'System data graph';
                list.appendChild(header);
                renderOption(userGraphEntry, list);
            }
            if (others.length > 0) {
                const toggle = document.createElement('div');
                toggle.className = 'gs-toggle-others';
                toggle.innerText = `Show other graphs (${others.length})`;
                list.appendChild(toggle);
                const othersList = document.createElement('div');
                othersList.className = 'gs-others-list';
                others.forEach(o => renderOption(o, othersList));
                list.appendChild(othersList);
                toggle.onclick = () => {
                    const isShown = othersList.classList.toggle('show');
                    toggle.innerText = isShown ? 'Hide other graphs' : `Show other graphs (${others.length})`;
                };
            }
            dialog.appendChild(list);
            // 3.5 New Graph / Manual Entry Section
            const newGraphSection = document.createElement('div');
            newGraphSection.className = 'gs-input-section';
            newGraphSection.innerHTML = `
                <div class="gs-input-header">
                    <span class="gs-input-title">Target Graph URI</span>
                    <span class="gs-input-hint">Edit graph name to create a new graph</span>
                </div>
                <input type="text" class="gs-main-input" placeholder="http://example.org/new-graph">
            `;
            const newGraphInput = newGraphSection.querySelector('.gs-main-input');
            newGraphInput.value = selectedUri;
            dialog.appendChild(newGraphSection);
            // 4. Footer Buttons
            const footer = document.createElement('div');
            footer.className = 'gs-footer';
            const onUse = () => {
                cleanup();
                resolve(newGraphInput.value);
            };
            const btnUse = document.createElement('button');
            btnUse.className = 'gs-btn gs-btn-primary';
            btnUse.innerText = 'Use Selected Graph';
            btnUse.onclick = onUse;
            const btnCreate = document.createElement('button');
            btnCreate.className = 'gs-btn gs-btn-secondary';
            btnCreate.innerText = 'Create New Graph';
            btnCreate.onclick = () => { cleanup(); resolve(newGraphInput.value); };
            const btnClose = document.createElement('button');
            btnClose.className = 'gs-btn gs-btn-cancel';
            btnClose.innerText = 'Close';
            btnClose.onclick = () => { cleanup(); resolve(null); };
            footer.appendChild(btnUse);
            footer.appendChild(btnCreate);
            footer.appendChild(btnClose);
            dialog.appendChild(footer);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            // Auto-focus the input to ensure Enter key works immediately
            setTimeout(() => newGraphInput.focus(), 10);
            const cleanup = () => {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', onKeyDown);
            };
            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    cleanup();
                    resolve(null);
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onUse();
                }
            };
            document.addEventListener('keydown', onKeyDown);
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(null);
                }
            };
        });
    }
}

import { state } from '../../runtime/State';

/**
 * GraphMergeDialog - Data Migration UI
 * A specialized modal for migrating quads between graphs with safety checks.
 * 
 * > [!IMPORTANT]
 * > **BigInt Usage:** The `sourceId` parameter is a `BigInt`. Ensure conversion if passed from external JSON sources.
 * 
 * @category UI Components
 */
export class GraphMergeDialog {
    public static render(sourceId: bigint, sourceUri: string, onComplete: () => void): void {
        const stats = state.getGraphStats();
        // Filter out system graphs and the source graph itself
        const targets = stats.filter(s => {
            const isSystem = s.type === 'default' || s.type === 'diff' || s.type === 'inference';
            return !isSystem && s.id !== sourceId;
        });

        const dialog = document.createElement('div');
        dialog.className = 'merge-dialog-overlay';
        Object.assign(dialog.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '10000'
        });

        dialog.innerHTML = `
            <div class="dialog-card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; padding:24px; max-width:500px; width:90%; position:relative;">
                <h3 style="margin-top:0; color:var(--accent-orange);">Move to target graph</h3>

                <p style="font-size:13px; color:var(--accent-red); background:rgba(255,50,50,0.1); padding:12px; border-radius:6px; line-height:1.5;">
                    ⚠️ All active sessions and open inference modules must be closed. Proceeding with the merge will close them, which may cause data loss.
                </p>

                <p style="font-size:14px; margin-top:16px;">
                    Move content of <strong>${sourceUri}</strong> to the selected target named graph:
                </p>

                <div style="margin-top:20px;">
                    <label style="display:block; font-size:12px; opacity:0.6; margin-bottom:8px;">Select Target Graph</label>
                    <select id="merge-target-select" style="width:100%; padding:10px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:6px; color:white; font-size:13px;">
                        <option value="" disabled selected style="color: grey;">--Select Existing Graph--</option>
                        <option value="NEW">--Create New Graph--</option>
                        ${targets.map(t => `<option value="${t.id}">${t.uri} (${t.mainCount || 0} quads)</option>`).join('')}
                    </select>
                </div>

                <div id="new-graph-input-container" style="margin-top:20px; display:none;">
                    <label style="display:block; font-size:12px; opacity:0.6; margin-bottom:8px;">New Graph URI</label>
                    <input type="text" id="new-graph-uri" placeholder="http://example.org/new-graph" style="width:100%; padding:10px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:6px; color:white; font-size:13px; box-sizing:border-box;">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:32px;">
                    <button id="cancel-merge" class="btn-cancel" style="padding:10px 20px; border:none; border-radius:6px; background:transparent; color:white; cursor:pointer; font-size:13px;">Cancel</button>
                    <button id="proceed-merge" class="btn-primary" style="padding:10px 24px; border:none; border-radius:6px; background:var(--accent-orange); color:white; cursor:pointer; font-weight:600; font-size:13px;">Proceed</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const cancelBtn = dialog.querySelector('#cancel-merge');
        const proceedBtn = dialog.querySelector('#proceed-merge');
        const select = dialog.querySelector('#merge-target-select') as HTMLSelectElement;
        const newGraphContainer = dialog.querySelector('#new-graph-input-container') as HTMLElement;
        const newGraphInput = dialog.querySelector('#new-graph-uri') as HTMLInputElement;

        select.addEventListener('change', () => {
            if (select.value === 'NEW') {
                newGraphContainer.style.display = 'block';
                newGraphInput.focus();
            } else {
                newGraphContainer.style.display = 'none';
            }
        });

        cancelBtn?.addEventListener('click', () => dialog.remove());

        proceedBtn?.addEventListener('click', () => {
            const targetValue = select.value;

            if (targetValue === 'NEW') {
                const newUri = newGraphInput.value.trim();
                if (!newUri) {
                    alert('Please enter a new graph URI.');
                    return;
                }
                state.moveGraph(sourceId, newUri);
            } else if (targetValue) {
                const targetId = BigInt(targetValue);
                state.moveGraph(sourceId, targetId);
            } else {
                alert('Please select or enter a target graph.');
                return;
            }

            dialog.remove();
            onComplete();
        });

        // Close on overlay click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });
    }
}

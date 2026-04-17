
import { state } from '../../runtime/State';
import { NodeID } from '@triplestore/core';
import { StructuredProperty } from '@triplestore/edit-engine';
import { SearchComponent } from './SearchComponent';
import { KGEntity } from '../services/kg_entity';

export class EntityRenderer {

    static async renderEntityInWindow(id: NodeID, container: HTMLElement, winId: string) {
        try {
            if (!state) throw new Error("State object is undefined.");

            KGEntity.get(id).invalidate();
            const kg = await KGEntity.loadForDisplay(id);
            
            // Sync Window Title if it changed (Metadata updated)
            const win = state.windowManager.getWindow(winId);
            if (win) {
                const label = kg.getDisplayName();
                if (label && label !== win.state.title && !win.state.title.includes(label)) {
                    win.setTitle(label);
                }
            }
            const entity = kg.structured;

            if (!entity) {
                container.innerHTML = `<div style="padding:20px; color:var(--text-muted); font-size:11px;">Loading...</div>`;
                return;
            }

            // Auto-detect target graph from existing data if not set
            if (win && !win.state.metadata?.targetGraph) {
                const allResolvedQuads = [...entity.allLabels, ...entity.allTypes, ...entity.allComments];
                const primaryGraph = allResolvedQuads.find(q => q.source === 'data' || q.source === 'ontology')?.quad.graph;
                if (primaryGraph) {
                    const gUri = state.factory.decode(primaryGraph).value;
                    if (!win.state.metadata) win.state.metadata = {};
                    win.state.metadata.targetGraph = gUri;
                }
            }

            // Prefetch essential metadata
            const idsToLoad: NodeID[] = [];
            entity.classGroups.forEach((g: any) => {
                idsToLoad.push(g.classID);
                [...g.dataProperties, ...g.objectProperties].forEach((p: any) => idsToLoad.push(p.property));
            });
            entity.incomings.forEach((p: any) => idsToLoad.push(p.property));
            entity.mentions.forEach((m: any) => {
                idsToLoad.push(m.subject, m.predicate, m.object);
                m.annotations.forEach((a: any) => idsToLoad.push(a.property));
            });

            if (idsToLoad.length > 0) await KGEntity.ensureMany(idsToLoad, 'metadata');

            const renderedProps = new Set<string>();
            const renderUnique = (p: StructuredProperty, isObj?: boolean) => {
                const pid = state.factory.decode(p.property).value;
                if (renderedProps.has(pid)) return '';
                renderedProps.add(pid);
                return EntityRenderer.renderRow(p, id, winId, entity.mentions, isObj);
            };

            const sidebarHtml = `
                <div class="sidebar" style="width:220px; background:rgba(0,0,0,0.2); border-right:1px solid var(--border-subtle); display:flex; flex-direction:column; overflow:hidden;">
                    <div class="sidebar-header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-bottom:1px solid var(--border-subtle);">
                        <span style="font-weight:700; color:var(--text-muted); font-size:10px; letter-spacing:0.05em;">Classes</span>
                        <button style="background:none; border:none; color:var(--accent-primary); font-size:11px; cursor:pointer;" onclick="const el = document.getElementById('class_add_box_${winId}'); el.style.display = el.style.display === 'block' ? 'none' : 'block'; if(el.style.display==='block') document.getElementById('new_class_input_${winId}').focus();" title="Add Class">+Class</button>
                    </div>
                    <div id="class_add_box_${winId}" style="display:none; padding:8px 15px; background:rgba(0,0,0,0.1); border-bottom:1px solid var(--border-subtle);">
                        <div style="position:relative;">
                            <input type="text" id="new_class_input_${winId}" class="class-lookup-input form-input" 
                                style="width:100%; height:24px; font-size:11px; padding:2px 6px; border:1px solid var(--border-subtle); background:rgba(0,0,0,0.2);"
                                placeholder="Search Classes..." autocomplete="off"
                            />
                            <div id="res_class_input_${winId}" class="unified-dropdown" style="display:none; position:absolute; top:28px; left:0; width:100%; z-index:100;"></div>
                        </div>
                        <button id="btn_save_class_${winId}" class="btn-primary" style="width:100%; margin-top:4px; height:20px; font-size:10px; display:none;" onclick="const inp = document.getElementById('new_class_input_${winId}'); window.addEntityClass('${winId}', '${kg.uri}', inp.value)">Save</button>
                    </div>
                    <div class="sidebar-content" style="flex:1; overflow-y:auto; padding:8px 0;">
                        ${entity.classGroups.map((group: any) => `
                            <details open style="margin-bottom:2px;">
                                <summary class="tree-node" style="padding:4px 15px; cursor:pointer; list-style:none; display:flex; align-items:center; gap:6px;">
                                    <span class="tree-icon" style="opacity:0.6; font-size:10px;">${group.isMissing ? '⚠️' : '📂'}</span>
                                    <span style="font-size:11px; font-weight:600; color:${group.isMissing ? 'var(--accent-red)' : 'var(--accent-primary)'};">${KGEntity.get(group.classID).getDisplayName()}</span>
                                </summary>
                                <div class="tree-children" style="padding-left:15px;">
                                    ${[...group.dataProperties, ...group.objectProperties].map((p: any) => `
                                        <div class="tree-item" style="padding:3px 0 3px 28px; font-size:10px; opacity:0.8; cursor:pointer; text-align:left;" onclick="document.getElementById('row_${winId}_${state.factory.decode(p.property).value}')?.scrollIntoView({behavior:'smooth', block:'center'})">
                                            • ${KGEntity.get(p.property).getDisplayName()}
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        `).join('')}
                    </div>
                </div>`;

            const mainContentHtml = `
                <div class="main-content" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.1);">
                    <div class="entity-canvas" style="padding:12px 16px;">
                        <div class="section-container">
                            <h3 style="font-size:10px; color:var(--text-muted); margin-bottom:12px; border-bottom:1px solid var(--border-subtle); padding:6px 14px; letter-spacing:0.1em; background:rgba(255,255,255,0.03); text-align:left; font-weight:700;">DIRECT PROPERTIES</h3>
                            ${entity.classGroups.map((g: any, idx: number) => {
                                const totalProps = g.dataProperties.length + g.objectProperties.length;
                                return `
                                <div id="sec_${winId}_${idx}" class="group-section" style="margin-bottom:${totalProps === 0 ? '0' : '16px'};">
                                    <div class="group-header" style="font-size:12px; font-weight:700; color:var(--accent-primary); margin:0; padding:8px 14px; background:rgba(59, 130, 246, 0.08); display:flex; align-items:center; gap:8px;">
                                        ${KGEntity.get(g.classID).getDisplayName()}
                                        <span style="font-weight:400; font-size:10px; opacity:0.5;">(${totalProps} items)</span>
                                    </div>
                                    <div style="padding:0 12px; border-bottom:1px solid transparent;">
                                        ${g.dataProperties.map((p: any) => renderUnique(p, false)).join('')}
                                        ${g.objectProperties.map((p: any) => renderUnique(p, true)).join('')}
                                    </div>
                                </div>
                                `;
                            }).join('')}
                            ${entity.orphanProperties.length > 0 ? `
                                <div id="sec_orphans_${winId}" class="group-section" style="margin-top:16px;">
                                    <div class="group-header" style="font-size:12px; font-weight:700; color:var(--accent-amber); margin:0; padding:8px 14px; background:rgba(245, 158, 11, 0.1); display:flex; align-items:center; gap:8px;">
                                        ORPHAN PROPERTIES
                                        <span style="font-weight:400; font-size:10px; opacity:0.5;">(${entity.orphanProperties.length} items)</span>
                                    </div>
                                    <div style="padding:0 12px;">
                                        ${entity.orphanProperties.map((p: any) => renderUnique(p)).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        ${entity.incomings.length > 0 ? `
                            <div class="section-container" style="margin-top:24px; padding-top:0;">
                                <h3 style="font-size:10px; color:var(--accent-primary); margin-bottom:12px; padding:6px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--border-subtle); letter-spacing:0.1em; text-align:left; font-weight:700;">← INCOMING CONNECTIONS</h3>
                                <div style="padding:0 12px;">
                                    ${entity.incomings.map(p => {
                                        // Clone property and filter out inferred values for Incomings section
                                        const cleanProp = { ...p, values: p.values.filter((v: any) => v.source !== 'inference') };
                                        if (cleanProp.values.length === 0) return '';
                                        return EntityRenderer.renderRow(cleanProp, id, winId, entity.mentions, true);
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}

                        ${entity.mentions.length > 0 ? `
                            <div id="mentions_${winId}" class="section-container" style="margin-top:24px; padding-top:0;">
                                <details ontoggle="if(this.open && !this.dataset.loaded) window.loadEntityReferences('${winId}', '${kg.id.toString()}')">
                                    <summary style="cursor:pointer; list-style:none; outline:none;">
                                        <h3 style="font-size:10px; color:var(--accent-amber); margin-bottom:12px; padding:6px 14px; background:rgba(255,255,255,0.03); border-bottom:1px solid var(--border-subtle); letter-spacing:0.1em; text-align:left; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                                            <span>✧ REFERENCED IN TRIPLES</span>
                                            <span style="font-weight:400; font-size:9px; opacity:0.6;">(Click to expand and load context)</span>
                                        </h3>
                                    </summary>
                                    <div id="mentions_content_${winId}" style="padding:0 12px; min-height:60px;">
                                        <div style="padding:20px; text-align:center; color:var(--text-muted); font-size:11px;">Loading references...</div>
                                    </div>
                                </details>
                            </div>
                        ` : ''}
                    </div>
                </div>`;

            container.innerHTML = `
                <div class="entity-window-v2" style="height:100%; width:100%; display:flex; flex-direction:column; background:var(--bg-app); overflow:hidden;">
                    ${EntityRenderer.renderHeader(kg, winId)}
                    <div class="window-lower-body" style="flex:1; display:flex; min-height:0; overflow:hidden;">
                        ${sidebarHtml}
                        ${mainContentHtml}
                    </div>
                </div>`;

            EntityRenderer.bindEvents(container, winId);
        } catch (e: any) {
            console.error('[Renderer] Error:', e);
            container.innerHTML = `<div style="padding:20px; color:var(--accent-red); font-size:11px;">Error: ${e.message}</div>`;
        }
    }

    static renderRow(prop: StructuredProperty, subject: NodeID, winId: string, mentions: any[], isObjectPropOverride?: boolean): string {
        const propIdVal = state.factory.decode(prop.property).value;
        const propLabel = KGEntity.get(prop.property).getDisplayName();
        const isInverse = prop.isInverse;

        const infoBtn = prop.hasMentions ? `
            <span class="mention-indicator" style="cursor:pointer; color:var(--accent-amber); opacity:0.8; font-size:11px; margin-left:4px;" 
                onclick="document.getElementById('mentions_${winId}')?.scrollIntoView({behavior:'smooth'})" 
                title="See context / annotations for these values">ⓘ</span>` : '';

        let valuesHtml = '';
        prop.values.forEach((v: any) => {
            const valToken = state.factory.decode(v.value);
            const isRef = valToken.termType === 'NamedNode';
            const isTriple = valToken.termType === 'Triple';

            const linkedKg = isRef ? KGEntity.get(v.value) : null;
            let displayVal = '';

            if (isTriple) {
                displayVal = EntityRenderer.renderTripleValue(v.value);
            } else {
                displayVal = isRef ? linkedKg!.getDisplayName() : valToken.value;
            }

            
            // Check for annotations in mentions
            const tripleID = state.factory.triple(subject, prop.property, v.value);
            const mention = mentions.find(m => m.tripleID === tripleID);
            const hasAnnotations = mention && mention.annotations && mention.annotations.length > 0;

            const clickAction = (isRef && !isTriple) ? `onclick = "window.openEntity('${valToken.value}')"` : (isTriple ? `onclick = "window.state.openTripleEditor('${v.value.toString()}')"` : '');
            
            const starIcon = hasAnnotations ? `
                <span class="triple-star" title="Annotated Triple (Click to Edit)" 
                      style="cursor:pointer; color:var(--accent-amber); font-size:12px; margin-right:4px; vertical-align:middle; filter:drop-shadow(0 0 2px rgba(245,158,11,0.4));"
                      onclick="event.stopPropagation(); window.state.openTripleEditor('${tripleID.toString()}')">✧</span>` : '';

            // Chip Styles
            let chipClass = isTriple ? 'chip-triple' : 'chip';
            if (v.source === 'new') chipClass += ' src-new';
            if (v.source === 'inference') chipClass += ' src-inf';

            // Base Attributes
            let attrs = `data-id="${v.value.toString()}" data-node-id="${v.value.toString()}"`;
            if (isTriple) attrs += ` data-kind="triple"`;
            else if (isRef) attrs += ` data-kind="entity"`;
            else {
                attrs += ` data-kind="literal"`;
                if ((valToken as any).language) attrs += ` data-lang="${(valToken as any).language}"`;
                const safeAttrVal = valToken.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
                attrs += ` data-value="${safeAttrVal}"`;
            }
            if (isInverse) {
                const tooltip = "To remove an inverse relation, you must edit the source entity.";
                valuesHtml += `
                    <span class="${chipClass}" ${attrs} title="${tooltip}">
                        <span class="tree-icon">←</span>
                        <span class="chip-label link" ${clickAction}>${displayVal}</span>
                    </span>`;
            } else if (v.source === 'inference') {
                const tripleID = (state.factory as any).triple(subject, prop.property, v.value);
                const allQuadsData = JSON.stringify(v.allQuads.map((q: any) => ({
                    graph: q.quad.graph ? (state.factory.decode(q.quad.graph) as any).value : '',
                    graphID: q.quad.graph?.toString() || '0', 
                    source: q.source
                }))).replace(/"/g, '&quot;');

                valuesHtml += `
                    <span class="${chipClass}" ${attrs} 
                          oncontextmenu="window.ChipMenu.show({event: event, subject: '${subject.toString()}', predicate: '${prop.property.toString()}', object: '${v.value.toString()}', tripleID: '${tripleID.toString()}', quads: JSON.parse('${allQuadsData}'), isInference: true})"
                          style="border:1px solid #8b5cf6; background:rgba(139, 92, 246, 0.15); border-radius:4px; cursor:default;">
                        <span class="chip-label ${isRef || isTriple ? 'link' : ''}" ${clickAction} style="color:#a78bfa;">${displayVal}</span>
                        </span>`;
            } else {
                const tripleID = (state.factory as any).triple(subject, prop.property, v.value);
                const allQuadsData = JSON.stringify(v.allQuads.map((q: any) => ({
                    graph: q.quad.graph ? (state.factory.decode(q.quad.graph) as any).value : '',
                    graphID: q.quad.graph?.toString() || '0', 
                    source: q.source
                }))).replace(/"/g, '&quot;');

                valuesHtml += `
                    <div class="chip-group" style="display:inline-flex; align-items:center; margin-right:4px; position:relative;">
                        <span class="${chipClass} clickable-chip" ${attrs} 
                              oncontextmenu="window.ChipMenu.show({event: event, subject: '${subject.toString()}', predicate: '${prop.property.toString()}', object: '${v.value.toString()}', tripleID: '${tripleID.toString()}', quads: JSON.parse('${allQuadsData}')})">
                            ${starIcon}
                            <span class="chip-label ${isRef || isTriple ? 'link' : ''}" ${clickAction}>${displayVal}</span>
                        </span>
                    </div>`;
            }
        });

        const isObjectProp = isObjectPropOverride !== undefined ? isObjectPropOverride : (prop.schema?.type === 'Object' || (prop.schema?.ranges.length || 0) > 0);
        const rangeStr = prop.schema ? prop.schema.ranges.map((r: any) => state.factory.decode(r).value).join(',') : '';
        const sUri = state.factory.decode(subject).value;
        const inputId = `input_${winId}_${propIdVal}`;
        const containerId = `add_box_${winId}_${propIdVal}`;

        const addHtml = !isInverse ? `
            <div id="${containerId}" class="prop-row-add" style="display:none; position:relative; width:100%; margin:6px 0 2px 2px;">
                 <div style="display:flex; gap:4px; align-items:center;">
                    <input type="text" id="${inputId}" class="lookup-input form-input" 
                        style="height:24px; font-size:12px; padding:2px 8px; border:1px solid var(--border-subtle); background:rgba(0,0,0,0.2); width:100%;"
                        placeholder="Add ${isObjectProp ? 'Entity' : 'Value'}..." 
                        data-subject="${sUri}" data-predicate="${propIdVal}" data-ranges="${rangeStr}" data-is-object="${isObjectProp}" autocomplete="off"
                    />
                    <button id="btn_save_prop_${winId}_${propIdVal}" class="btn-add" style="height:24px; min-width:48px; padding:0 8px; display:${isObjectProp ? 'none' : 'flex'}; align-items:center; justify-content:center; white-space:nowrap; font-size:10px; font-weight:700;" onclick="window.addEntityPropertyValue('${winId}', '${sUri}', '${propIdVal}', ${isObjectProp})">Save</button>
                 </div>
                 <div id="res_${winId}_${propIdVal}" class="unified-dropdown" style="display:none; position:absolute; top:28px; left:0; width:100%; z-index:100;"></div>
            </div>` : '';

        const addTrigger = !isInverse ? `<button class="btn-mini-add" style="margin-left:4px; background:none; border:none; color:var(--accent-primary); cursor:pointer; font-size:14px; opacity:0.6; padding:0;" title="Add Value" onclick="const el = document.getElementById('${containerId}'); el.style.display = el.style.display === 'block' ? 'none' : 'block'; if(el.style.display==='block') document.getElementById('${inputId}').focus();">+</button>` : '';

        return `
            <div class="prop-row" id="row_${winId}_${propIdVal}" style="display:flex; border-bottom:1px solid rgba(255,255,255,0.03); padding:6px 0;">
                <div class="prop-label" style="width:200px; min-width:200px; font-size:11px; color:#10b981; display:flex; align-items:center; justify-content:flex-start; padding-left:14px;">
                    <span data-id="${propIdVal}" data-node-id="${prop.property.toString()}" data-kind="entity" style="text-align:left;">${propLabel}</span>
                    ${addTrigger}
                    ${infoBtn}
                </div>
                <div class="prop-values" style="flex:1; display:flex; flex-direction:column; gap:6px; align-items:flex-start;">
                    <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-start; width:100%;">${valuesHtml}</div>
                    ${addHtml}
                </div>
            </div>`;
    }

    static renderMentionRow(mention: any, _winId: string): string {
        const tripleID = mention.tripleID;
        const tripleHTML = EntityRenderer.renderTripleValue(tripleID);
        return `
            <div class="mention-card" style="margin-bottom:16px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:6px; padding:12px;">
                <div style="text-align:left; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.03); display:flex; align-items:center; gap:12px;">
                    <span class="chip chip-triple chip-compound" data-id="${tripleID}" data-node-id="${tripleID.toString()}" data-kind="triple">${tripleHTML}</span>
                    <span class="link-view" style="font-size:10px; color:var(--accent-primary); cursor:pointer; opacity:0.7; font-weight:700; transition:opacity 0.2s;" 
                          onclick="event.stopPropagation(); window.state.openTripleEditor('${tripleID.toString()}')"
                          onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                        [VIEW CONTEXT]
                    </span>
                </div>
                <div class="annotation-grid" style="display:flex; flex-direction:column; gap:8px;">
                    ${mention.annotations.map((a: any) => `
                        <div class="prop-row" style="display:flex; align-items:flex-start; border:none; padding:4px 0;">
                            <div class="prop-label" style="width:200px; min-width:200px; font-size:11px; color:#10b981; display:flex; align-items:center; justify-content:flex-start; padding-left:4px;">
                                <span style="text-align:left; opacity:0.9;">${KGEntity.get(a.property).getDisplayName()}:</span>
                            </div>
                            <div class="prop-values" style="flex:1; display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-start;">
                                ${a.values.map((v: any) => {
                                    const t = state.factory.decode(v.value);
                                    const isRef = t.termType === 'NamedNode';
                                    const display = isRef ? KGEntity.get(v.value).getDisplayName() : t.value;
                                    return `<span class="chip" data-id="${v.value.toString()}" data-node-id="${v.value.toString()}">${display}</span>`;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    static bindEvents(container: HTMLElement, winId: string) {
        container.querySelectorAll('.lookup-input').forEach((input: Element) => {
            const el = input as HTMLInputElement;
            const resId = `res_${winId}_${el.getAttribute('data-predicate')}`;
            const resDiv = document.getElementById(resId);
            const ranges = el.getAttribute('data-ranges') || '';
            const sUri = el.getAttribute('data-subject')!;
            const pUri = el.getAttribute('data-predicate')!;
            if (!resDiv) return;
            const isObject = el.getAttribute('data-is-object') === 'true';
            if (isObject) {
                new SearchComponent(el, {
                    preferredClassURI: ranges.split(',')[0],
                    onSelect: (id) => {
                        el.value = id;
                        const btn = document.getElementById(`btn_save_prop_${winId}_${pUri}`);
                        if (btn) btn.style.display = 'flex';
                    },
                    createAction: { label: "Create New Entity", onClick: () => { (window as any).initCreateAndConnect(sUri, pUri, ranges); } }
                }, resDiv);
            }
            if (isObject) el.addEventListener('input', () => {
                const btn = document.getElementById(`btn_save_prop_${winId}_${pUri}`);
                if (btn) btn.style.display = 'none';
            });
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') (window as any).addEntityPropertyValue(winId, sUri, pUri, isObject);
            });
        });

        container.querySelectorAll('.class-lookup-input').forEach((input: Element) => {
            const el = input as HTMLInputElement;
            const resId = `res_class_input_${winId}`;
            const resDiv = document.getElementById(resId);
            if (!resDiv) return;
            new SearchComponent(el, {
                preferredClassURI: 'http://www.w3.org/2002/07/owl#Class',
                strictTypes: true,
                suppressDescription: true,
                onSelect: (id) => {
                    el.value = id;
                    const btn = document.getElementById(`btn_save_class_${winId}`);
                    if (btn) btn.style.display = 'block';
                }
            }, resDiv);
        });
    }

    public static renderTripleValue(id: NodeID): string {
        const triple = state.factory.decode(id) as any;
        if (triple.termType !== 'Triple') return '';

        const renderPart = (partId: NodeID, kind: 's' | 'p' | 'o') => {
            const unwrapped = state.entityResolver ? state.entityResolver.unwrap(partId) : partId;
            const t = state.factory.decode(unwrapped);
            
            if (t.termType === 'Triple') return EntityRenderer.renderTripleValue(unwrapped);
            
            const isRef = t.termType === 'NamedNode';
            const label = isRef ? KGEntity.get(unwrapped).getDisplayName() : t.value;
            const click = isRef ? `onclick="event.stopPropagation(); window.openEntity('${t.value}')"` : '';
            return `<span class="triple-part ${kind} ${isRef ? 'link' : ''}" ${click} data-id="${unwrapped.toString()}" data-node-id="${unwrapped.toString()}" data-kind="${isRef ? 'entity' : 'literal'}">${label}</span>`;
        };
        return `
            <span class="chip-triple" onclick="window.state.openTripleEditor('${id.toString()}')">
                ${renderPart(triple.subject, 's')}
                <span class="triple-sep"></span>
                ${renderPart(triple.predicate, 'p')}
                <span class="triple-sep"></span>
                ${renderPart(triple.object, 'o')}
                <span style="margin-left:8px; opacity:0.6; color:var(--accent-primary);">↗</span>
            </span>
        `;
    }

    static renderHeader(kg: KGEntity, winId: string): string {
        const _s = state as any;
        const entity = kg.structured;
        if (!entity) return '';
        const decodedId = kg.uri;
        const f = _s.factory;
        const decoded = f.decode(kg.id) as any;
        const isBNode = decoded.termType === 'BlankNode';
        const langOpts = ['en', 'tr', 'de', 'fr'].map(l => `<option value="${l}" ${_s.language === l ? 'selected' : ''}>${l.toUpperCase()}</option>`).join('');

        if (isBNode) {
            // ─── BNODE METADATA CARD HEADER ──────────────────────────────────
            const unwrappedId = state.entityResolver ? state.entityResolver.unwrap(kg.id) : kg.id;
            const isReification = unwrappedId !== kg.id;
            const reifiedTripleContent = isReification ? EntityRenderer.renderTripleValue(unwrappedId) : '';

            return `
                <header class="entity-header-v2 bnode-mode" style="display:grid; grid-template-columns:1.2fr 2fr; gap:12px; padding:12px 14px; background:rgba(20, 30, 60, 0.4); border-bottom:1px solid rgba(59, 130, 246, 0.4); backdrop-filter:blur(20px);">
                    <div class="header-cell uri-section">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; opacity:0.8;">
                            <span style="font-size:10px; font-weight:800; color:var(--accent-primary); text-transform:uppercase; letter-spacing:0.05em;">BNode Identifier (Internal)</span>
                        </div>
                        <div style="display:flex; align-items:center; background:rgba(0,0,0,0.4); border:1px solid rgba(59, 130, 246, 0.2); border-radius:4px; overflow:hidden; font-family:var(--font-mono); height:26px; padding:0 8px;">
                            <span style="font-size:11px; color:#93c5fd; font-weight:700; opacity:0.9;">${decoded.value}</span>
                        </div>
                        <div style="margin-top:8px; display:flex; align-items:center; gap:6px;">
                            <span style="font-size:9px; font-weight:700; color:white; background:rgba(139, 92, 246, 0.4); padding:2px 6px; border-radius:4px; border:1px solid rgba(139, 92, 246, 0.5);">META-DATA NODE</span>
                            ${isReification ? `<span style="font-size:9px; font-weight:700; color:white; background:rgba(16, 185, 129, 0.4); padding:2px 6px; border-radius:4px; border:1px solid rgba(16, 185, 129, 0.5);">TRIPLE MIRROR</span>` : ''}
                        </div>
                    </div>

                    <div class="header-cell context-section" style="padding-left:14px; border-left:1px solid rgba(59, 130, 246, 0.2); text-align:left; display:flex; flex-direction:column; justify-content:center;">
                        <div style="font-size:10px; font-weight:800; color:var(--text-muted); margin-bottom:6px; opacity:0.8; text-transform:uppercase; letter-spacing:0.05em;">Structural Context</div>
                        <div style="min-height:32px; display:flex; align-items:center;">
                            ${isReification ? `
                                <div class="bnode-mirror-container" style="background:rgba(255,255,255,0.03); padding:4px 10px; border-radius:8px; border:1px dashed rgba(59, 130, 246, 0.3); width:fit-content;">
                                    ${reifiedTripleContent}
                                </div>
                            ` : `<span style="font-size:11px; color:var(--text-muted); opacity:0.6; font-style:italic;">This blank node is an abstract grouping element.</span>`}
                        </div>
                    </div>
                </header>`;
        }

        return `
            <header class="entity-header-v2" style="display:grid; grid-template-columns:1fr 1.3fr; gap:12px; padding:12px 14px; background:var(--bg-panel); border-bottom:1px solid var(--border-subtle); backdrop-filter:blur(20px);">
                <div class="header-cell uri-section">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; opacity:0.8;">
                        <span style="font-size:11px; font-weight:700; color:var(--text-muted);">URI</span>
                        <a href="#" onclick="window.state.open3DEntity('${decodedId}')" style="font-size:10px; color:#60a5fa; text-decoration:none; display:flex; align-items:center; gap:4px; cursor:pointer;" title="Open 3D Voyager">
                            <span>View Entity in 3D</span>
                            <span style="background:rgba(96, 165, 250, 0.1); padding:2px 4px; border-radius:3px;">🏙️</span>
                        </a>
                    </div>
                    <div style="display:flex; align-items:center; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:4px; overflow:hidden; font-family:var(--font-mono); height:24px;">
                        <input type="text" value="${kg.baseUri}" onchange="window.updateEntityBaseURI('${winId}', '${decodedId}', this.value)" 
                            style="background:transparent; color:var(--text-muted); border:none; border-right:1px solid var(--border-subtle); padding:0 6px; flex:2; height:100%; font-size:11px; font-weight:600;">
                        <input type="text" value="${kg.localId}" disabled 
                            style="background:transparent; color:var(--text-main); border:none; padding:0 6px; flex:1; font-weight:700; height:100%; font-size:9px; opacity:0.8;">
                    </div>
                </div>
                <div class="header-cell types-section" style="padding-left:10px; border-left:1px solid var(--bg-card); text-align:left;">
                    <div style="font-size:9px; font-weight:700; color:var(--text-muted); margin-bottom:4px; opacity:0.8;">Classes</div>
                    <div style="display:flex; flex-wrap:wrap; gap:8px;">
                        ${entity.allTypes.map(t => {
                            // @ts-ignore
                            const tId = f.triple(BigInt(kg.id), BigInt(f.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type')), BigInt(t.value));
                            const dupeText = t.dupeCount && t.dupeCount > 0 ? ` <span style="opacity:0.6; font-size:9px;">(+${t.dupeCount})</span>` : '';
                            const qList = t.allQuads || [{quad: t.quad, source: t.source}];
                            const allQuadsData = JSON.stringify(qList.map((q: any) => ({
                                graph: q.quad.graph ? (f.decode(q.quad.graph) as any).value : '',
                                graphID: q.quad.graph.toString(),
                                source: q.source
                            }))).replace(/"/g, '&quot;');

                            return `
                                <span class="chip src-ont clickable-chip" style="height:18px; font-size:10px; background:rgba(59, 130, 246, 0.1); color:#93c5fd; position:relative; margin-top:2px;"
                                      oncontextmenu="window.ChipMenu.show({event: event, subject: '${kg.id.toString()}', predicate: '${f.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type').toString()}', object: '${t.value.toString()}', tripleID: '${(tId as any).toString()}', quads: JSON.parse('${allQuadsData}')})"
                                      data-id="${t.value.toString()}" data-node-id="${t.value.toString()}" data-kind="entity">
                                    ${KGEntity.get(t.value).getDisplayName()}${dupeText}
                                </span>`;
                        }).join('')}
                    </div>
                </div>
                <div class="header-cell labels-section" style="padding-top:2px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:9px; font-weight:700; color:var(--text-muted); opacity:0.8; text-align:left;">Labels</span>
                        <button style="background:none; border:none; color:var(--accent-primary); font-size:11px; cursor:pointer;" onclick="const el = document.getElementById('add_label_row_${winId}'); el.style.display = el.style.display === 'flex' ? 'none' : 'flex'; if(el.style.display=='flex') document.getElementById('new_label_${winId}').focus();">+</button>
                    </div>
                    <div style="max-height:60px; overflow-y:auto; text-align:left;">
                        ${entity.allLabels.map((l: any) => {
                            const count = entity.allLabels.filter((x: any) => x.lang === l.lang).length;
                            const warningMsg = count > 1 ? "This property has more than one value in same language. Use Maintenance module to see all quads, to remove unwanted one(s)" : "";
                            const warningIcon = count > 1 ? `<span style="color:#fbbf24; cursor:help; margin-right:4px;" title="${warningMsg}">⚠️</span>` : "";
                            const anyF = f as any;
                            // @ts-ignore
                            const lTripleID = anyF.triple(BigInt(kg.id), anyF.namedNode('http://www.w3.org/2000/01/rdf-schema#label'), anyF.literal(l.value, null, l.lang)).toString();
                            
                            const dupeText = l.dupeCount && l.dupeCount > 0 ? ` <span style="opacity:0.6; font-size:9px;">(+${l.dupeCount})</span>` : '';
                            const qList = l.allQuads || [{quad: l.quad, source: l.source}];
                            const allQuadsData = JSON.stringify(qList.map((q: any) => ({
                                graph: q.quad.graph ? (f.decode(q.quad.graph) as any).value : '',
                                graphID: q.quad.graph.toString(),
                                source: q.source
                            }))).replace(/"/g, '&quot;');

                            return `
                            <div class="clickable-chip-inline" style="display:flex; align-items:center; gap:8px; font-size:11px; margin-bottom:3px; justify-content:flex-start; cursor:default;"
                                 oncontextmenu="window.ChipMenu.show({event: event, subject: '${kg.id.toString()}', predicate: '${f.namedNode('http://www.w3.org/2000/01/rdf-schema#label').toString()}', object: '${l.quad.object.toString()}', tripleID: '${lTripleID}', quads: JSON.parse('${allQuadsData}')})">
                                <span style="font-size:8px; font-weight:700; color:var(--text-muted); opacity:0.7; min-width:18px;">${l.lang.toUpperCase()}</span>
                                <span style="flex:1; overflow:hidden; text-overflow:ellipsis; text-align:left;">${l.value}${dupeText}</span>
                                ${warningIcon}
                            </div>`;
                        }).join('')}
                    </div>
                    <div id="add_label_row_${winId}" style="display:none; gap:4px; margin-top:4px;">
                        <input id="new_label_${winId}" type="text" class="form-input" style="height:20px; font-size:10px; flex:1;">
                        <select id="new_label_lang_${winId}" class="form-input" style="height:20px; width:60px; font-size:9px; padding:0 2px;">${langOpts}</select>
                        <button class="btn-primary" style="height:20px; font-size:9px;" onclick="window.saveInlineLabel('${winId}', '${decodedId}')">Save</button>
                    </div>
                </div>
                <div class="header-cell desc-section" style="padding-left:10px; border-left:1px solid var(--bg-card);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:9px; font-weight:700; color:var(--text-muted); opacity:0.8; text-align:left;">Description</span>
                        <button style="background:none; border:none; color:var(--accent-primary); font-size:11px; cursor:pointer;" onclick="const el = document.getElementById('add_comment_row_${winId}'); el.style.display = el.style.display === 'flex' ? 'none' : 'flex'; if(el.style.display=='flex') document.getElementById('new_comment_${winId}').focus();">+</button>
                    </div>
                    <div style="max-height:60px; overflow-y:auto; text-align:left;">
                        ${entity.allComments.map((c: any) => {
                            const count = entity.allComments.filter((x: any) => x.lang === c.lang).length;
                            const warningMsg = count > 1 ? "This property has more than one value in same language. Use Maintenance module to see all quads, to remove unwanted one(s)" : "";
                            const warningIcon = count > 1 ? `<span style="color:#fbbf24; cursor:help; margin-right:4px;" title="${warningMsg}">⚠️</span>` : "";
                            const anyF = f as any;
                            // @ts-ignore
                            const cTripleID = anyF.triple(BigInt(kg.id), anyF.namedNode('http://www.w3.org/2000/01/rdf-schema#comment'), anyF.literal(c.value, null, c.lang)).toString();
                            
                            const dupeText = c.dupeCount && c.dupeCount > 0 ? ` <span style="opacity:0.6; font-size:9px;">(+${c.dupeCount})</span>` : '';
                            const qList = c.allQuads || [{quad: c.quad, source: c.source}];
                            const allQuadsData = JSON.stringify(qList.map((q: any) => ({
                                graph: q.quad.graph ? (f.decode(q.quad.graph) as any).value : '',
                                graphID: q.quad.graph.toString(),
                                source: q.source
                            }))).replace(/"/g, '&quot;');

                            return `
                            <div class="clickable-chip-inline" style="display:flex; align-items:flex-start; gap:8px; font-size:10px; margin-bottom:3px; justify-content:flex-start; cursor:default;"
                                 oncontextmenu="window.ChipMenu.show({event: event, subject: '${kg.id.toString()}', predicate: '${f.namedNode('http://www.w3.org/2000/01/rdf-schema#comment').toString()}', object: '${c.quad.object.toString()}', tripleID: '${cTripleID}', quads: JSON.parse('${allQuadsData}')})">
                                <span style="font-size:8px; font-weight:700; color:var(--text-muted); opacity:0.7; min-width:18px;">${c.lang.toUpperCase()}</span>
                                <span style="flex:1; opacity:0.9; text-align:left;">${c.value}${dupeText}</span>
                                ${warningIcon}
                            </div>`;
                        }).join('')}
                    </div>
                    <div id="add_comment_row_${winId}" style="display:none; flex-direction:column; gap:4px;">
                        <textarea id="new_comment_${winId}" class="form-input" style="height:36px; font-size:10px; width:100%;"></textarea>
                        <div style="display:flex; gap:4px; justify-content:flex-end;">
                            <select id="new_comment_lang_${winId}" class="form-input" style="height:18px; width:60px; font-size:9px; padding:0 2px;">${langOpts}</select>
                            <button class="btn-primary" style="height:18px; font-size:9px;" onclick="window.saveInlineComment('${winId}', '${decodedId}')">Save</button>
                        </div>
                    </div>
                </div>
            </header>`;
    }
}


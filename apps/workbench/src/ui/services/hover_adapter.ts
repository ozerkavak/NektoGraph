
import { state } from '../../runtime/State';
import { KGEntity } from './kg_entity';

export interface HoverCardData {
    title: string;
    subtitle: string;
    contentHtml: string;
}

export class HoverAdapter {

    static async resolveEntity(idOrUri: string): Promise<HoverCardData | null> {
        console.log('[HoverAdapter] Resolving:', idOrUri);
        try {
            // NODEID PRIORITY: Use BigInt IDs directly for maximum performance
            let id: bigint;
            
            // If it's a numeric string, it's already a NodeID
            if (/^\d+$/.test(idOrUri)) {
                id = BigInt(idOrUri);
            } else {
                // It's a URI, resolve it to NodeID
                const resolved = state.factory.namedNode(idOrUri);
                // The factory returns the BigInt directly, not an object with .id
                id = typeof resolved === 'bigint' ? resolved : (resolved as any).id;
            }

            if (!id) return null;

            // Fetch KGEntity (metadata only for hover)
            const kg = await KGEntity.ensure(id, 'metadata');
            if (!kg) return null;

            return this.renderEntityLogic(kg);
        } catch (e) {
            console.warn('[HoverAdapter] Failed to resolve entity:', idOrUri, e);
            return null;
        }
    }

    private static escapeHtml(str: string | undefined | null): string {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    private static renderEntityLogic(kg: KGEntity): HoverCardData | null {
        const displayName = this.escapeHtml(kg.getDisplayName());

        const types = kg.types.map(t => state.factory.decode(t).value);
        const isClass = types.some(t => t.endsWith('Class'));
        const isProp = types.some(t => t.endsWith('Property'));

        let subTitle = isClass ? 'Class' : (isProp ? 'Property' : 'Entity');
        if (types.some(t => t.includes('DatatypeProperty'))) subTitle = 'Data Property';

        // Identity resolution for XSD types when treated as first-class entities.
        if (kg.uri && kg.uri.startsWith('http://www.w3.org/2001/XMLSchema#')) {
            subTitle = 'DATATYPE';
        }

        // --- Schema Inference Engine ---
        const schema = state.schemaIndex.getPropertySchema(kg.id as bigint);
        const classSchema = state.schemaIndex.getSchemaForClass(kg.id as bigint);

        if (!isClass && !isProp && subTitle === 'Entity') {
            if (schema) subTitle = 'Property';
            if (classSchema) subTitle = 'Class';
        }

        if (!isClass && !isProp && subTitle !== 'DATATYPE' && types.length > 0) {
            const explicitTypes = types.filter(t =>
                !t.endsWith('NamedIndividual') && !t.endsWith('Thing') && !t.endsWith('Resource') && !t.endsWith('Property') && !t.endsWith('Class')
            );
            if (explicitTypes.length > 0) {
                subTitle = explicitTypes.slice(0, 2)
                    .map(t => t.split('#').pop() || t.split('/').pop() || '')
                    .join(', ');
            }
        }
        subTitle = this.escapeHtml(subTitle);

        let bodyHtml = '';

        const comment = kg.getDescription();
        if (comment) {
            bodyHtml += `<div class="hover-desc">${this.escapeHtml(comment)}</div>`;
        }

        if (schema) {
            const chars: string[] = [];
            if (schema.isFunctional) chars.push('Functional');
            if (schema.isInverseFunctional) chars.push('Inverse Functional');
            if (schema.isSymmetric) chars.push('Symmetric');
            if (schema.isTransitive) chars.push('Transitive');

            if (chars.length > 0) {
                bodyHtml += `
                    <div class="hover-section">
                        <div class="hover-sec-title">Characteristics</div>
                        <div class="hover-tags">
                            ${chars.map(c => `<span class="tag">${c}</span>`).join('')}
                        </div>
                    </div>
                `;
            }

            if (schema.ranges.length > 0) {
                bodyHtml += `
                    <div class="hover-section">
                        <div class="hover-sec-title">Range</div>
                        <div class="hover-list">
                            ${schema.ranges.map(r => `<div>${this.escapeHtml(state.factory.decode(r).value.split('#').pop())}</div>`).join('')}
                        </div>
                    </div>
                `;
            }
        }

        if (classSchema) {
            const uniq = (arr: any[]) => {
                const seen = new Set();
                return arr.filter(item => {
                    const val = state.factory.decode(item).value;
                    if (seen.has(val)) return false;
                    seen.add(val);
                    return true;
                });
            };

            const disjoints = uniq(classSchema.disjointWith);
            if (disjoints.length > 0) {
                bodyHtml += `
                    <div class="hover-section">
                        <div class="hover-sec-title">Disjoint With</div>
                        <div class="hover-list" style="display:block; line-height:1.4;">
                            ${disjoints.slice(0, 15).map(d => this.escapeHtml(state.factory.decode(d).value.split('#').pop())).join(', ')}
                            ${disjoints.length > 15 ? `<span style="opacity:0.6">, + ${disjoints.length - 15} more...</span>` : ''}
                        </div>
                    </div>
                `;
            }

            const children = uniq(classSchema.subClasses);
            if (children.length > 0) {
                bodyHtml += `
                    <div class="hover-section">
                        <div class="hover-sec-title">SubClasses</div>
                        <div class="hover-list" style="display:block; line-height:1.4;">
                            ${children.slice(0, 20).map(c => this.escapeHtml(state.factory.decode(c).value.split('#').pop())).join(', ')}
                            ${children.length > 20 ? `<span style="opacity:0.6">, + ${children.length - 20} more...</span>` : ''}
                        </div>
                    </div>
                `;
            }
        }

        // --- Data Source Attribution ---
        if (kg.sources && kg.sources.length > 0) {
            let displaySources = kg.sources;

            // Prioritize 'Ontology' source tag for clarity in mixed-graph environments.
            if (displaySources.includes('ontology')) {
                displaySources = displaySources.filter(s => s !== 'data');
            }

            if (displaySources.length > 0) {
                bodyHtml += `
                    <div class="hover-footer">
                        ${displaySources.map(s => `<span class="src-tag src-${this.escapeHtml(s)}">${this.escapeHtml(s.toUpperCase())}</span>`).join('')}
                    </div>
                `;
            }
        }

        return {
            title: displayName,
            subtitle: subTitle,
            contentHtml: bodyHtml
        };
    }
}

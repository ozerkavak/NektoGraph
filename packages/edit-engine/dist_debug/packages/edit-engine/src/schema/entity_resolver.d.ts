import { NodeID, Quad, IDataFactory, IQuadStore } from '@triplestore/core';
import { DraftStore } from '../session';
import { SchemaIndex, PropertySchema } from './schema_index';
export type PropertySource = 'ontology' | 'data' | 'inference' | 'new' | 'deleted' | 'diff';
export interface StructuredProperty {
    property: NodeID;
    values: {
        value: NodeID;
        quad: Quad;
        source: PropertySource;
    }[];
    schema?: PropertySchema;
    isInverse?: boolean;
    label?: string;
}
export interface StructuredClassGroup {
    classID: NodeID;
    isMissing: boolean;
    dataProperties: StructuredProperty[];
    objectProperties: StructuredProperty[];
    unclassifiedProperties: StructuredProperty[];
    label?: string;
    labels?: Record<string, string>;
}
export interface RichEntityStructured {
    id: NodeID;
    uri: string;
    label?: string;
    labels: Record<string, string>;
    comment?: string;
    comments: Record<string, string>;
    allLabels: {
        value: string;
        lang: string;
        quad: Quad;
        source: PropertySource;
    }[];
    allComments: {
        value: string;
        lang: string;
        quad: Quad;
        source: PropertySource;
    }[];
    types: NodeID[];
    classGroups: StructuredClassGroup[];
    orphanProperties: StructuredProperty[];
    sources: PropertySource[];
}
export interface RichEntity {
    id: NodeID;
    label?: string;
    labels: Record<string, string>;
    types: NodeID[];
    properties: Map<bigint, Quad[]>;
    comment?: string;
    comments: Record<string, string>;
}
export declare class EntityResolver {
    private _store;
    private factory;
    private schemaIndex?;
    constructor(_store: IQuadStore, factory: IDataFactory, schemaIndex?: SchemaIndex | undefined);
    getLabel(id: NodeID, lang?: 'en' | 'tr', session?: DraftStore): string | undefined;
    getComment(id: NodeID, lang?: 'en' | 'tr', session?: DraftStore): string | undefined;
    private resolveLanguageValue;
    private getBestLabel;
    private deduplicateValues;
    resolveStructured(id: NodeID, lang?: 'en' | 'tr', session?: DraftStore): RichEntityStructured;
    private determineSource;
    resolve(id: NodeID): RichEntity;
}

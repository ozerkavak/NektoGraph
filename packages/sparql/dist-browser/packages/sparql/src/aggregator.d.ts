import { AggregateExpression } from './ast';
import { IDataFactory, NodeID } from '../../../lib_sources/quadstore-core/src/index.ts';
import { RawBinding } from './engine';

export declare class Aggregator {
    private factory;
    constructor(factory: IDataFactory);
    computeAggregate(agg: AggregateExpression, bindings: RawBinding[], varMap: Map<string, number>): NodeID;
}

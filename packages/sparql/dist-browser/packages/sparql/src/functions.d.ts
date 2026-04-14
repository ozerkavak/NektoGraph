import { Term } from './ast';
import { IDataFactory } from '../../../lib_sources/quadstore-core/src/index.ts';

export declare function evaluateFunction(op: string, args: Term[], factory: IDataFactory): Term | null;

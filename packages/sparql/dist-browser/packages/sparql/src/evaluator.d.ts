import { Term, Expression } from './ast';
import { IDataFactory } from '../../../lib_sources/quadstore-core/src/index.ts';
import { RawBinding } from './engine';

export declare class ExpressionEvaluator {
    private factory;
    constructor(factory: IDataFactory);
    /**
     * Synchronous evaluation of an expression to a value (number, string, boolean).
     * Used for ORDER BY and simple comparisons.
     */
    evaluateExpressionValueSync(expr: Expression | Term, binding: RawBinding, varMap: Map<string, number>): any;
    /**
     * Evaluates an expression or term to a bound Term object.
     * Handles variable binding lookup and function calls.
     */
    evaluateBinder(expr: Expression | Term, binding: RawBinding, varMap: Map<string, number>): Term | null;
    /**
     * Asynchronous evaluation of boolean expressions (Filters).
     * Supports EXISTS/NOT EXISTS which require calling back into the engine.
     */
    evaluateAsBoolean(expr: Expression | Term, binding: RawBinding, varMap: Map<string, number>, existenceCheck?: (pattern: any, currentBinding: RawBinding) => Promise<boolean>): Promise<boolean>;
    private areValuesEqual;
    /**
     * Resolves a Term (Variable or Constant) to its bound value in the current binding.
     * Returns null if variable is unbound.
     */
    private resolveTerm;
    /**
     * Gets the primitive value (number, string, boolean) from a Term.
     * Used for comparisons.
     */
    private getTermValue;
}

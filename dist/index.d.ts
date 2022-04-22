import * as ts from 'typescript';
export declare type Mutable<T extends object> = {
    -readonly [K in keyof T]: T[K];
};
export declare const POSSIBLE_IMPORTS_TO_ADD: string[];
declare const _default: () => (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile>;
export default _default;

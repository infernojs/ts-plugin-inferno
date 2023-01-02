import {CompilerOptions, ModuleKind} from "typescript";

export function isEcmaModuleStandardDefined(options: CompilerOptions) {
    const module = options.module

    switch (module) {
        case ModuleKind.UMD:
        case ModuleKind.AMD:
        case ModuleKind.CommonJS:
        case ModuleKind.System:
            return false
        default:
            return true
    }
}

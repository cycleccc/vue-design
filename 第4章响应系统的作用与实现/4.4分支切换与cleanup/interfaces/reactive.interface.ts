export interface Options {
    immediate?: boolean;
    lazy?: boolean;
    flush?: string;
    scheduler?: (effectFn: EffectFn) => void;
    // 其他可能的字段...
}

export type EffectFn = (() => void) & { options?: Options, deps: Set<EffectFn>[] }
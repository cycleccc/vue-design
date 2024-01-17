interface Options {
    immediate?: boolean;
    lazy?: boolean;
    flush?: string;
    scheduler?: (effectFn: EffectFn) => void;
    // 其他可能的字段...
}

type EffectFn = (() => Object | Number | String | Boolean) & { options?: Options, deps: Set<EffectFn>[] }
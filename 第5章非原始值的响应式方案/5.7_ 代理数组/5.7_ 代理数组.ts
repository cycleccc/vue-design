interface Options {
    immediate?: boolean;
    lazy?: boolean;
    flush?: string;
    scheduler?: (effectFn: EffectFn) => void;
    // 其他可能的字段...
}

type EffectFn = (() => Object | Number | String | Boolean) & { options?: Options, deps: Set<EffectFn>[] }

// 用一个全局变量存储当前激活的 effect 函数
let activeEffect: EffectFn
// effect 栈
const effectStack: EffectFn[] = []

const ITERATE_KEY = Symbol()

// 操作类型
enum TriggerKey {
    SET = 'SET',
    ADD = 'ADD',
    DELETE = 'DELETE',
}

function effect(fn: Function, options?: Options) {
    const effectFn: EffectFn = () => {
        cleanup(effectFn)
        // 当调用 effect 注册副作用函数时，将副作用函数赋值给 activeEffect
        activeEffect = effectFn
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn)
        // 将 fn 的执行结果存储到 res 中
        const res = fn()
        // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并把 activeEff2ect 还原为之前的值
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1]
        return res
    }
    // 将 options 挂载到 effectFn 上
    effectFn.options = options
    // activeEffect.deps 用来存储所有与该副作用函数相关的依赖集合
    effectFn.deps = []
    // 只有非lazy的时候，才执行
    if (!options?.lazy) {
        // 执行副作用函数
        effectFn()
    }
    return effectFn;
}

function cleanup(effectFn: EffectFn) {
    // 遍历 effectFn.deps 数组
    for (let i = 0; i < effectFn.deps.length; i++) {
        // deps 是依赖集合
        const deps = effectFn.deps[i]
        // 将 effectFn 从依赖集合中移除
        deps.delete(effectFn)
    }
    // 最后需要重置 effectFn.deps 数组
    effectFn.deps.length = 0
}

// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger(target: Object, key: string | symbol, type?: TriggerKey) {
    const depsMap = bucket.get(target)
    if (!depsMap) return

    const effects = depsMap.get(key)
    const effectsToRun: Set<EffectFn> = new Set()
    effects && effects.forEach((effectFn: EffectFn) => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
        }
    })
    effectsToRun.forEach((effectFn: EffectFn) => {
        // 如果一个副作用函数存在调度器，则调用该调度器，并将副作用函数作为参数传递
        if (effectFn.options?.scheduler) {
            effectFn.options.scheduler(effectFn)
        } else {
            // 否则直接执行副作用函数（之前的默认行为）
            effectFn()
        }
    })
    // 当操作类型为 ADD 或 DELETE 时，需要触发与 ITERATE_KEY 相关联的副作用函数重新执行
    if (type === TriggerKey.ADD || type === TriggerKey.DELETE) {
        const iterateEffects = depsMap.get(ITERATE_KEY)
        iterateEffects && iterateEffects.forEach((effectFn: EffectFn) => {
            if (effectFn !== activeEffect) {
                effectsToRun.add(effectFn)
            }
        })

        effectsToRun.forEach((effectFn) => {
            if (effectFn?.options?.scheduler) {
                effectFn.options.scheduler(effectFn)
            } else {
                effectFn()
            }
        })
    }
}

const bucket = new WeakMap()
function track(target: Object, key: string | symbol) {
    // 没有 activeEffect，直接 return
    if (!activeEffect) return
    let depsMap = bucket.get(target)
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()))
    }
    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, (deps = new Set()))
    }
    // 把当前激活的副作用函数添加到依赖集合 deps 中
    deps.add(activeEffect)
    // deps 就是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到 activeEffect.deps 数组中
    activeEffect.deps.push(deps)
}

// computed实现
function computed(getter: Function) {
    // value 用来缓存上一次计算的值
    let value: any
    // dirty 标志，用来标识是否需要重新计算值
    let dirty = true
    // 把 getter 作为副作用函数，创建一个 lazy 的 effect
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            if (!dirty) {
                dirty = true
                // 当计算属性依赖的响应式数据变化时，手动调用 trigger 函数触发响应
                trigger(obj, 'value')
            }
        }
    })

    const obj = {   // 当读取 value 时才执行 effectFn  
        get value() {
            if (dirty) {
                value = effectFn()
                dirty = false
            }
            track(obj, 'value')
            return value
        }
    }

    return obj

}

function traverse(value: any, seen = new Set()) {
    // 如果要读取的数据是原始值，或者已经被读取过了，那么什么都不做
    if (typeof value !== 'object' || value === null || seen.has(value)) return
    // 将数据添加到 seen 中，代表遍历地读取过了，避免循环引用引起的死循环
    seen.add(value)
    // 暂时不考虑数组等其他结构
    // 假设 value 就是一个对象，使用 for...in 读取对象的每一个值，并递归地调用 traverse 进行处理
    for (const k in value) {
        traverse(value[k], seen)
    }

    return value
}

// watch实现
function watch(source: any, cb: Function, options: Options) {
    let getter: Function
    if (typeof source === 'function') {
        getter = source
    } else {
        getter = () => traverse(source)
    }

    let oldValue: any, newValue: any

    // cleanup 用来存储用户注册的过期回调
    let cleanup: Function
    // 定义 onInvalidate 函数
    function onInvalidate(fn: Function) {
        // 将过期回调存储到 cleanup 中
        cleanup = fn
    }

    const job = () => {
        newValue = effectFn()
        // 在调用回调函数 cb 之前，先调用过期回调
        if (cleanup) {
            cleanup()
        }
        // 将 onInvalidate 作为回调函数的第三个参数，以便用户使用
        cb(newValue, oldValue, onInvalidate)
        oldValue = newValue
    }

    const effectFn = effect(
        // 执行 getter
        () => getter(),
        {
            lazy: true,
            scheduler: () => {
                if (options.flush === 'post') {
                    const p = Promise.resolve()
                    p.then(job)
                } else {
                    job()
                }
            }
        }
    )

    if (options.immediate) {
        job()
    } else {
        oldValue = effectFn()
    }
}

// 代理对象工厂函数
function createReactive<T extends object>(obj: T, isShallow = false, isReadonly = false): T {
    return new Proxy(obj, {
        // 拦截读取操作，接收第三个参数 receiver
        get(target: any, key, receiver) {
            console.log(`拦截到了get操作，target=${ JSON.stringify(target) },key=${ String(key) }`);
            // 代理对象可以通过 raw 属性访问原始数据
            if (key === 'raw') {
                return target
            }
            // 非只读的时候才需要建立响应联系
            if (!isReadonly) {
                track(target, key);
            }
            // 使用 Reflect.get 返回读取到的属性值
            const res = Reflect.get(target, key, receiver);
            if (isShallow) {
                return res;
            }
            if (typeof res === 'object' && res !== null) {
                // 调用 reactive 将结果包装成响应式数据并返回,如果数据为只读，则调用 readonly 对值进行包装
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        },
        // 拦截设置操作
        set(target, key, newVal, receiver) {
            console.log(`拦截到了set操作，target=${ JSON.stringify(target) },key=${ String(key) }`);
            if (isReadonly) {
                console.warn(`属性${ String(key) }是只读的`);
                return true;
            }

            const oldVal = target[key];
            // 如果属性不存在，则说明是在添加新属性，否则是设置已有属性
            const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerKey.SET : TriggerKey.ADD;
            // 设置属性值
            const res = Reflect.set(target, key, newVal, receiver);

            // 新旧值不相等时且receiver是tawrge的代理对象时才触发更新
            if (!Object.is(newVal, oldVal) && (target === receiver.raw)) {
                // 把副作用函数从桶里取出并执行
                trigger(target, key, type)
            }
            return res
        },
        // 拦截 in 操作
        has(target, key) {
            console.log(`拦截到了in操作，target=${ JSON.stringify(target) },key=${ String(key) }`);
            track(target, key)
            return Reflect.has(target, key)
        },
        // 拦截 for...in 操作
        ownKeys(target) {
            // 使用ITERATE_KEY 代替 key，forin迭代操作针对对象，使用symbol作为唯一标识
            console.log(`拦截到了for...in操作，target=${ JSON.stringify(target) },key=${ String(ITERATE_KEY) }`);
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        // 拦截 delete 操作
        deleteProperty(target, key) {
            console.log(`拦截到了delete操作，target=${ JSON.stringify(target) },key=${ String(ITERATE_KEY) }`);
            if (isReadonly) {
                console.warn(`属性${ String(key) }是只读的`);
                return true;
            }
            const res = Reflect.deleteProperty(target, key)
            // 触发删除操作
            trigger(target, key, TriggerKey.DELETE)
            return res
        },
    })
}

// 深响应代理对象
function reactive<T extends object>(obj: T) {
    return createReactive(obj);
}

// 浅响应代理对象
function shallowReactive<T extends object>(obj: T) {
    return createReactive(obj, true);
}

// 深只读响应代理对象
function readonly<T extends object>(obj: T) {
    return createReactive(obj, false, true);
}

// 浅只读响应代理对象
function shallowReadonly<T extends object>(obj: T) {
    return createReactive(obj, true, true);
}


// 5.7 仅仅修改length内的值与对象响应式没有区别
// const arr = reactive(['foo']);

// effect(() => {
//     console.log(arr[0]);
//     console.log('触发数组更改响应')
// })

// arr[0] = 'bar';

// 5.7.1 数组的索引与length
const arr = reactive(['foo']);

effect(() => {
    console.log(arr[0]);
    console.log('触发数组更改响应')
})

arr[1] = 'bar';
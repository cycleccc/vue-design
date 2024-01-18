"use strict";
// 用一个全局变量存储当前激活的 effect 函数
let activeEffect;
// effect 栈
const effectStack = [];
function effect(fn, options) {
    const effectFn = () => {
        cleanup(effectFn);
        // 当调用 effect 注册副作用函数时，将副作用函数赋值给 activeEffect
        activeEffect = effectFn;
        // 在调用副作用函数之前将当前副作用函数压栈
        effectStack.push(effectFn);
        // 将 fn 的执行结果存储到 res 中
        const res = fn(); // 新增
        // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并把 activeEffect 还原为之前的值
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
        return res;
    };
    // 将 options 挂载到 effectFn 上
    effectFn.options = options; // 新增
    // activeEffect.deps 用来存储所有与该副作用函数相关的依赖集合
    effectFn.deps = [];
    // 只有非lazy的时候，才执行
    if (!(options === null || options === void 0 ? void 0 : options.lazy)) {
        // 执行副作用函数
        effectFn();
    }
    return effectFn;
}
function cleanup(effectFn) {
    // 遍历 effectFn.deps 数组
    for (let i = 0; i < effectFn.deps.length; i++) {
        // deps 是依赖集合
        const deps = effectFn.deps[i];
        // 将 effectFn 从依赖集合中移除
        deps.delete(effectFn);
    }
    // 最后需要重置 effectFn.deps 数组
    effectFn.deps.length = 0;
}
const bucket = new WeakMap();
function track(target, key) {
    // 没有 activeEffect，直接 return
    if (!activeEffect)
        return;
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, (deps = new Set()));
    }
    // 把当前激活的副作用函数添加到依赖集合 deps 中
    deps.add(activeEffect);
    // deps 就是一个与当前副作用函数存在联系的依赖集合
    // 将其添加到 activeEffect.deps 数组中
    activeEffect.deps.push(deps); // 新增
}
// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap)
        return;
    const effects = depsMap.get(key);
    const effectsToRun = new Set();
    effects && effects.forEach((effectFn) => {
        if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
        }
    });
    effectsToRun.forEach((effectFn) => {
        var _a;
        // 如果一个副作用函数存在调度器，则调用该调度器，并将副作用函数作为参数传递
        if ((_a = effectFn.options) === null || _a === void 0 ? void 0 : _a.scheduler) {
            effectFn.options.scheduler(effectFn);
        }
        else {
            // 否则直接执行副作用函数（之前的默认行为）
            effectFn();
        }
    });
}
function computed(getter) {
    // value 用来缓存上一次计算的值
    let value;
    // dirty 标志，用来标识是否需要重新计算值
    let dirty = true;
    // 把 getter 作为副作用函数，创建一个 lazy 的 effect
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            if (!dirty) {
                dirty = true;
                // 当计算属性依赖的响应式数据变化时，手动调用 trigger 函数触发响应
                trigger(obj, 'value');
            }
        }
    });
    const obj = {
        get value() {
            if (dirty) {
                value = effectFn();
                dirty = false;
            }
            track(obj, 'value');
            return value;
        }
    };
    return obj;
}
function traverse(value, seen = new Set()) {
    // 如果要读取的数据是原始值，或者已经被读取过了，那么什么都不做
    if (typeof value !== 'object' || value === null || seen.has(value))
        return;
    // 将数据添加到 seen 中，代表遍历地读取过了，避免循环引用引起的死循环
    seen.add(value);
    // 暂时不考虑数组等其他结构
    // 假设 value 就是一个对象，使用 for...in 读取对象的每一个值，并递归地调用 traverse 进行处理
    for (const k in value) {
        traverse(value[k], seen);
    }
    return value;
}
function watch(source, cb, options) {
    let getter;
    if (typeof source === 'function') {
        getter = source;
    }
    else {
        getter = () => traverse(source);
    }
    let oldValue, newValue;
    const job = () => {
        newValue = effectFn();
        cb(newValue, oldValue);
        oldValue = newValue;
    };
    const effectFn = effect(
    // 执行 getter
    () => getter(), {
        lazy: true,
        scheduler: () => {
            // 在调度函数中判断 flush 是否为 'post'，如果是，将其放到微任务队列中执行
            if ((options === null || options === void 0 ? void 0 : options.flush) === 'post') {
                const p = Promise.resolve();
                p.then(job);
            }
            else {
                job();
            }
        }
    });
    if (options === null || options === void 0 ? void 0 : options.immediate) {
        job();
    }
    else {
        oldValue = effectFn();
    }
}
const data = { foo: 1, bar: 2 };
// 代理对象
const obj = new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
        // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
        track(target, key);
        // 返回属性值
        return target[key];
    },
    // 拦截设置操作
    set(target, key, newVal) {
        // 设置属性值
        target[key] = newVal;
        // 把副作用函数从桶里取出并执行
        trigger(target, key);
        return true;
    }
});
const sumRes = computed(() => obj.foo + obj.bar);
watch(() => obj.foo, (newValue, oldValue) => {
    console.log(`oldValue:${oldValue}
newValue:${newValue}`);
});
console.log(sumRes.value);
obj.foo++;

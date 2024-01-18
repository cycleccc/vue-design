"use strict";
// 用一个全局变量存储被注册的副作用函数
let activeEffect;
function effect(fn) {
    const effectFn = () => {
        // 当 effectFn 执行时，将其设置为当前激活的副作用函数
        cleanup(effectFn); // 新增
        activeEffect = effectFn;
        fn();
    };
    // activeEffect.deps 用来存储所有与该副作用函数相关联的依赖集合
    effectFn.deps = [];
    // 执行副作用函数
    effectFn();
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
    const effectsToRun = new Set(effects); // 新增
    effectsToRun.forEach((effectFn) => effectFn()); // 新增
    // effects && effects.forEach(effectFn => effectFn()) // 删除
}
const data = { ok: true, text: 'hello world' };
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
        // ts定义需要返回一个布尔值
        return true;
    }
});
effect(function effectFn() {
    document.body.innerText = obj.ok ? obj.text : 'not';
    console.log('触发了effect函数');
});

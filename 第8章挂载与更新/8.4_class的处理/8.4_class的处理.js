"use strict";
function shouldSetAsProps(el, key, value) {
    // 特殊处理
    if (key === 'form' && el.tagName === 'INPUT')
        return false;
    // 兜底
    return key in el;
}
function handleObject(set, obj) {
    for (const key in obj) {
        // 如果对象的值为 true，则将键（类名）加入到 set 中
        if (obj[key])
            set.add(key);
    }
}
function normalizeClass(classValue) {
    // 如果 classValue 是字符串，则直接返回
    if (typeof classValue === 'string')
        return classValue;
    // 创建一个 Set 来存储结果类名
    let resultClassSet = new Set();
    // 处理数组和对象的情况
    if (Array.isArray(classValue)) {
        // 遍历数组中的每个值
        for (const value of classValue) {
            // 如果值是字符串，则直接添加到结果集合中
            if (typeof value === 'string')
                resultClassSet.add(value);
            // 如果值是对象，则调用 handleObject 处理
            else
                handleObject(resultClassSet, value);
        }
    }
    else {
        // 如果 classValue 是对象，则调用 handleObject 处理
        handleObject(resultClassSet, classValue);
    }
    // 将结果集合转换为数组，并用空格连接成字符串，并去除首尾空格后返回
    return Array.from(resultClassSet).join(' ').trim();
}
function createRenderer(options) {
    // 通过 options 得到操作 DOM 的 API
    const { createElement, insert, setElementText, patchProps } = options;
    function mountElement(vnode, container) {
        // 调用 createElement 函数创建元素
        // const el : { [key: string]: any } = createElement(vnode.type)
        const el = createElement(vnode.type);
        if (typeof vnode.children === 'string') {
            // 调用 setElementText  设置元素的文本节点
            setElementText(el, vnode.children);
        }
        else if (Array.isArray(vnode.children)) {
            // 如果  children 是数组，则遍历每一个子节点，并调用 patch 函数挂载它们
            vnode.children.forEach(child => {
                patch(null, child, el);
            });
        }
        if (vnode.props) {
            // 遍历 vnode.props
            for (const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key]);
            }
        }
        // 调用 insert 函数将元素插入到容器内
        insert(el, container);
    }
    function patch(n1, n2, container) {
        if (!n1) {
            mountElement(n2, container);
        }
        else {
            // n1 存在则是 diff
        }
    }
    function render(vnode, container) {
        if (vnode) {
            // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
            patch(container._vnode, vnode, container);
        }
        else {
            if (container._vnode) {
                // 旧 vnode 存在，且新 vnode 不存在，说明是卸载（unmount）操作
                // 只需要将 container 内的 DOM 清空即可
                container.innerHTML = '';
            }
        }
        // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
        container._vnode = vnode;
    }
    return {
        render
    };
}
function createAppElement() {
    // 创建一个新的 div 元素
    const appDiv = document.createElement('div');
    // 设置 div 的 id 属性为 "app"
    appDiv.id = 'app';
    // 将创建的 div 元素添加到文档的 body 中
    document.body.appendChild(appDiv);
    return appDiv;
}
// 在创建 renderer 时传入配置项
const renderer = createRenderer({
    createElement(tag) {
        return document.createElement(tag);
    },
    setElementText(el, text) {
        el.textContent = text;
    },
    insert(el, parent, anchor) {
        parent.insertBefore(el, anchor);
    },
    // 将属性设置相关操作封装到 patchProps 函数中，并作为渲染器选项传递
    patchProps(el, key, prevValue, nextValue) {
        // 如果key为class直接设置className比用setAtribute更快
        if (key === 'class') {
            el.className = nextValue || '';
        }
        if (shouldSetAsProps(el, key, nextValue)) {
            const type = typeof el[key];
            if (type === 'boolean' && nextValue === '') {
                el[key] = true;
            }
            else {
                el[key] = nextValue;
            }
        }
        else {
            el.setAttribute(key, nextValue);
        }
    }
});
const vnode = {
    type: 'p',
    props: {
        // 使用 normalizeClass 函数对值进行序列化
        class: normalizeClass([
            'foo bar',
            { baz: true }
        ])
    }
};
console.log(`vnode :${JSON.stringify(vnode)}`, vnode);
// const vnode = {
//     type: 'p',
//     props: {
//         // 序列化后的结果
//         class: 'foo bar baz'
//     }
// }
// 本章节代码ts注解不好搞，又是HTMLElement又是object，后面的章节再规范
const container = { type: 'root' };
renderer.render(vnode, document.querySelector('#app') || createAppElement());

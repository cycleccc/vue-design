"use strict";
function createRenderer(options) {
    // 通过 options 得到操作 DOM 的 API
    const { createElement, insert, setElementText } = options;
    function mountElement(vnode, container) {
        // 调用 createElement 函数创建元素
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
                // 调用 setAttribute 将属性设置到元素上
                el.setAttribute(key, vnode.props[key]);
                // 直接设置
                // el[key] =vnode.props[key]
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
const vnode = {
    type: 'div',
    props: {
        id: 'foo'
    },
    children: [
        {
            type: 'p',
            children: 'hello'
        }
    ]
};
// 在创建 renderer 时传入配置项
const renderer1 = createRenderer({
    // 用于创建元素
    createElement(tag) {
        return document.createElement(tag);
    },
    // 用于设置元素的文本节点
    setElementText(el, text) {
        el.textContent = text;
    },
    // 用于在给定的 parent 下添加指定元素
    insert(el, parent, anchor) {
        parent.insertBefore(el, anchor);
    }
});
// 本章节代码ts注解不好搞，又是HTMLElement又是object，后面的章节再规范
const container = { type: 'root' };
renderer1.render(vnode, document.querySelector('#app') || createAppElement());

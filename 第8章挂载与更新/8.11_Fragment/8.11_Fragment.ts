interface VNode {
    type: string | Symbol;
    props?: { [key: string]: any }; // 属性对象可以包含任意键值对
    children?: string | (VNode | string)[];
    el?: HTMLElement | Text;
}

interface HTMLElement {
    _vei: any
}

interface Options {
    createElement(tagName: string): HTMLElement;
    insert(parent: HTMLElement | Text, child: HTMLElement, index?: Node): void;
    setElementText(element: HTMLElement, text: string): void;
    createText(text: string): Text;
    setText(element: HTMLElement, text: string): void;
    patchProps(element: HTMLElement | Text, key: string, prevValue: string | EventListenerOrEventListenerObject | null, nextValue: string | EventListenerOrEventListenerObject | null): void;
}
function shouldSetAsProps(el: HTMLElement, key: string, value: any) {
    // 特殊处理
    if (key === 'form' && el.tagName === 'INPUT') return false
    // 兜底
    return key in el
}
function handleObject(set: Set<string>, obj: { [key: string]: boolean }) {
    for (const key in obj) {
        // 如果对象的值为 true，则将键（类名）加入到 set 中
        if (obj[key]) set.add(key);
    }
}

function normalizeClass(classValue: string | { [key: string]: boolean } | Array<string | { [key: string]: boolean }>) {
    // 如果 classValue 是字符串，则直接返回
    if (typeof classValue === 'string') return classValue;

    // 创建一个 Set 来存储结果类名
    let resultClassSet: Set<string> = new Set();

    // 处理数组和对象的情况
    if (Array.isArray(classValue)) {
        // 遍历数组中的每个值
        for (const value of classValue) {
            // 如果值是字符串，则直接添加到结果集合中
            if (typeof value === 'string') resultClassSet.add(value);
            // 如果值是对象，则调用 handleObject 处理
            else handleObject(resultClassSet, value);
        }
    } else {
        // 如果 classValue 是对象，则调用 handleObject 处理
        handleObject(resultClassSet, classValue);
    }

    // 将结果集合转换为数组，并用空格连接成字符串，并去除首尾空格后返回
    return Array.from(resultClassSet).join(' ').trim();
}

function createRenderer(options: Options) {
    // 通过 options 得到操作 DOM 的 API
    const {
        createElement,
        insert,
        createText,
        setText,
        setElementText,
        patchProps
    } = options
    function unmount(vnode: VNode | string) {
        if (typeof vnode === "string") return
        const parent = vnode.el?.parentNode
        if (parent && vnode.el) {
            parent.removeChild(vnode.el)
        }
    }

    function patchElement(n1: VNode, n2: VNode) {
        const el = n2.el = n1.el
        const oldProps = n1.props
        const newProps = n2.props
        // 第一步：更新 props
        for (const key in newProps) {
            if (newProps[key] !== oldProps?.[key]) {
                el && patchProps(el, key, oldProps?.[key], newProps[key])
            }
        }
        for (const key in oldProps) {
            if (newProps && !(key in newProps)) {
                el && patchProps(el, key, oldProps[key], null)
            }
        }

        // 第二步：更新 children
        patchChildren(n1, n2, el as HTMLElement)
    }
    function patchChildren(n1: VNode, n2: VNode, container: HTMLElement) {
        // 判断新子节点的类型是否是文本节点
        if (typeof n2.children === 'string') {
            // 旧子节点的类型有三种可能：
            // 只有当旧子节点为一组子节点时，才需要逐个卸载，其他情况下什么都不需要做
            if (Array.isArray(n1.children)) {
                // 这里涉及到diff算法
                n1.children.forEach((c) => unmount(c))
            }
            // 最后将新的文本节点内容设置给容器元素
            setElementText(container, n2.children)
        } else if (Array.isArray(n2.children)) {
            // 说明新子节点是一组子节点
            // 判断旧子节点是否也是一组子节点
            if (Array.isArray(n1.children)) {
                // 代码运行到这里，则说明新旧子节点都是一组子节点，这里涉及核心的 Diff 算法
            } else {
                // 此时：
                // 旧子节点要么是文本子节点，要么不存在
                // 但无论哪种情况，我们都只需要将容器清空，然后将新的一组子节点逐个挂载
                setElementText(container, '')
                n2.children.forEach(c => patch(null, c, container))
            }
        } else {
            // 代码运行到这里，说明新子节点不存在
            // 旧子节点是一组子节点，只需逐个卸载即可
            if (Array.isArray(n1.children)) {
                n1.children.forEach(c => unmount(c))
            } else if (typeof n1.children === 'string') {
                // 旧子节点是文本子节点，清空内容即可
                setElementText(container, '')
            }
            // 如果也没有旧子节点，那么什么都不需要做
        }
    }

    function mountElement(vnode: VNode, container: HTMLElement) {
        // 调用 createElement 函数创建元素
        const el = vnode.el = createElement(vnode.type as string)
        if (typeof vnode.children === 'string') {
            // 调用 setElementText  设置元素的文本节点
            setElementText(el, vnode.children)
        } else if (Array.isArray(vnode.children)) {
            // 如果  children 是数组，则遍历每一个子节点，并调用 patch 函数挂载它们
            vnode.children.forEach(child => {
                patch(null, child, el)
            })
        }
        if (vnode.props) {
            // 遍历 vnode.props
            for (const key in vnode.props) {
                patchProps(el, key, null, vnode.props[key])
            }
        }
        // 调用 insert 函数将元素插入到容器内
        insert(el, container)
    }
    function patch(n1: VNode | null, n2: VNode | string, container: HTMLElement) {
        if (typeof n2 === 'string') return
        // 如果 n1 存在，则对比 n1 和 n2 的类型
        if (n1 && n1.type !== n2.type) {
            // 如果新旧 vnode 的类型不同，则直接将旧 vnode 卸载
            unmount(n1)
            n1 = null
        }
        // 代码运行到这里，证明 n1 和 n2 所描述的内容相同
        const { type } = n2
        // 如果 n2.type 的值是字符串类型，则它描述的是普通标签元素
        if (typeof type === 'string') {
            if (!n1) {
                mountElement(n2, container)
            } else {
                patchElement(n1, n2)
            }
        } else if (type === selfText) { // 如果新 vnode 的类型是 Text，则说明该 vnode 描述的是文本节点
            // 如果没有旧节点，则进行挂载
            if (!n1) {
                // 使用 createTextNode 创建文本节点
                const el = n2.el = document.createTextNode(n2.children as string)
                // 将文本节点插入到容器中
                insert(el, container)
            } else {
                // 如果旧 vnode 存在，只需要使用新文本节点的文本内容更新旧文本节点即可
                const el = n2.el = n1.el
                if (el && n2.children !== n1.children) {
                    // setText(el, n2.children)
                    el.nodeValue = n2.children as string
                }
            }
        } else if (type === Fragment) { // 处理 Fragment 类型的 vnode
            if (!n1 && n2.children && Array.isArray(n2.children)) {
                // 如果旧 vnode 不存在，则只需要将 Fragment 的 children 逐个挂载即可
                n2.children.forEach(c => patch(null, c, container))
            } else {
                // 如果旧 vnode 存在，则只需要更新 Fragment 的 children 即可
                patchChildren(n1 as VNode, n2, container)
            }
        } else if (typeof type === 'object') {
            // 如果 n2.type 的值的类型是对象，则它描述的是组件
        } else if (['string', 'object'].includes(typeof type)) {
            // 处理其他类型的 vnode
        }
    }
    function render(vnode: VNode | null, container: HTMLElement | object | any) {
        if (vnode) {
            // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
            patch(container._vnode, vnode, container);
        } else {
            if (container._vnode) {
                unmount(container._vnode)
            }
        }
        // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
        container._vnode = vnode;
    }

    return {
        render
    };
}

// 在创建 renderer 时传入配置项
const renderer = createRenderer({
    createElement(tag) {
        return document.createElement(tag)
    },
    setElementText(el, text) {
        el.textContent = text
    },
    insert(el, parent, anchor: Node) {
        parent.insertBefore(el, anchor)
    },
    createText(text: string) {
        return document.createTextNode(text)
    },
    setText(el: HTMLElement, text: string) {
        el.nodeValue = text
    },
    patchProps(el: HTMLElement, key: string, prevValue: string | EventListenerOrEventListenerObject | null, nextValue: string | EventListenerOrEventListenerObject | null) {
        // 匹配以 on 开头的属性，视其为事件
        if (/^on/.test(key)) {
            // 定义 el._vei 为一个对象，存在事件名称到事件处理函数的映射
            const invokers = el._vei || (el._vei = {})
            //根据事件名称获取 invoker
            let invoker = invokers[key]
            const name = key.slice(2).toLowerCase()
            if (nextValue) {
                if (!invoker) {
                    // 如果没有 invoker，则将一个伪造的 invoker 缓存到 el._vei 中
                    // vei 是 vue event invoker 的首字母缩写
                    invoker = el._vei[key] = (e: Event) => {
                        // 如果 invoker.value 是数组，则遍历它并逐个调用事件处理函数
                        // 如果事件发生的时间早于事件处理函数绑定的时间，则不处理执行事件处理函数
                        if (e.timeStamp < invoker.attached) return
                        if (Array.isArray(invoker.value)) {
                            invoker.value.forEach((fn: Function) => fn(e))
                        } else {
                            // 否则直接作为函数调用
                            // 当伪造的事件处理函数执行时，会执行真正的事件处理函数
                            invoker.value(e)
                        }
                    }
                    // 将真正的事件处理函数赋值给 invoker.value
                    invoker.value = nextValue
                    // 添加 invoker.attached 属性，存储事件处理函数被绑定的时间
                    invoker.attached = performance.now()
                    // 绑定 invoker 作为事件处理函数
                    el.addEventListener(name, invoker)
                } else {
                    // 如果 invoker 存在，意味着更新，并且只需要更新 invoker.value 的值即可
                    invoker.value = nextValue
                }
            } else if (invoker) {
                // 新的事件绑定函数不存在，且之前绑定的 invoker 存在，则移除绑定
                el.removeEventListener(name, invoker)
            }
        } else if (key === 'class') {
            el.className = nextValue as string || ''
        } else if (shouldSetAsProps(el, key, nextValue)) {
            const type = typeof (el as any)[key]
            if (type === 'boolean' && nextValue === '') {
                (el as any)[key] = true
            } else {
                (el as any)[key] = nextValue
            }
        } else {
            el.setAttribute(key, nextValue as string)
        }
    }
    // 将属性设置相关操作封装到 patchProps 函数中，并作为渲染器选项传递
})
const selfText = Symbol()
const Fragment = Symbol()
const vnode = {
    type: Fragment,
    children: [
        { type: 'li', children: 'text 1' },
        { type: 'li', children: 'text 2' },
        { type: 'li', children: 'text 3' }
    ]
}
// 初次挂载
renderer.render(vnode, document.querySelector('#app'))
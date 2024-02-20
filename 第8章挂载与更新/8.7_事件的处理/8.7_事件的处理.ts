interface VNode {
    type: string;
    props?: { [key: string]: any }; // 属性对象可以包含任意键值对
    children?: string | VNode[];
    el?: HTMLElement;
}

interface HTMLElement {
    _vei: any
}

interface Options {
    createElement(tagName: string): HTMLElement;
    insert(parent: HTMLElement, child: HTMLElement, index?: Node): void;
    setElementText(element: HTMLElement, text: string): void;
    patchProps(element: HTMLElement, key: string, prevValue: string | EventListenerOrEventListenerObject | null, nextValue: string | EventListenerOrEventListenerObject): void;
}
function shouldSetAsProps(el: HTMLElement, key: string, value: any) {
    // 特殊处理
    if (key === 'form' && el.tagName === 'INPUT') return false
    // 兜底
    return key in el
}
function unmount(vnode: VNode) {
    const parent = vnode.el?.parentNode
    if (parent && vnode.el) {
        parent.removeChild(vnode.el)
    }
}
function patchElement(n1: VNode, n2: VNode) {

}
function createRenderer(options: Options) {
    // 通过 options 得到操作 DOM 的 API
    const {
        createElement,
        insert,
        setElementText,
        patchProps
    } = options
    function mountElement(vnode: VNode, container: HTMLElement) {
        // 调用 createElement 函数创建元素
        const el = vnode.el = createElement(vnode.type)
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
    function patch(n1: VNode | null, n2: VNode, container: HTMLElement) {
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
    // 将属性设置相关操作封装到 patchProps 函数中，并作为渲染器选项传递
    patchProps(el, key, prevValue, nextValue) {
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
                    invoker = el._vei[key] = (e: string | EventListenerOrEventListenerObject | null) => {
                        // 如果 invoker.value 是数组，则遍历它并逐个调用事件处理函数
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
})

// 不同事件名称的vnode
// const vnode = {
//     type: 'p',
//     props: {
//         onClick: () => {
//             alert('clicked')
//         },
//         onContextmenu: () => {
//             alert('contextmenu')
//         }
//     },
//     children: 'text'
// }

// 相同事件名称不同函数的vnode
const vnode = {
    type: 'p',
    props: {
        onClick: [
            // 第一个事件处理函数
            () => {
                alert('clicked 1')
            },
            // 第二个事件处理函数
            () => {
                alert('clicked 2')
            }
        ]
    },
    children: 'text'
}

// 初次挂载
renderer.render(vnode, document.querySelector('#app'))
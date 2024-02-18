interface VNode {
    type: string;
    children: string | VNode[];
}

interface Options {
    createElement(tagName: string): HTMLElement | object;
    insert(parent: HTMLElement | object, child: HTMLElement, index?: Node): void;
    setElementText(element: HTMLElement, text: string): void;
}

const vnode: VNode = {
    type: 'h1',
    children: 'hello'
}
function createRenderer(options: Options) {
    // 通过 options 得到操作 DOM 的 API
    const {
        createElement,
        insert,
        setElementText
    } = options
    function mountElement(vnode: VNode, container: HTMLElement) {
        // 调用 createElement 函数创建元素
        const el = createElement(vnode.type)
        if (typeof vnode.children === 'string') {
            // 调用 setElementText 设置元素的文本节点
            setElementText(el as HTMLElement, vnode.children)
        }
        // 调用 insert 函数将元素插入到容器内
        insert(el, container)
    }
    function patch(n1: any, n2: any, container: any) {
        if (!n1) {
            mountElement(n2, container)
        } else {
            // n1 存在则是 diff
        }
    }
    function render(vnode: VNode | null, container: HTMLElement | object | any) {
        if (vnode) {
            // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数，进行打补丁
            patch(container._vnode, vnode, container);
        } else {
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
    return appDiv
}

// 在创建 renderer 时传入配置项
const renderer1 = createRenderer({
    // 用于创建元素
    createElement(tag) {
        return document.createElement(tag)
    },
    // 用于设置元素的文本节点
    setElementText(el, text) {
        el.textContent = text
    },
    // 用于在给定的 parent 下添加指定元素
    insert(el, parent, anchor: Node) {
        parent.insertBefore(el as HTMLElement, anchor)
    }
})
const renderer2 = createRenderer({
    createElement(tag) {
        console.log(`创建元素 ${ tag }`)
        return { tag }
    },
    setElementText(el, text) {
        console.log(`设置 ${ JSON.stringify(el) } 的文本内容：${ text }`)
        el.textContent = text
    },
    insert(el, parent: any, anchor) {
        console.log(`将 ${ JSON.stringify(el) } 添加到 ${ JSON.stringify(parent) } 下`)
        parent.children = el
    }
})


// 本章节代码ts注解不好搞，又是HTMLElement又是object，后面的章节再规范
const container = { type: 'root' }
renderer1.render(vnode, document.querySelector('#app') || createAppElement())
renderer2.render(vnode, container)
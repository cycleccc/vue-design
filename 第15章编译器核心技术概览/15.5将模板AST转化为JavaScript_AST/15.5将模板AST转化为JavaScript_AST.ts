// parse 函数接收模板作为参数
interface Token {
    type: 'tag' | 'text' | 'tagEnd';
    name?: string;
    content?: string;
}

interface ElementNode {
    type: 'Element';
    tag: string;
    props?: Record<string, string>;
    children: Array<ElementNode | TextNode>;
}

interface TextNode {
    type: 'Text';
    content: string;
}

interface RootNode {
    type: 'Root';
    children: Array<ElementNode | TextNode>;
}

// 定义状态常量
const State = {
    initial: 1 as const,
    tagOpen: 2 as const,
    tagName: 3 as const,
    text: 4 as const,
    tagEnd: 5 as const,
    tagEndName: 6 as const
}

// 字符串是否为字母的辅助函数
function isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
}
// 标记化函数
function tokenize(str: string): Token[] {
    let currentState: number = State.initial
    const chars: string[] = []
    const tokens: Token[] = []

    while (str) {
        const char: string = str[0]
        switch (currentState) {
            case State.initial:
                if (char === '<') {
                    currentState = State.tagOpen
                    str = str.slice(1)
                } else if (isAlpha(char)) {
                    currentState = State.text
                    chars.push(char)
                    str = str.slice(1)
                }
                break
            case State.tagOpen:
                if (isAlpha(char)) {
                    currentState = State.tagName
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '/') {
                    currentState = State.tagEnd
                    str = str.slice(1)
                }
                break
            case State.tagName:
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '>') {
                    currentState = State.initial
                    tokens.push({
                        type: 'tag',
                        name: chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break
            case State.text:
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '<') {
                    currentState = State.tagOpen
                    tokens.push({
                        type: 'text',
                        content: chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break
            case State.tagEnd:
                if (isAlpha(char)) {
                    currentState = State.tagEndName
                    chars.push(char)
                    str = str.slice(1)
                }
                break
            case State.tagEndName:
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '>') {
                    currentState = State.initial
                    tokens.push({
                        type: 'tagEnd',
                        name: chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                }
                break
        }
    }

    return tokens
}

function parse(str: string): RootNode {
    const tokens: Token[] = tokenize(str);
    const root: RootNode = {
        type: 'Root',
        children: []
    };
    const elementStack: Array<ElementNode | RootNode> = [root];

    while (tokens.length) {
        const parent = elementStack[elementStack.length - 1];
        const t = tokens[0];
        switch (t.type) {
            case 'tag':
                const elementNode: ElementNode = {
                    type: 'Element',
                    tag: t.name!,
                    children: []
                };
                parent.children.push(elementNode);
                elementStack.push(elementNode);
                break;
            case 'text':
                const textNode: TextNode = {
                    type: 'Text',
                    content: t.content!
                };
                parent.children.push(textNode);
                break;
            case 'tagEnd':
                elementStack.pop();
                break;
        }
        tokens.shift();
    }

    return root;
}
function dump(node: RootNode | ElementNode | TextNode, indent = 0) {
    // 节点的类型
    const type = node.type
    // 节点的描述，如果是根节点，则没有描述
    // 如果是 Element 类型的节点，则使用 node.tag 作为节点的描述
    // 如果是 Text 类型的节点，则使用 node.content 作为节点的描述
    const desc = node.type === 'Root'
        ? ''
        : node.type === 'Element'
            ? node.tag
            : node.content

    // 打印节点的类型和描述信息
    console.log(`${ '-'.repeat(indent) }${ type }: ${ desc }`)

    // 递归地打印子节点
    if ('children' in node) {
        node.children.forEach(n => dump(n, indent + 2))
    }
}



// 定义节点类型
type AstNode = RootNode | TextNode | ElementNode;

// 定义上下文类型
type Context = {
    currentNode: AstNode | null;
    parent: ElementNode | null;
    childIndex?: number;
    replaceNode(node: AstNode): void;
    removeNode(): void;
    nodeTransforms: ((node: AstNode, context: Context) => (() => void) | undefined)[];
}

// 遍历 AST 节点的函数
function traverseNode(ast: AstNode, context: Context): void {
    context.currentNode = ast

    const exitFns: (() => void)[] = []
    const transforms = context.nodeTransforms
    for (let i = 0; i < transforms.length; i++) {
        const onExit = transforms[i](context.currentNode, context)
        if (onExit) {
            exitFns.push(onExit)
        }
        if (!context.currentNode) return
    }

    if ("children" in context.currentNode) {
        const children = context.currentNode.children
        for (let i = 0; i < children.length; i++) {
            context.parent = context.currentNode as ElementNode
            context.childIndex = i
            traverseNode(children[i], context)
        }
    }

    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}

// 转换 AST 的函数
function transform(ast: RootNode): void {
    const context: Context = {
        currentNode: null,
        parent: null,
        replaceNode(node: AstNode): void {
            if (context.parent) {
                context.currentNode = node
                context.parent.children![context.childIndex!] = node as TextNode | ElementNode
            }
        },
        removeNode(): void {
            if (context.parent) {
                context.parent.children!.splice(context.childIndex!, 1)
                context.currentNode = null
            }
        },
        nodeTransforms: [
            transformElement,
            transformText
        ]
    }
    traverseNode(ast, context)
    console.log(dump(ast))
}

// 转换元素节点的函数
function transformElement(node: AstNode, context: Context): () => void {
    if (node.type === 'Element') {
        console.log(`进入元素节点：${ node.tag }`)
    }
    return () => {
        if (node.type === 'Element') {
            console.log(`退出元素节点：${ node.tag }`)
        }
    }
}

// 转换文本节点的函数
function transformText(node: AstNode, context: Context): () => void {
    if (node.type === 'Text') {
        console.log(`进入文本节点：${ node.content }`)
    }
    return () => {
        if (node.type === 'Text') {
            console.log(`退出文本节点：${ node.content }`)
        }
    }
}


// 测试代码
const template: string = `<div><p>Vue</p><p>Template</p></div>`

const tokenIfyTemplate = tokenize(template);
console.log(tokenIfyTemplate)

const ast = parse(template)
console.log(ast)

const dumpAst = dump(ast)
console.log(dumpAst)

transform(ast)
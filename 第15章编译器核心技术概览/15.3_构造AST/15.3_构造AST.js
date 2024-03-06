"use strict";
// 定义状态常量
const State = {
    initial: 1,
    tagOpen: 2,
    tagName: 3,
    text: 4,
    tagEnd: 5,
    tagEndName: 6
};
// 字符串是否为字母的辅助函数
function isAlpha(char) {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
}
// 标记化函数
function tokenize(str) {
    let currentState = State.initial;
    const chars = [];
    const tokens = [];
    while (str) {
        const char = str[0];
        switch (currentState) {
            case State.initial:
                if (char === '<') {
                    currentState = State.tagOpen;
                    str = str.slice(1);
                }
                else if (isAlpha(char)) {
                    currentState = State.text;
                    chars.push(char);
                    str = str.slice(1);
                }
                break;
            case State.tagOpen:
                if (isAlpha(char)) {
                    currentState = State.tagName;
                    chars.push(char);
                    str = str.slice(1);
                }
                else if (char === '/') {
                    currentState = State.tagEnd;
                    str = str.slice(1);
                }
                break;
            case State.tagName:
                if (isAlpha(char)) {
                    chars.push(char);
                    str = str.slice(1);
                }
                else if (char === '>') {
                    currentState = State.initial;
                    tokens.push({
                        type: 'tag',
                        name: chars.join('')
                    });
                    chars.length = 0;
                    str = str.slice(1);
                }
                break;
            case State.text:
                if (isAlpha(char)) {
                    chars.push(char);
                    str = str.slice(1);
                }
                else if (char === '<') {
                    currentState = State.tagOpen;
                    tokens.push({
                        type: 'text',
                        content: chars.join('')
                    });
                    chars.length = 0;
                    str = str.slice(1);
                }
                break;
            case State.tagEnd:
                if (isAlpha(char)) {
                    currentState = State.tagEndName;
                    chars.push(char);
                    str = str.slice(1);
                }
                break;
            case State.tagEndName:
                if (isAlpha(char)) {
                    chars.push(char);
                    str = str.slice(1);
                }
                else if (char === '>') {
                    currentState = State.initial;
                    tokens.push({
                        type: 'tagEnd',
                        name: chars.join('')
                    });
                    chars.length = 0;
                    str = str.slice(1);
                }
                break;
        }
    }
    return tokens;
}
function parse(str) {
    // 首先对模板进行标记化，得到 tokens
    const tokens = tokenize(str);
    // 创建 Root 根节点
    const root = {
        type: 'Root',
        children: []
    };
    // 创建 elementStack 栈，起初只有 Root 根节点
    const elementStack = [root];
    // 开启一个 while 循环扫描 tokens，直到所有 Token 都被扫描完毕为止
    while (tokens.length) {
        // 获取当前栈顶节点作为父节点 parent
        const parent = elementStack[elementStack.length - 1];
        // 当前扫描的 Token
        const t = tokens[0];
        switch (t.type) {
            case 'tag':
                // 如果当前 Token 是开始标签，则创建 Element 类型的 AST 节点
                const elementNode = {
                    type: 'Element',
                    tag: t.name,
                    children: []
                };
                // 将其添加到父级节点的 children 中
                parent.children.push(elementNode);
                // 将当前节点压入栈
                elementStack.push(elementNode);
                break;
            case 'text':
                // 如果当前 Token 是文本，则创建 Text 类型的 AST 节点
                const textNode = {
                    type: 'Text',
                    content: t.content
                };
                // 将其添加到父节点的 children 中
                parent.children.push(textNode);
                break;
            case 'tagEnd':
                // 遇到结束标签，将栈顶节点弹出
                elementStack.pop();
                break;
        }
        // 消费已经扫描过的 token
        tokens.shift();
    }
    // 最后返回 AST
    return root;
}
// 测试代码
const template = `<p>Vue</p>`;
console.log(tokenize(template));
console.log(parse(`<div><p>Vue</p><p>Template</p></div>`));

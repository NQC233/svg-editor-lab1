# 测试目录

使用 Node.js 内置的 `node:test` 和 `node:assert/strict`，文件命名为 `*.test.ts`，通过 tsx 加载 TypeScript。当前 Ticket 01 已有 7 个测试，覆盖分词、命令分发、失败原子性、脚本回放和 TTY 输出。

## 当前布局

```text
test/
├── cli/             # 分词、REPL、真实脚本回放
└── commands/        # help、init、canvas、无文档和失败原子性
```

后续图形、历史、IO 和 fixture 测试按 [任务计划](../doc/ticket-plan.md) 逐步加入。

## 验收重点

- 每条命令的成功、失败、撤销、重做和无操作。
- 失败前后文档树完全一致；失败不进入历史。
- 容器的递归 move/scale/delete；跨父级 group；根级 ungroup 限制；成环拒绝。
- 一条编辑命令一个撤销单元；新编辑清空 redo；IO 后锁定，下一次改变状态的编辑解锁。
- 自动补 id 警告、重复 id 拒绝、`transform`/`style`/未知元素/`viewBox` 拒绝。
- SVG 往返后图形树、样式、未建模属性和显示输出一致。
- 脚本回放输出与 `doc/spec.md` 的验收样例一致。

完整规格见 [`doc/spec.md`](../doc/spec.md)，任务拆分见[纵向任务计划](../doc/ticket-plan.md)。

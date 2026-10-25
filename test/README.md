# 测试目录

使用 Node.js 内置的 `node:test` 和 `node:assert/strict`，文件命名为 `*.test.ts`，通过 tsx 加载 TypeScript。当前 Ticket 01–12、13 和 15 已有 101 个测试，覆盖引号/转义/引号元数据、注释分词、数值边界、命令分发、失败原子性、脚本回放、TTY 输出、六种内置类型创建、嵌套容器与 `in` 后缀、文本 JSON 转义、公共样式与各类型属性更新、局部 tree/show、兄弟列对齐、五类叶子与整棵容器的移动和缩放、叶子/子树删除与恢复、嵌套容器解散与恢复、跨父级原文档顺序分组、跨父级和同父级归属移动、精确结构/几何/属性快照撤销，以及 redo 分支、`init` 和带参数 `canvas` 的历史屏障。

## 当前布局

```text
test/
├── cli/             # 分词、REPL、真实脚本回放
├── commands/        # help、init、canvas、create/delete、group/addto、move/scale/set、undo/redo、tree/show 和失败原子性
├── domain/          # 文档、容器结构不变量、几何/属性/分组快照、子树位置与移动/缩放/重挂事务
└── support/         # 共享的命令分发装配
```

后续图形、历史、IO 和 fixture 测试按 [任务计划](../doc/ticket-plan.md) 逐步加入。

## 验收重点

- 每条命令的成功、失败、撤销、重做和无操作。
- 失败前后文档树完全一致；失败不进入历史。
- 容器的递归 move/scale/delete；容器样式只更新自身；跨父级 group；addto 同父级/跨父级移动；根级 ungroup 限制；成环拒绝。
- 一条编辑命令一个撤销单元；新编辑清空 redo；IO 后锁定，下一次改变状态的编辑解锁。
- 自动补 id 警告、重复 id 拒绝、`transform`/`style`/未知元素/`viewBox` 拒绝。
- SVG 往返后图形树、样式、未建模属性和显示输出一致。
- 脚本回放输出与 `doc/spec.md` 的验收样例一致。

完整规格见 [`doc/spec.md`](../doc/spec.md)，任务拆分见[纵向任务计划](../doc/ticket-plan.md)。

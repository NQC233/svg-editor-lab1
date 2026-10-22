# Domain Docs

工程类 skill 在探索代码库时应如何读取本仓库的领域文档。

## 探索前先读

- 根目录的 **`CONTEXT.md`**；或者
- 如果根目录存在 **`CONTEXT-MAP.md`**：它指向每个 context 各自的 `CONTEXT.md`，读取与当前主题相关的那些。
- **`docs/adr/`**：读取涉及即将改动区域的 ADR。多 context 仓库还要检查 `src/<context>/docs/adr/` 中的 context 级决策。

如果这些文件不存在，**静默继续**。不要提示缺失，也不要建议提前创建。`/domain-modeling` skill（经由 `/grill-with-docs` 和 `/improve-codebase-architecture` 触达）会在术语或决策真正确定时按需创建它们。

## 文件结构

Single-context 仓库（大多数仓库）：

```text
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

多 context 仓库（根目录存在 `CONTEXT-MAP.md`）：

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← 系统级决策
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context 级决策
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## 使用词汇表中的术语

当输出中出现领域概念（issue 标题、重构提案、假设、测试名称）时，使用 `CONTEXT.md` 中定义的术语，不要漂移到词汇表明确避免的同义词。

如果需要使用的概念还不在词汇表中，这是一个信号：要么你在发明项目不使用的语言（重新考虑），要么确实存在缺口（记录下来交给 `/domain-modeling`）。

## 标记 ADR 冲突

如果输出与现有 ADR 矛盾，明确指出来，而不是静默覆盖：

> _与 ADR-0007（event-sourced orders）矛盾，但值得重新讨论，因为……_

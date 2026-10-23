# 原 T1–T8 技术工作清单（历史）

状态：本页的分层执行顺序已于 2026-10-23 被用户批准的 [19 张纵向任务](./ticket-plan.md)取代。以下保留设计过程中的技术工作清单，不作为领取和执行任务的依据。

规格见 [`spec.md`](./spec.md)。当前任务顺序、验收、GitHub Issues 和阻塞关系统一见[纵向任务计划](./ticket-plan.md)。

## 总览

| ID  | 任务         | 依赖  | 主要产物                                      |
| --- | ------------ | ----- | --------------------------------------------- |
| T1  | 领域基础     | 无    | `shared/`、`domain/` 图形与文档模型、单元测试 |
| T2  | 命令基础设施 | T1    | `Command`、历史栈、执行器、上下文、测试       |
| T3  | 基础编辑命令 | T2    | create/delete/move/scale/set、测试            |
| T4  | 结构编辑命令 | T2    | group/ungroup/addto/front/back、测试          |
| T5  | 显示与帮助   | T2    | tree/show/help、格式化测试                    |
| T6  | SVG 读写     | T1    | XML 解析、读取子集、写出、往返测试            |
| T7  | CLI 与集成   | T2–T6 | 分词、命令表、REPL、脚本回放、端到端测试      |
| T8  | 报告与验收   | T1–T7 | 一致性自查、质量证据、报告定稿                |

## T1 领域基础

### 交付

- `src/shared/`：`DomainError`、错误码、数值解析与格式化。
- `src/domain/`：`Shape`、`LeafShape`、`Container`、`Group`、`Rect`、`Circle`、`Ellipse`、`Line`、`Text`、`ShapeParent`、`ShapeCollection`、`SvgDocument`、`ShapeFactory`、`GeometrySnapshot`。
- 一类一文件，文件名与类名一致；字段私有或只读。
- ESM 导入使用 `.js` 扩展名，符合 NodeNext 配置。
- `SvgDocument` 统一维护 id 索引和结构变更入口。

### 完成标准

- 六种图形可创建、移动、缩放、读写属性、输出 SVG 片段和 tree/show 文本。
- `Group.move`/`scale` 递归到全部子孙；删除子树后 id 索引中无残留。
- id 大小写敏感；重复 id 拒绝。
- `ShapeFactory` 是唯一的“类型名 → 类”入口。
- 数值边界按规格第 3、5 节执行。

### 验证

- 单元测试覆盖每种图形的 move/scale/set/快照恢复。
- 文档测试覆盖插入、移除、跨容器移动、删除/恢复子树、自动 id。
- 确认 `npm test` 能发现新增的 `*.test.ts`；若默认发现规则不覆盖 `.ts`，调整 `package.json` 的 test 脚本并记录。
- `npm run typecheck` 通过。

## T2 命令基础设施

### 交付

- `src/commands/Command.ts`、`CommandHistory.ts`、`CommandContext.ts`、`CommandInvoker.ts`。
- 命令分类：编辑、文档、显示、历史。
- 编辑命令接口包含 `execute`、`undo`、`redo`。

### 完成标准

- 成功的状态改变编辑命令进入 undo 栈；无操作不进入。
- 新编辑清空 redo；undo/redo 在栈空和 IO 锁定时给出规格中的错误。
- 文档命令成功后清空历史并锁定；下一次改变状态的编辑命令解锁并从空历史开始。
- 失败命令不改变文档和历史。
- 命令执行器是唯一决定“记录/封印”的位置。

### 验证

- 用假命令测试记录、撤销、重做、redo 清空、屏障、无操作。
- 失败命令前后文档树快照一致。

## T3 基础编辑命令

### 交付

- `CreateCommand`、`DeleteCommand`、`MoveCommand`、`ScaleCommand`、`SetCommand`。
- `create` 的 `in` 子句解析与工厂调用。
- 几何快照用于 move/scale 的精确撤销。

### 完成标准

- 输出消息与规格 6.1–6.5 一致。
- 每条命令成功、失败、撤销、重做、无操作都有测试。
- `create` 不按类型名分支；类型解析在 `ShapeFactory`。
- 删除容器时整棵子树一个撤销单元。

### 验证

- 命令测试 + 失败不改状态测试 + undo/redo 往返测试。

## T4 结构编辑命令

### 交付

- `GroupCommand`、`UngroupCommand`、`AddToCommand`、`FrontCommand`、`BackCommand`。
- 跨父级分组、首 id 锚点、命令行顺序、根级 ungroup 限制、成环校验。

### 完成标准

- 输出消息与规格 6.6–6.9 一致。
- `group` 整体一个撤销单元；undo 精确恢复各目标原父级和原索引。
- `ungroup` 子图形占据原容器位置；空容器允许解散；根级容器拒绝。
- `addto` 成环拒绝；已在末尾为无操作。
- `front`/`back` 只影响同级顺序，容器子树整体移动。

### 验证

- 结构命令测试 + 树快照前后对比 + 跨父级用例 + 成环错误用例。

## T5 显示与帮助

### 交付

- `TreeFormatter`、`ShowFormatter`、`HelpCommand`。
- `tree`、`show`、`help` 命令。

### 完成标准

- `tree` 根行、前缀、兄弟列对齐符合规格 5.5。
- `show` 的属性顺序和缩进符合规格 5.6。
- `help` 覆盖全部命令，不需要当前文档。
- 显示命令不进入历史。

### 验证

- 黄金输出测试：基础树、流程图、`tree <id>`、`show` 各类型。
- 无文档时 `help` 可用，其它显示命令报无文档错误。

## T6 SVG 读写

### 交付

- `src/io/`：`XmlParser`、XML 节点类、`SvgReader`、`SvgWriter`。
- 支持子集、自动补 id、警告、未知属性保留、原子读取。
- 写出格式、转义、属性顺序、元素计数。

### 完成标准

- 规格第 7、8 节全部行为。
- 缺 id 的文件按文档顺序补 id 并警告；显式重复 id 拒绝。
- `transform`、`style`、未知视觉元素、不匹配 `viewBox` 拒绝，当前文档不变。
- 读写往返后图形树、样式、未建模属性和显示输出一致。
- 不引入运行时依赖。

### 验证

- XML 词法/结构测试。
- 有效/无效 fixture 测试。
- 读写往返测试。
- 用浏览器或 VSCode SVG Preview 人工检查保存文件。

## T7 CLI 与集成

### 交付

- `src/cli/`：`LineTokenizer`、`CommandCatalog`、`CommandDispatcher`、`CliApplication`、`ConsoleOutput`。
- `main.ts` 装配。
- TTY/非 TTY 行为、注释、引号、错误输出。

### 完成标准

- 命令表是唯一的“命令名 → 实现”入口。
- 脚本模式下无提示符和横幅；交互模式有提示符和横幅。
- 错误统一 `error:` 前缀，进程不因领域错误退出。
- 规格第 11 节会话可原样回放。
- `npm run cli` 与构建后的 `npm start` 均可运行。

### 验证

- 分词器单元测试。
- 端到端脚本回放测试（临时目录保存文件）。
- `npm run check` 全绿。

## T8 报告与验收

### 交付

- 更新 `doc/README.md`：一致性自查、质量保证证据、过程记录。
- 更新 `CONTEXT.md` 中新增术语。
- 校对 PlantUML 图与实际目录/依赖。
- 汇总测试数量、覆盖范围和人工检查记录。

### 完成标准

- 实际目录与架构方案一致；不一致处记录修订理由。
- 依赖方向抽查无违规。
- 命令分派和图形工厂之外没有新增类型名/命令名分派。
- `npm run check`、`npm run cli`、`npm start`、脚本回放、SVG 往返全部有记录。
- 报告如实区分已验证与未验证内容。

### 验证

- 按报告“一致性自查”逐项检查并记录证据。
- 最终验收后创建并推送 `final` 标签。

## 提交计划

建议按以下粒度提交，保持历史可解释：

1. `docs: record design interview and architecture`
2. `feat(domain): add shape hierarchy and document model`
3. `feat(commands): add command history and basic edit commands`
4. `feat(commands): add structural edit commands`
5. `feat(display): add tree and show formatting`
6. `feat(io): add SVG reader and writer`
7. `feat(cli): add REPL, tokenizer and command catalog`
8. `test: add integration transcripts and round-trip fixtures`
9. `docs: finalize consistency check and quality evidence`

依赖目录、构建产物和凭据不得提交。

# SVG Editor · Lab1 Phase 1

高级软件开发技术课程作业：使用 TypeScript 和面向对象方式开发 SVG 命令行编辑器。

**当前状态：Ticket 01–18 已完成实现与验收。** CLI 已支持 REPL、注释、引号参数、`help`、`init`、读取支持子集并自动补 id 的 `read`、查询和修改画布尺寸的 `canvas`、`create rect/circle/ellipse/line/text/g`、`create … in <containerId>`、删除叶子或整棵子树的 `delete`、按原文档顺序跨父级收编已有图形的 `group`、解散嵌套容器的 `ungroup`、把已有图形或子树移到容器末尾的 `addto`、按同级绘制顺序把叶子或容器移到 `front`/`back`、对叶子或整棵容器的 `move`/`scale`、`set` 修改公共样式、几何属性或文本内容、嵌套 `tree`、`show`、`undo`、`redo`，以及把全部支持图形写出为 SVG 并复用当前路径的 `save`。外部 SVG 的缺 id 自动分配、元数据忽略、未建模属性有序保留和 `read`/`save`/`read` 往返已完成；Ticket 19 的全会话验收仍在计划中。实现顺序和验收标准见[纵向任务计划](doc/ticket-plan.md)。

## 项目资料

- [课程原始要求](phase_cli_1.md)：保留原文，作为需求依据。
- [课程报告与过程记录](doc/README.md)：架构方案、设计模式、依赖规则、变化点、访谈记录和自查。
- [需求规格](doc/spec.md)：命令语义、错误目录、SVG 支持子集和输出格式。
- [纵向任务计划](doc/ticket-plan.md)：已批准的 19 张任务、验收标准和 GitHub 阻塞关系。
- [原 T1–T8](doc/tasks.md)：历史技术工作清单。
- [领域词汇表](CONTEXT.md)：项目统一术语。
- [架构决策记录](docs/adr/)：零依赖、SVG 支持子集、IO 历史屏障、group 锚点与相对顺序、front/back 绘制顺序、Ticket 01 CLI 默认、Ticket 16 文件路径与 `save` 提交语义、Ticket 17 读取边界与 CDATA 规则，以及 Ticket 18 补 id、元数据与未建模属性边界。
- [智能体协作规则](AGENTS.md)：统一维护项目约束；[CLAUDE.md](CLAUDE.md) 为 Claude 入口。

## 环境与启动

使用 Node.js 24.x 和 npm。仓库中的 `.nvmrc` 可供 nvm 使用：

```bash
nvm use
npm ci
npm run cli
```

没有使用 nvm 时，直接安装 Node.js 24.x 即可。首次初始化已安装依赖；后续克隆或恢复环境时使用 `npm ci`，按 `package-lock.json` 安装固定版本。

## 开发命令

| 命令                   | 用途                                         |
| ---------------------- | -------------------------------------------- |
| `npm run cli`          | 使用 tsx 运行 TypeScript 入口                |
| `npm run typecheck`    | 严格检查源代码和测试代码的类型               |
| `npm run build`        | 编译源代码到 `dist/`                         |
| `npm start`            | 运行已编译的入口；需先构建                   |
| `npm test`             | 使用 Node.js 测试运行器执行测试，当前 129 个 |
| `npm run format`       | 格式化工程文件，排除课程原始要求             |
| `npm run format:check` | 检查文件格式                                 |
| `npm run check`        | 依次执行类型检查、格式检查、测试和构建       |

## 当前目录

```text
.
├── phase_cli_1.md          # 课程原始要求
├── README.md               # 环境与开发说明
├── CONTEXT.md              # 领域词汇表
├── doc/
│   ├── README.md           # 课程报告与过程记录
│   ├── spec.md             # 需求规格
│   ├── ticket-plan.md      # 已批准的纵向任务与 GitHub 索引
│   ├── tasks.md            # 原分层任务（历史）
│   ├── architecture.puml   # 模块依赖图
│   └── class-model.puml    # 类模型图
├── docs/
│   ├── adr/                # 架构决策记录
│   └── agents/             # 智能体协作约定
├── src/
│   ├── main.ts             # 组合根与启动入口
│   ├── cli/                # 分词、命令表、分发、REPL、输出
│   ├── commands/           # Command、历史、上下文、执行器和当前命令
│   ├── domain/             # Shape 层次、几何/属性快照、未建模属性、ShapeFactory、SvgDocument
│   ├── display/            # tree/show 格式化与显示宽度
│   ├── io/                 # XML 解析、id 分配、元数据策略、SvgReader、SvgWriter、XmlEscaper
│   └── shared/             # 领域错误、数值解析与格式化
├── test/
│   ├── cli/                # 分词与 CLI 回放
│   ├── commands/           # 命令分发、图形创建/删除/分组/归属移动/前后顺序/移动/缩放/属性更新、read/save、画布缩放、undo/redo、tree/show 和失败原子性
│   ├── io/                 # XML 词法/结构读取与测试
│   └── support/            # 共享的命令分发装配
├── package.json
├── package-lock.json       # 依赖版本锁定
├── tsconfig.json           # 源代码与测试的类型检查配置
└── tsconfig.build.json     # 仅构建 src/ 的配置
```

当前已落地 `shared/`、`domain/`、`display/`、`io/`、`commands/` 和 `cli/`。图形层次已实现 `Shape` → `LeafShape`/`Container`，包含五个叶子图形与 `Group`；`Shape` 统一封装公共样式、多态属性更新以及按 `id`、几何、样式、未建模属性顺序提供的 SVG 属性，文本图形额外提供 SVG 正文。`UnmodeledAttributes` 以不可变有序条目封装未知属性，使它们参与读写往返但不参与 `move`、`scale`、`set` 或显示。`ShapeAttributeSnapshot` 保存旧值或未设置状态。`move` 和 `scale` 通过多态几何操作和精确 `GeometrySnapshot` 支持叶子及整棵子树，并由 `SvgDocument` 对一次变换统一执行、失败时回滚。`delete` 由 `SvgDocument` 保存原父级和索引、释放整棵子树的 id 索引，再通过同一位置恢复。`group` 由 `SvgDocument` 一次批量摘出目标、按分组前文档先序顺序建立新容器，并用 `GroupSnapshot` 精确恢复各目标原父级和索引；`addto` 只用 `ShapePlacement` 调整现有子树的归属和同级顺序，不复制图形或几何。`front`/`back` 只在原父级内移到末尾/开头，容器内部顺序不变，并由 `ZOrderCommand` 的模板流程统一处理无操作、撤销和重做。`XmlParser` 用多态 XML 节点构建声明、实体、文本、CDATA 与嵌套结构；`SvgIdAllocator` 先收集显式 id 再按文档顺序补号；`ShapeFactory` 同时集中识别可忽略的 SVG 元数据元素；`SvgReader` 通过 `ShapeFactory` 构建临时文档，`ReadCommand` 只在全部校验成功后提交会话并输出警告；`SvgWriter` 通过图形多态递归写出嵌套容器和有序未建模属性。命令历史支持创建、删除、分组、归属移动、前后顺序、移动、缩放和属性更新的撤销/重做、redo 分支清空以及 `init`、`read`、带参数 `canvas` 和成功 `save` 建立的屏障。

生产运行依赖为空；开发工具包括 TypeScript、tsx、Node.js 类型声明和 Prettier。

## 开发与提交

使用 Git 分步记录需求、设计、实现和验证过程。功能实现的分支规则见 [AGENTS.md](AGENTS.md)。远程 `origin` 已配置为 [NQC233/svg-editor-lab1](https://github.com/NQC233/svg-editor-lab1)；配置存在不代表工作区内容已提交或推送。最终验收完成后，按课程要求在截止时间前创建并推送 `final` 标签。

## 工具文档

- [TypeScript：为 Node.js 选择编译选项](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [Node.js 24：测试运行器](https://nodejs.org/docs/latest-v24.x/api/test.html)

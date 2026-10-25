# SVG Editor · Lab1 Phase 1

高级软件开发技术课程作业：使用 TypeScript 和面向对象方式开发 SVG 命令行编辑器。

**当前状态：Ticket 01–03 已合入 `main`，Ticket 04 已实现并待 PR 合入。** CLI 已支持 REPL、注释、引号参数、`help`、`init`、无参数 `canvas`、根级 `create rect/circle/ellipse/line`、`tree`、`show`、`undo` 和 `redo`；文本、容器、SVG 读写和带参数 `canvas` 仍待后续票。实现顺序和验收标准见[纵向任务计划](doc/ticket-plan.md)。

## 项目资料

- [课程原始要求](phase_cli_1.md)：保留原文，作为需求依据。
- [课程报告与过程记录](doc/README.md)：架构方案、设计模式、依赖规则、变化点、访谈记录和自查。
- [需求规格](doc/spec.md)：命令语义、错误目录、SVG 支持子集和输出格式。
- [纵向任务计划](doc/ticket-plan.md)：已批准的 19 张任务、验收标准和 GitHub 阻塞关系。
- [原 T1–T8](doc/tasks.md)：历史技术工作清单。
- [领域词汇表](CONTEXT.md)：项目统一术语。
- [架构决策记录](docs/adr/)：零依赖、SVG 支持子集、IO 历史屏障、group 锚点规则和 Ticket 01 CLI 默认。
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

| 命令                   | 用途                                        |
| ---------------------- | ------------------------------------------- |
| `npm run cli`          | 使用 tsx 运行 TypeScript 入口               |
| `npm run typecheck`    | 严格检查源代码和测试代码的类型              |
| `npm run build`        | 编译源代码到 `dist/`                        |
| `npm start`            | 运行已编译的入口；需先构建                  |
| `npm test`             | 使用 Node.js 测试运行器执行测试，当前 27 个 |
| `npm run format`       | 格式化工程文件，排除课程原始要求            |
| `npm run format:check` | 检查文件格式                                |
| `npm run check`        | 依次执行类型检查、格式检查、测试和构建      |

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
│   ├── domain/             # Shape、Rect、Circle、Ellipse、Line、ShapeFactory、SvgDocument
│   ├── display/            # tree/show 格式化与显示宽度
│   └── shared/             # 领域错误、数值解析与格式化
├── test/
│   ├── cli/                # 分词与 CLI 回放
│   ├── commands/           # 命令分发、几何图形创建、undo/redo、tree/show 和失败原子性
│   └── support/            # 共享的命令分发装配
├── package.json
├── package-lock.json       # 依赖版本锁定
├── tsconfig.json           # 源代码与测试的类型检查配置
└── tsconfig.build.json     # 仅构建 src/ 的配置
```

当前已落地 `shared/`、`domain/`、`display/`、`commands/` 和 `cli/`。图形层次已实现 `Shape` → `Rect`、`Circle`、`Ellipse`、`Line`；命令历史已支持这四个叶子图形创建的撤销、重做、redo 分支清空和 `init` 屏障。文本、容器、`io/` 和其余编辑命令仍按 [doc/README.md](doc/README.md) 的模块划分在后续票中实现。

生产运行依赖为空；开发工具包括 TypeScript、tsx、Node.js 类型声明和 Prettier。

## 开发与提交

使用 Git 分步记录需求、设计、实现和验证过程。功能实现的分支规则见 [AGENTS.md](AGENTS.md)。远程 `origin` 已配置为 [NQC233/svg-editor-lab1](https://github.com/NQC233/svg-editor-lab1)；配置存在不代表工作区内容已提交或推送。最终验收完成后，按课程要求在截止时间前创建并推送 `final` 标签。

## 工具文档

- [TypeScript：为 Node.js 选择编译选项](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [Node.js 24：测试运行器](https://nodejs.org/docs/latest-v24.x/api/test.html)

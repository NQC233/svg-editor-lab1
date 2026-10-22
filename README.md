# SVG Editor · Lab1 Phase 1

高级软件开发技术课程作业：使用 TypeScript 和面向对象方式开发 SVG 命令行编辑器。

**当前状态：工程初始化。** CLI 入口仅输出启动信息并退出，尚未实现 REPL、命令、图形模型或 SVG 读写。业务需求与架构将在下一步讨论。

## 项目资料

- [课程原始要求](phase_cli_1.md)：保留原文，作为需求依据。
- [课程报告与过程记录](doc/README.md)：按作业要求维护。
- [智能体协作规则](AGENTS.md)：统一维护项目约束；[AGENT.md](AGENT.md) 与 [CLAUDE.md](CLAUDE.md) 为对应入口。

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
| `npm test`             | 使用 Node.js 测试运行器执行测试，目前为 0 个 |
| `npm run format`       | 格式化工程文件，排除课程原始要求             |
| `npm run format:check` | 检查文件格式                                 |
| `npm run check`        | 依次执行类型检查、格式检查、测试和构建       |

## 当前目录

```text
.
├── phase_cli_1.md          # 课程原始要求
├── README.md               # 环境与开发说明
├── doc/
│   └── README.md           # 课程报告与过程记录
├── src/
│   ├── main.ts             # 程序装配与启动入口
│   └── cli/
│       └── CliApplication.ts # 启动占位类
├── test/                   # 后续测试
├── package.json
├── package-lock.json       # 依赖版本锁定
├── tsconfig.json           # 源代码与测试的类型检查配置
└── tsconfig.build.json     # 仅构建 src/ 的配置
```

目前的目录只表达启动骨架。领域、命令、持久化等业务模块的划分与依赖方向待讨论后记录到课程报告。生产运行依赖暂为空，开发工具包括 TypeScript、tsx、Node.js 类型声明和 Prettier。

## 开发与提交

使用 Git 分步记录需求、设计、实现和验证过程。当前已建立本地 `main` 分支；远程仓库地址尚未提供，暂未配置和推送。最终验收完成后，按课程要求在截止时间前创建并推送 `final` 标签。

## 工具文档

- [TypeScript：为 Node.js 选择编译选项](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [Node.js 24：测试运行器](https://nodejs.org/docs/latest-v24.x/api/test.html)

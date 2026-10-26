# SVG Editor · Lab1 Phase 1

使用 TypeScript 和面向对象方式实现的 SVG 命令行编辑器，作为高级软件开发技术课程作业。通过命令创建图形、组织嵌套分组、编辑属性，并保存为可在浏览器中打开的 SVG 文件。

## 功能

- 支持矩形、圆、椭圆、直线、文本和分组容器，以唯一且大小写敏感的 id 定位图形。
- 支持创建、删除、平移、等比缩放、属性修改、分组与解散、容器归属调整和同级绘制顺序调整；容器可整体操作。
- 编辑命令支持逐步撤销与重做，失败时保持文档和历史不变。
- 支持 SVG 读写、缺失 id 自动补全和未建模属性保留，以及结构树和属性明细查看。
- 支持交互式终端与标准输入脚本，接受注释和带空格的引号参数。

本阶段只处理[需求规格](doc/spec.md#7-svg-读取子集)定义的 SVG 子集；`transform`、`style`、未知视觉元素和不匹配的 `viewBox` 会被拒绝。`box` 复合图形和插件机制属于后续阶段。

## 快速启动

环境要求：Node.js 24.x、npm。使用 nvm 时可通过仓库内的 `.nvmrc` 切换版本：

```bash
nvm use
npm ci
npm run cli
```

未使用 nvm 时，安装 Node.js 24.x 后执行后两条命令即可。进入交互终端后，输入 `help` 查看全部命令，按 `Ctrl+D` 结束会话。

也可以构建后运行：

```bash
npm run build
npm start
```

## 使用示例

在编辑器中依次输入以下命令，创建一个包含矩形和文字的分组，移动整组并撤销、重做，最后保存：

```text
init 400 200
create g node
create rect box 40 60 140 60 #4a90d9 in node
create text label 65 95 "Hello SVG" in node
move node 20 0
undo
redo
tree
save demo.svg
```

`demo.svg` 保存在进程当前工作目录，可以直接用浏览器打开。运行 `read demo.svg` 可继续编辑；读取后，`save` 不带参数会保存到当前文件路径。

脚本模式可将命令逐行保存后通过标准输入回放：

```bash
npm run cli < commands.txt
```

`#` 开头的行是注释，文本参数可以用双引号包含空格。编辑命令一次对应一个撤销单元；成功执行 `init`、`read`、`save` 或修改尺寸的 `canvas` 会建立历史屏障，直到下一次实际改变状态的编辑命令执行后才能再次撤销、重做。

## 命令概览

| 分类       | 命令                                         |
| ---------- | -------------------------------------------- |
| 文档与画布 | `init`、`read`、`save`、`canvas`             |
| 图形编辑   | `create`、`delete`、`move`、`scale`、`set`   |
| 结构与顺序 | `group`、`ungroup`、`addto`、`front`、`back` |
| 查看与帮助 | `tree`、`show`、`help`                       |
| 编辑历史   | `undo`、`redo`                               |

具体参数、容器规则和错误信息见[完整命令规格](doc/spec.md#6-命令规格)。

## 架构与文档

项目采用 Command 模式组织编辑与撤销，使用统一的图形层次表达 Composite 语义；领域模型、SVG 读写、显示和终端交互分层实现。生产运行依赖为空。

- [课程报告](doc/README.md)：模块职责、依赖图、类模型图、设计模式、过程记录和质量保证。
- [需求规格](doc/spec.md)：命令语义、SVG 支持范围及验收示例。
- [架构决策](doc/adr/)与[领域词汇表](CONTEXT.md)：设计取舍和统一术语。
- [课程原始要求](phase_cli_1.md)：保留原文的课程说明。
- [测试说明](test/README.md)：测试布局与验收重点。
- [协作规则](AGENTS.md)：项目维护约定。

## 开发与验证

| 命令                   | 用途                                    |
| ---------------------- | --------------------------------------- |
| `npm run cli`          | 使用 tsx 运行开发入口                   |
| `npm run typecheck`    | 严格检查源码和测试类型                  |
| `npm test`             | 执行单元、命令、SVG 往返和 CLI 回放测试 |
| `npm run build`        | 编译源码到 `dist/`                      |
| `npm start`            | 运行构建后的入口                        |
| `npm run format`       | 格式化工程文件，排除课程原始要求        |
| `npm run format:check` | 检查文件格式                            |
| `npm run check`        | 依次执行类型检查、格式检查、测试和构建  |

## 项目结构

```text
.
├── README.md             # 项目介绍与使用说明
├── phase_cli_1.md        # 课程原始要求
├── CONTEXT.md            # 领域词汇表
├── doc/                  # 课程报告、规格、设计与过程记录
│   ├── README.md         # 课程报告入口
│   ├── adr/              # 架构决策记录
│   ├── agents/           # 智能体协作说明
│   ├── images/           # 图表图片与再生成说明
│   ├── architecture.puml # 模块依赖图源文件
│   └── class-model.puml  # 类模型图源文件
├── src/
│   ├── main.ts           # 依赖装配与启动入口
│   ├── cli/              # 分词、命令分发、REPL 与终端输出
│   ├── commands/         # 命令对象、执行器、上下文与撤销历史
│   ├── domain/           # 图形层次、文档结构、工厂与快照
│   ├── display/          # 结构树与属性格式化
│   ├── io/               # XML 解析与 SVG 读写
│   └── shared/           # 错误与数值工具
└── test/                 # 领域、命令、读写与 CLI 测试
```

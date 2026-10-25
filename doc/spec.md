# SVG 编辑器 Phase 1 需求规格

状态：设计决策已确认；Ticket 01 相关补充默认已由 ADR-0005 采纳；Ticket 03 的无操作历史规则、create 撤销摘要、group 相对顺序和 front/back 绘制顺序已收口；Ticket 01–15 已实现，其中 Ticket 03 通过 PR #23、Ticket 04 通过 PR #25、Ticket 05 通过 PR #27、Ticket 06 通过 PR #29、Ticket 08 通过 PR #31 合入 `main`；Ticket 09–15 于 2026-10-25 完成本地验收。

本文件是实现与验收的共同依据。课程原始要求见 [`phase_cli_1.md`](../phase_cli_1.md)，领域术语见 [`CONTEXT.md`](../CONTEXT.md)，模块与依赖方案见 [`README.md`](./README.md)，实现顺序见[纵向任务计划](./ticket-plan.md)。

## 1. 范围

本阶段实现：

- 六种内置类型：`rect`、`circle`、`ellipse`、`line`、`text`、`g`。
- 以 id 寻址的编辑命令、容器与叶子统一的 Composite 语义。
- Command 模式、撤销/重做、一次编辑命令一个撤销单元。
- CLI REPL、注释、双引号参数、脚本回放。
- 支持子集内的 SVG 读写与往返。

本阶段不做：

- `box` 复合图形、ShapeProvider、插件加载。
- `<g transform>`、任意 `viewBox` 缩放、`style` 属性、未知视觉元素。
- 活动内容：`on*` 事件属性、`<script>`、外部样式表处理指令。
- 鼠标、agent 等其它交互通道。
- 把 `title`、`desc`、`metadata` 写回文件。

## 2. 补充默认

以下细节课程未逐条规定，本设计按下列方式确定。除已由 ADR 采纳的条目外，它们仍属于待后续票收口的设计默认。

- `read` 遇到重复 id：拒绝整份文件，报 `id already exists: <id>`。
- `read` 中缺失的位置属性取 SVG 默认值 `0`；缺失的尺寸属性（rect 的宽高、circle 的 r、ellipse 的 rx/ry）报错。
- `text` 的 `font-size` 等属性属于未建模属性：读写往返保留，不参与 `scale`，不能用 `set` 修改，也不在 `tree`/`show` 中显示。
- 无操作规则适用于所有编辑命令：`move 0 0`、`scale 1`、`set` 写入相同值、`addto` 已在末尾、边界上的 `front`/`back` 都成功返回、不进入历史、不清空 redo、不解除历史屏障。（已由 [ADR-0003](../docs/adr/0003-io-history-barrier.md) 采纳）
- CLI 的提示符和启动横幅只在标准输入是 TTY 时输出；结果和错误都写标准输出，保持 transcript 顺序。（已由 [ADR-0005](../docs/adr/0005-ticket-01-cli-defaults.md) 采纳）
- 文件按 UTF-8 读取和写出；相对路径相对于进程当前工作目录。
- `init` 直接丢弃当前文档，不询问确认。（已由 [ADR-0005](../docs/adr/0005-ticket-01-cli-defaults.md) 采纳）

## 3. 通用约定

### 3.1 坐标系与数值

- 坐标原点在左上角，x 向右，y 向下，单位 px。
- 允许浮点数；所有数值必须有限，拒绝 `NaN`、`Infinity`、空串、单位、百分比和十六进制。
- 数字格式接受可选符号、小数和科学计数法，例如 `10`、`-2.5`、`.5`、`5.`、`1e3`。
- 读取属性值时先去掉首尾空白，再做数值解析。
- 输出数值使用 JavaScript 的最短往返十进制表示；`-0` 输出为 `0`。

### 3.2 id

- id 非空、不含空白字符、大小写敏感。
- 所有图形必须有唯一 id；画布没有 id。
- 自动补 id 只发生在 `read` 缺失 id 时，格式为 `<标签名><序号>`，例如 `rect1`。

### 3.3 输出与错误

- 成功反馈一行一条，编辑类命令回显结果摘要。
- 错误统一一行，格式为 `error: <message>`；失败不改变文档、路径或历史。
- `read` 的自动补 id 使用 `warning: assigned id <id> to unnamed <tag>`，警告不阻止读取。
- 除 `init`、`read`、`help` 外，所有命令都要求当前文档；没有时报 `no document. use 'init' or 'read' first`。

### 3.4 命令分类

| 类别 | 命令                                                                            | 进入历史               |
| ---- | ------------------------------------------------------------------------------- | ---------------------- |
| 编辑 | `create` `delete` `move` `scale` `set` `group` `ungroup` `addto` `front` `back` | 改变状态时进入         |
| 文档 | `init` `read` `save` `canvas <w> <h>`                                           | 否；成功后建立历史屏障 |
| 显示 | `canvas` `tree` `show` `help`                                                   | 否                     |
| 历史 | `undo` `redo`                                                                   | 否                     |

## 4. CLI 输入输出

### 4.1 REPL

- 启动时在 TTY 输出 `svg-editor 0.1 — type 'help' for commands`。
- 提示符为 `svg> `；只在 TTY 输出。
- 逐行读取标准输入；EOF（Ctrl-D）正常退出。
- 空行和注释行忽略。
- 不提供 `exit`/`quit` 命令。

### 4.2 分词

- 以空白分隔参数。
- 双引号包裹的 token 保留内部空格；支持 `\"` 和 `\\` 转义，其它反斜杠按字面保留。
- 空的双引号 `""` 是合法 token。
- 行首（允许前导空白）为 `#` 的行是注释；其它位置的 `#` 是普通字符，因此 `#4a90d9` 可作为颜色参数。
- 未闭合的双引号报 `unterminated quoted string`，该行不执行。
- 命令名大小写敏感，仅接受小写。

### 4.3 输出流

- 结果、警告和错误都写标准输出。
- 交互模式下每条结果前显示提示符；脚本模式下不显示提示符和启动横幅，便于回放。

## 5. 图形模型与属性

### 5.1 公共属性

所有图形都可有 `fill`、`stroke`、`stroke-width`。未设置时不写该属性，外观遵循 SVG 默认。

- `fill`、`stroke` 非空字符串；允许颜色名、`#rrggbb`、`none` 等，不做颜色语法校验。
- `stroke-width` 为有限且 `>= 0` 的数。

### 5.2 几何属性

| 类型    | 几何属性         | `create` 参数          | 约束                      |
| ------- | ---------------- | ---------------------- | ------------------------- |
| rect    | x y width height | `x y w h [fill]`       | width、height > 0         |
| circle  | cx cy r          | `cx cy r [fill]`       | r > 0                     |
| ellipse | cx cy rx ry      | `cx cy rx ry [fill]`   | rx、ry > 0                |
| line    | x1 y1 x2 y2      | `x1 y1 x2 y2 [stroke]` | 坐标有限                  |
| text    | x y content      | `x y "content"`        | x、y 有限；content 可为空 |
| g       | 无几何属性       | 无                     | 可包含子图形              |

坐标类属性可为负数。`rect`、`circle`、`ellipse` 的尺寸不能为 0。

### 5.3 `set` 白名单

| 类型     | 可设置属性                     |
| -------- | ------------------------------ |
| 所有类型 | `fill` `stroke` `stroke-width` |
| rect     | `x` `y` `width` `height`       |
| circle   | `cx` `cy` `r`                  |
| ellipse  | `cx` `cy` `rx` `ry`            |
| line     | `x1` `y1` `x2` `y2`            |
| text     | `x` `y` `text`                 |
| g        | 仅公共属性                     |

白名单外报 `unknown attribute: <attr>`。设置值先校验后写入；失败不改变图形。

### 5.4 move 与 scale

- `move` 是增量平移。叶子平移自身坐标；`g` 递归平移全部子孙。
- `scale` 的因子必须为正数。所有建模几何属性乘以因子：
  - rect：x、y、width、height；
  - circle：cx、cy、r；
  - ellipse：cx、cy、rx、ry；
  - line：x1、y1、x2、y2；
  - text：x、y；
  - g：递归到全部子孙。
- `stroke-width` 和未建模属性不参与 `scale`。
- 缩放以画布原点为基准，因为每个坐标都乘以因子。

### 5.5 tree 格式

- 根行：`svg (<w>x<h>)`。
- 树前缀使用 `├── `、`└── `、`│   `、`    `。
- 同一组兄弟的属性列对齐：标签补齐到该组最长标签宽度再加两个空格；没有属性时不补尾随空格。
- 叶子行：

| 类型    | 格式                                       |
| ------- | ------------------------------------------ |
| rect    | `rect#id  x=… y=… w=… h=… [fill=…]`        |
| circle  | `circle#id  cx=… cy=… r=… [fill=…]`        |
| ellipse | `ellipse#id  cx=… cy=… rx=… ry=… [fill=…]` |
| line    | `line#id  (x1,y1) -> (x2,y2)`              |
| text    | `text#id  (x,y) "content"`                 |
| g       | `g#id`；不内联属性                         |

- `tree <id>` 以该图形为根：根行使用图形自己的行，不带 `svg` 行，再递归子树。
- text 的内容在 tree 中用双引号包裹；内部双引号、反斜杠和换行按 JSON 字符串转义。

### 5.6 show 格式

第一行：`<type>#<id>  parent=<parent>`，`parent` 为 `svg` 或 `g#<id>`。

后续行缩进两个空格，按顺序输出：

1. 几何属性（完整属性名，例如 `width=`、`height=`）；
2. text 的 `text="<content>"`；
3. 已设置的 `fill`、`stroke`、`stroke-width`。

未建模属性不显示。

text 内容的引号和转义规则与 tree 相同。

## 6. 命令规格

### 6.1 create

语法：

```text
create <type> <id> [params…] [in <containerId>]
```

- `type` 为六种内置类型之一；其它类型报 `unknown shape type: <type> (is the plugin loaded?)`。
- `id` 必填且唯一；重复报 `id already exists: <id>`。
- `in` 是可选的尾缀，必须由未加引号的 `in` 加一个容器 id 组成；容器必须存在且为 `g`。缺失报 `no such container: <id>`，不是容器报 `not a container: <id>`。未加引号的 `in` 是保留后缀关键字：若没有紧跟容器 id，则报 `usage:`；要把字面值 `in` 用作 fill、stroke 或 text 内容时必须加双引号。
- 新图形追加到目标容器（或画布）的最后一个子节点。
- 输出：`<type>#<id> created`，或 `<type>#<id> created in g#<containerId>`。
- 撤销：删除该图形及其子树；重做：插回原位置。

失败场景：参数个数或格式错误（`usage:`）、非法数值、非法 id、未知类型、重复 id、`in` 目标错误。

### 6.2 delete

语法：`delete <id>`。

- 删除图形及其全部子孙；容器与叶子一视同仁。
- 输出：`<type>#<id> deleted`。
- 撤销：把整棵子树放回原父级和原位置，输出 `<type>#<id> restored into <parent>`，`parent` 为 `svg` 或 `g#<id>`。
- 重做：再次删除。
- 图形不存在报 `no such shape: <id>`。

### 6.3 move

语法：`move <id> <dx> <dy>`。

- `dx`、`dy` 为有限数，可为负。
- 叶子按自身坐标移动；`g` 递归移动全部子孙。
- 输出：
  - 叶子：`<type>#<id> moved to (<x>,<y>)`，坐标是移动后的锚点（rect 的 x/y，circle/ellipse 的 cx/cy，line 的 x1/y1，text 的 x/y）。
  - 容器：`g#<id> moved by (<dx>,<dy>)`。
- 撤销：精确恢复移动前的几何；叶子输出 `<type>#<id> moved back to (<x>,<y>)`，容器输出 `g#<id> moved back by (<-dx>,<-dy>)`。
- `dx = dy = 0` 是无操作：输出 `<type>#<id> unchanged`，不进入历史。
- 容器子树没有可移动叶子（例如空 `g`）时，非零增量同样是无操作：输出 `g#<id> unchanged`，不进入历史。容器只修改子孙叶子的建模坐标，自身没有独立几何。

### 6.4 scale

语法：`scale <id> <factor>`。

- `factor` 必须是有限正数；非数字报 `invalid number: <value>`，数值 `<= 0` 报 `scale factor must be positive`。
- 按 5.4 的规则缩放。
- 输出：`<type>#<id> scaled by <factor>`。
- 撤销：精确恢复缩放前的几何，输出 `<type>#<id> scale restored`。
- `factor = 1` 是无操作：输出 `<type>#<id> unchanged`，不进入历史。

### 6.5 set

语法：`set <id> <attr> <value>`。

- 属性必须在 5.3 白名单内；否则 `unknown attribute: <attr>`。
- 值按 5.2 和 5.1 的规则校验；非法数值报 `invalid number: <value>` 或对应的正数/非负错误。
- 输出：`<type>#<id> updated: <attr>=<value>`；text 的内容使用 `text="<content>"` 形式。
- 撤销：恢复旧值；旧值不存在时输出 `<attr>=(unset)` 并移除该属性。
- 写入相同值是无操作：输出 `<type>#<id> unchanged`，不进入历史。

### 6.6 group

语法：`group <newGid> <id1> <id2>…`。

- 至少一个目标 id；`newGid` 必须唯一。
- 目标 id 不能重复；重复时报 `duplicate target: <id>`。
- 所有目标必须存在。
- 目标集合中不能同时包含某个容器和它的子孙；否则报 `cannot group a container into its own descendant: <容器id>`。若有多个，报命令顺序中第一个包含其它目标的容器。
- 新容器的父级和插入位置取**第一个命令行目标**分组前的父级和位置；其余目标从各自原父级摘出。
- 新容器的子节点保持分组前的文档相对顺序：同一父级沿用原兄弟顺序，跨父级按整棵文档树的先序遍历顺序排列。参数顺序不改变子节点顺序；例如原同级为 `a,b` 时，`group g b a` 的子节点仍是 `a,b`。
- 允许跨父级分组，也允许只列一个目标。
- 输出：`g#<newGid> created with <n> children`。
- 撤销：删除新容器，把各目标按原父级和原索引恢复；输出 `g#<newGid> removed; <n> children restored`。
- 重做：重新插入容器并按分组前的文档相对顺序收编目标。

### 6.7 ungroup

语法：`ungroup <gid>`。

- 目标必须存在且为容器；叶子报 `not a container: <id>`。
- 目标是画布的直接子节点时，按课程要求拒绝：`cannot ungroup top-level container: <id>`。
- 子图形按原顺序插入到容器原来的位置；子图形的 id 和子树不变。
- 空容器允许解散，效果是删除该容器。
- 输出：`g#<gid> ungrouped: <n> children`。
- 撤销：重新创建/插回原容器并收编子图形；输出 `g#<gid> restored with <n> children`。
- 复合图形（未来 `box`）报 `cannot ungroup composite shape: <id>`；本阶段不可达。

### 6.8 addto

语法：`addto <gid> <id>`。

- 目标容器必须存在且为 `g`；缺失报 `no such container: <id>`，不是容器报 `not a container: <id>`。
- 图形必须存在。
- 目标不能是图形自身，也不能在图形的子树内；否则报 `cannot move a container into its own descendant: <图形id>`。
- 图形已是目标的最后一个子节点时是无操作：输出 `<type>#<id> unchanged`，不进入历史。
- 否则摘出并追加到目标末尾。
- 输出：`<type>#<id> added to g#<gid>`。
- 撤销：放回原父级和原位置，输出 `<type>#<id> moved back to <parent>`。
- 重做：再次追加到目标末尾。

### 6.9 front / back

语法：`front <id>` / `back <id>`。

- 在同一父级内移动；容器连同整棵子树移动，子树内部顺序不变。
- 父级子节点数组索引 `0` 对应最先绘制，即 `back`；末尾索引对应最后绘制，即 `front`。`tree` 顺序与绘制顺序一致。
- `front` 移到同级末尾，`back` 移到同级开头。
- 已在最前/最后时是无操作：输出 `<type>#<id> is already at front` 或 `... is already at back`，不进入历史。
- 输出：`<type>#<id> moved to front` 或 `... moved to back`。
- 撤销：移回原索引，输出 `<type>#<id> moved back`。
- 重做：再次移到最前/最后。

### 6.10 undo / redo

语法：`undo` / `redo`，不接受参数。

- 先检查当前文档；没有文档时报 `no document. use 'init' or 'read' first`。
- 历史屏障锁定时统一报 `undo not allowed after io command`。
- 栈空时报 `nothing to undo` / `nothing to redo`。
- `undo` 调用最近编辑命令的撤销逻辑，打印该命令的撤销摘要；`redo` 调用重做逻辑，打印该命令的重做摘要。
- 新的改变状态的编辑命令清空 redo 栈。
- `undo`/`redo` 自身不进入历史。

### 6.11 init

语法：`init [w] [h]`。

- 无参数使用 800×600。
- 两个参数必须是有限正数；只给一个报 `init requires both width and height`。
- 新建空文档，替换当前文档；当前路径为空；成功后建立历史屏障。
- 输出：`canvas <w>x<h> created`。
- 不询问确认，不保留旧文档。

### 6.12 read

语法：`read <file.svg>`。

- 恰好一个参数；路径可带空格（用双引号）。
- 按 UTF-8 读取，解析支持子集，构建新文档；成功后才替换当前文档，并把当前路径设为该文件。
- 输出：自动补 id 的 `warning:` 行（按文档顺序），然后 `read <path> (<n> elements)`。
- 失败时不改变当前文档、当前路径和历史。
- 失败时不输出补 id 警告。
- 成功后建立历史屏障。
- 失败消息见第 10 节。

### 6.13 save

语法：`save [file.svg]`。

- 路径取参数；无参数时取当前路径。两者都没有时报 `no file path; use save <file.svg>`。
- 按 UTF-8 写出，覆盖已有文件；不询问确认。
- 成功时把当前路径更新为写入路径，并建立历史屏障。
- 输出：`saved to <path> (<n> elements)`。
- 失败时不改变路径和历史。

### 6.14 canvas

语法：`canvas [w] [h]`。

- 无参数：显示 `canvas <w>x<h>`，属于显示命令，不影响历史。
- 两个参数：必须是有限正数；修改画布宽高；不移动、不删除图形；成功后建立历史屏障；输出 `canvas resized to <w>x<h>`。
- 只给一个参数报 `canvas requires both width and height`。

### 6.15 tree

语法：`tree [id]`。

- 无参数显示整份文档，根行 `svg (<w>x<h>)`。
- 有参数只显示以该 id 为根的子树。
- 格式见 5.5。
- 不进入历史。

### 6.16 show

语法：`show <id>`。

- 显示单个图形，格式见 5.6。
- 不进入历史。

### 6.17 help

语法：`help`。

- 显示全部命令及语法，按文档、编辑、显示、历史分组。
- 不需要当前文档。
- 不进入历史。

## 7. SVG 读取子集

### 7.1 根元素

- 根必须是 `<svg>`。
- 必须有有限正数的 `width`、`height`。
- `viewBox` 可省略；存在时按 SVG 数值列表解析（逗号或空白分隔），四个数必须恰好等于 `0 0 <width> <height>`。不匹配报 `unsupported viewBox: <value>`；格式错误报 `invalid viewBox: <value>`。
- 接受 `xmlns="http://www.w3.org/2000/svg"` 或省略 `xmlns`；`version` 忽略。
- 根上的 `transform`、`style` 拒绝；其它未知根属性忽略。

### 7.2 元素

支持：`rect`、`circle`、`ellipse`、`line`、`text`、`g`。

忽略：`title`、`desc`、`metadata` 及其整个子树；XML 声明、注释、CDATA。

XML 声明以外的处理指令拒绝，报 `invalid SVG: processing instruction is not supported`。

其它元素（例如 `path`、`polygon`、`defs`、`style`、`use`、`tspan`）报 `unsupported element: <tag>`。

`text` 只接受直接文本和 CDATA；`title`/`desc`/`metadata` 子元素忽略；出现其它子元素报 `unsupported element: <tag>`。

除 `text` 外，`svg`、`g` 和叶子元素的直接文本只允许空白并忽略；非空白文本报 `invalid SVG: unexpected text in <tag>`。`text` 的直接文本是内容。叶子元素只能包含可忽略的元数据子元素，出现其它子元素报 `unsupported element: <tag>`。

### 7.3 属性

- 已知属性按第 5 节解析。
- `transform` 报 `unsupported transform on <tag>`。
- `style` 报 `unsupported attribute: style`。
- 以 `on` 开头的属性（事件处理器）拒绝，报 `unsupported attribute: <attr>`。
- 其它未知属性保留为未建模属性，写回时原样输出；不参与命令，不显示。
- `id` 缺失或为空字符串时自动分配并警告；显式重复 id 报 `id already exists: <id>`；含空白字符的 id 报 `invalid id: <value>`。
- 位置属性缺失取默认值 0；尺寸属性缺失报对应的正数错误。

### 7.4 自动补 id

1. 先遍历全部图形元素，收集显式 id；重复即拒绝。
2. 再按文档顺序为缺失 id 的元素分配 `<tag><n>`：n 从 1 开始，选第一个未被显式或已分配 id 使用的值，大小写敏感。
3. 每个分配输出一行 `warning: assigned id <id> to unnamed <tag>`。

### 7.5 原子性

`read` 先构建完整的新文档；解析、校验、id 分配全部成功后才替换当前文档。任何错误都不改变当前文档、路径和历史。

### 7.6 元素计数

`read`/`save` 的 `(n elements)` 统计全部图形节点（含 `g`），不含根 `<svg>`，不含被忽略的元数据元素。

## 8. SVG 写出

- 第一行 `<?xml version="1.0" encoding="UTF-8"?>`。
- 根元素：

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
```

- 每层缩进两个空格。
- 属性顺序：`id`、几何属性、`fill`、`stroke`、`stroke-width`、未建模属性（按读取时的顺序）。
- 叶子自闭合；空容器写成 `<g id="…"/>`；`text` 始终写成 `<text …>content</text>`。
- 文本和属性值做 XML 转义（`&amp;`、`&lt;`、`&gt;`、`&quot;`）。
- `viewBox` 始终写成 `0 0 <width> <height>`。
- 不写 `title`、`desc`、`metadata`、`transform`、`style`。
- 成功写出后当前路径更新为写入路径。
- 文件以换行结尾。

## 9. 撤销与历史

- 一条成功的、改变状态的编辑命令是一个撤销单元。
- 无操作命令成功返回，但不记录历史，也不清空 redo、不解除历史屏障。
- 失败命令不改变文档，不记录历史。
- 文档命令成功后清空 undo/redo 并锁定；下一次改变状态的编辑命令解锁并从空历史开始。
- `undo`/`redo` 在锁定或栈空时报错。
- 显示命令不改变历史。
- `group`、`ungroup`、`delete`、`create` 等结构操作整体是一个撤销单元。
- `undo`/`redo` 的摘要来自被撤销/重做命令自己的消息。
- `create` 的撤销摘要固定为 `<type>#<id> removed`；`deleted` 只用于 `delete` 命令的删除摘要。

撤销/重做输出：

| 命令       | `undo` 输出                                                        | `redo` 输出                            |
| ---------- | ------------------------------------------------------------------ | -------------------------------------- |
| create     | `<type>#<id> removed`                                              | 原 `create` 输出                       |
| delete     | `<type>#<id> restored into <parent>`                               | `<type>#<id> deleted`                  |
| move       | 叶子 `moved back to (x,y)`；容器 `moved back by (-dx,-dy)`         | 原 `move` 输出                         |
| scale      | `<type>#<id> scale restored`                                       | `<type>#<id> scaled by <factor>`       |
| set        | `<type>#<id> updated: <attr>=<old>`；旧值不存在时 `<attr>=(unset)` | 原 `set` 输出                          |
| group      | `g#<newGid> removed; <n> children restored`                        | `g#<newGid> created with <n> children` |
| ungroup    | `g#<gid> restored with <n> children`                               | `g#<gid> ungrouped: <n> children`      |
| addto      | `<type>#<id> moved back to <parent>`                               | `<type>#<id> added to g#<gid>`         |
| front/back | `<type>#<id> moved back`                                           | `<type>#<id> moved to front`/`back`    |

## 10. 错误消息目录

| 触发                                  | 输出                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 未 `init`/`read` 就执行需要文档的命令 | `error: no document. use 'init' or 'read' first`                                                    |
| id 已存在                             | `error: id already exists: <id>`                                                                    |
| id 不存在                             | `error: no such shape: <id>`                                                                        |
| `in`/`addto` 目标不存在               | `error: no such container: <id>`                                                                    |
| 目标不是容器                          | `error: not a container: <id>`                                                                      |
| 未知图形类型                          | `error: unknown shape type: <type> (is the plugin loaded?)`                                         |
| group 目标含容器与其子孙              | `error: cannot group a container into its own descendant: <id>`                                     |
| group 目标 id 重复                    | `error: duplicate target: <id>`                                                                     |
| addto 目标在图形子树内                | `error: cannot move a container into its own descendant: <id>`                                      |
| ungroup 复合图形                      | `error: cannot ungroup composite shape: <id>`                                                       |
| ungroup 根级容器                      | `error: cannot ungroup top-level container: <id>`                                                   |
| scale 因子非正                        | `error: scale factor must be positive`                                                              |
| 文件读失败                            | `error: cannot read file: <path>`                                                                   |
| 文件写失败                            | `error: cannot write file: <path>`                                                                  |
| IO 后撤销/重做                        | `error: undo not allowed after io command`                                                          |
| undo 栈空                             | `error: nothing to undo`                                                                            |
| redo 栈空                             | `error: nothing to redo`                                                                            |
| 未知命令                              | `error: unknown command: <name>`                                                                    |
| 未知属性                              | `error: unknown attribute: <attr>`                                                                  |
| 非法数值                              | `error: invalid number: <value>`                                                                    |
| 非法 id                               | `error: invalid id: <value>`                                                                        |
| rect 宽/高非正                        | `error: rect width must be positive` / `error: rect height must be positive`                        |
| circle 半径非正                       | `error: circle r must be positive`                                                                  |
| ellipse 半径非正                      | `error: ellipse rx must be positive` / `error: ellipse ry must be positive`                         |
| stroke-width 为负                     | `error: stroke-width must be non-negative`                                                          |
| fill/stroke 为空                      | `error: fill must not be empty` / `error: stroke must not be empty`                                 |
| save 无路径                           | `error: no file path; use save <file.svg>`                                                          |
| init/canvas 参数个数错误              | `error: init requires both width and height` / `error: canvas requires both width and height`       |
| init/canvas 尺寸非正                  | `error: init width and height must be positive` / `error: canvas width and height must be positive` |
| 未闭合引号                            | `error: unterminated quoted string`                                                                 |
| 未知元素                              | `error: unsupported element: <tag>`                                                                 |
| 不支持的属性                          | `error: unsupported attribute: <attr>`                                                              |
| transform                             | `error: unsupported transform on <tag>`                                                             |
| viewBox 不匹配                        | `error: unsupported viewBox: <value>`                                                               |
| viewBox 格式错误                      | `error: invalid viewBox: <value>`                                                                   |
| 根尺寸缺失/非法                       | `error: svg root width and height must be positive numbers`                                         |
| XML 格式错误                          | `error: invalid SVG: <detail>`                                                                      |
| 非空白直接文本                        | `error: invalid SVG: unexpected text in <tag>`                                                      |
| DOCTYPE                               | `error: invalid SVG: DOCTYPE is not supported`                                                      |
| 非 XML 声明的处理指令                 | `error: invalid SVG: processing instruction is not supported`                                       |
| 参数个数/语法错误                     | `error: usage: <syntax>`                                                                            |

`<...>` 是占位符；实际输出替换为对应的 id、属性名、标签名或数值，不保留尖括号。

## 11. 验收样例

### 11.1 基础会话

```text
svg> init 800 600
canvas 800x600 created
svg> create rect bg 0 0 800 600 #ffffff
rect#bg created
svg> create text title 20 40 "My Diagram"
text#title created
svg> create circle c1 100 100 20 red
circle#c1 created
svg> create rect box 200 80 60 60 #3366ff
rect#box created
svg> group markers c1 box
g#markers created with 2 children
svg> move c1 30 0
circle#c1 moved to (130,100)
svg> undo
circle#c1 moved back to (100,100)
svg> redo
circle#c1 moved to (130,100)
svg> set title text "My Diagram v2"
text#title updated: text="My Diagram v2"
svg> undo
text#title updated: text="My Diagram"
svg> delete box
rect#box deleted
svg> undo
rect#box restored into g#markers
svg> save demo.svg
saved to demo.svg (5 elements)
svg> undo
error: undo not allowed after io command
```

### 11.2 两节点流程图

使用 `phase_cli_1.md` 6.1 的会话，验证 `create … in`、容器移动、容器内文本修改和保存。

### 11.3 失败不改状态

```text
svg> init 800 600
svg> create g g1
svg> create rect r1 0 0 10 10 red in g1
svg> group g2 r1 r9
error: no such shape: r9
svg> tree
svg (800x600)
└── g#g1
    └── rect#r1  x=0 y=0 w=10 h=10 fill=red
```

### 11.4 读取子集

- 带缺 id 元素的 `other.svg`：输出警告并按文档顺序补 id。
- 带 `transform`、`style`、`path`、不匹配 `viewBox` 的文件：分别报对应错误，当前文档不变。
- 读取支持子集文件后保存，再读取，图形树与输出一致。

### 11.5 IO 屏障

```text
svg> init 800 600
svg> create rect r1 0 0 10 10 red
svg> save a.svg
saved to a.svg (1 elements)
svg> undo
error: undo not allowed after io command
svg> create rect r2 10 10 10 10 blue
rect#r2 created
svg> undo
rect#r2 removed
svg> undo
error: nothing to undo
```

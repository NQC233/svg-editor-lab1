# Ticket 17 的读取边界与 CDATA 规则

Status: accepted (2026-10-25)

用户要求在前置票完成后继续 Ticket 17。为解除该票的 `needs-info` 门禁，本次确认中间版本的读取边界：

- Ticket 17 只接受六种图形元素，并要求每个图形都有非空 `id`。缺失或空 `id` 报 `invalid SVG: missing id on <tag>`；自动补 id 留给 Ticket 18。
- `title`、`desc`、`metadata` 及其子树和未建模属性留给 Ticket 18。Ticket 17 遇到这些输入时分别报 `unsupported element: <tag>` 或 `unsupported attribute: <attr>`，不静默丢弃。
- 文本元素中的直接文本和 CDATA 都计入正文；非文本元素中的 CDATA 不产生图形内容，按忽略处理。此规则消除“忽略 CDATA”与“`text` 接受 CDATA”的冲突。
- XML 预定义实体与数字实体在文本和属性值中解码；未知实体、DOCTYPE 和非 XML 声明处理指令拒绝整份文件。
- 读取沿用 ADR-0008 的 UTF-8 与相对路径规则：相对路径相对于进程当前工作目录解析，成功输出保留用户提供的路径文本。
- 位置或坐标属性缺失时取 0；尺寸或半径属性缺失时由图形构造校验报对应的正数错误。

`read` 先完成文件读取、解码、解析、图形构造和 id 校验，再一次性替换当前文档并设置路径。任何失败都不改变文档、当前路径或历史；成功后由既有文档命令协议清空并锁定历史。

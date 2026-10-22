# Issue tracker: GitHub

本仓库的 issue 和 spec 存放在 GitHub Issues，统一使用 `gh` CLI 操作。

## 约定

- **创建 issue**：`gh issue create --title "..." --body "..."`。多行正文使用 heredoc。
- **读取 issue**：`gh issue view <number> --comments`，用 `jq` 过滤评论，并同时获取标签。
- **列出 issue**：`gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`，配合 `--label` 和 `--state` 过滤。
- **评论**：`gh issue comment <number> --body "..."`
- **添加/移除标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：`gh issue close <number> --comment "..."`

在克隆目录中运行时，`gh` 会自动从 `git remote -v` 推断仓库。

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

设为 `yes` 后，PR 会走与 issue 相同的标签和状态流程，命令改用 `gh pr` 的等价命令：

- **读取 PR**：`gh pr view <number> --comments`，diff 用 `gh pr diff <number>`。
- **列出待 triage 的外部 PR**：`gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`，只保留 `authorAssociation` 为 `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR` 或 `NONE` 的项（去掉 `OWNER`/`MEMBER`/`COLLABORATOR`）。
- **评论/打标签/关闭**：`gh pr comment`、`gh pr edit --add-label`/`--remove-label`、`gh pr close`。

GitHub 的 issue 和 PR 共用一个编号空间，裸写 `#42` 可能是两者之一：先用 `gh pr view 42` 解析，失败再回退到 `gh issue view 42`。

## 当 skill 说 "publish to the issue tracker"

创建一个 GitHub issue。

## 当 skill 说 "fetch the relevant ticket"

运行 `gh issue view <number> --comments`。

## Wayfinding operations

供 `/wayfinder` 使用。**map** 是一个 issue，**child** issue 是其中的 ticket。

- **Map**：一个带 `wayfinder:map` 标签的 issue，正文保存 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`。
- **Child ticket**：作为 map 的 GitHub sub-issue 关联（通过 sub-issues 端点调用 `gh api`）。如果仓库未启用 sub-issues，则把 child 加入 map 正文的任务列表，并在 child 正文顶部写 `Part of #<map>`。标签用 `wayfinder:<type>`（`research`/`prototype`/`grilling`/`task`）。被认领后 assign 给执行的开发者。
- **Blocking**：使用 GitHub 原生 issue dependencies，这是 UI 可见的规范表示。通过 `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>` 添加边，其中 `<blocker-db-id>` 是 blocker 的数字数据库 id（`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，不是 `#number` 或 `node_id`）。GitHub 通过 `issue_dependencies_summary.blocked_by` 报告未关闭的 blocker 数（实时门禁）。如果依赖功能不可用，回退为 child 正文顶部的 `Blocked by: #<n>, #<n>`。所有 blocker 关闭后 ticket 才算 unblocked。
- **Frontier query**：列出 map 下所有打开的 child（`gh issue list --state open`，范围限定为 map 的 sub-issues / 任务列表），去掉仍有未关闭 blocker（`issue_dependencies_summary.blocked_by > 0`，或 `Blocked by` 行中仍有未关闭 issue）或已有 assignee 的项；按 map 顺序取第一个。
- **Claim**：`gh issue edit <n> --add-assignee @me`，这是该会话的第一次写入。
- **Resolve**：`gh issue comment <n> --body "<answer>"`，然后 `gh issue close <n>`，最后把上下文指针（gist + 链接）追加到 map 的 Decisions-so-far。

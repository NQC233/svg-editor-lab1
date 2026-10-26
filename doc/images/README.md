# 图表维护

课程报告直接引用仓库中的 PNG 图片，GitHub 无需 PlantUML 插件即可显示。PlantUML 源文件是图表内容的维护入口；修改源文件后重新生成并一同提交图片。

| 源文件                                                | 导出图片                                       | 内容                        |
| ----------------------------------------------------- | ---------------------------------------------- | --------------------------- |
| [`../architecture.puml`](../architecture.puml)        | [`architecture.png`](./architecture.png)       | 模块依赖                    |
| [`../class-model.puml`](../class-model.puml) 第一个图 | [`class-model.png`](./class-model.png)         | 图形、文档与 SVG 读取类模型 |
| [`../class-model.puml`](../class-model.puml) 第二个图 | [`command-history.png`](./command-history.png) | 命令与撤销历史类模型        |

## 重新生成

本次使用 [PlantUML 1.2026.9](https://github.com/plantuml/plantuml/releases/tag/v1.2026.9)、Java 和 Graphviz 在本地生成。图中使用 `PingFang SC` 字体；在其他系统上应安装该字体或将源文件中的 `defaultFontName` 替换为本机可用的中文字体，以免出现方框。

从项目根目录运行，替换 JAR 的实际路径：

```bash
java -Djava.awt.headless=true -jar /path/to/plantuml.jar \
  -charset UTF-8 -tpng -o images \
  doc/architecture.puml doc/class-model.puml
```

`-o images` 相对于源文件所在的 `doc/` 目录，因此输出到 `doc/images/`。源文件中的 `@startuml` 名称指定导出文件名。工具只用于维护文档，无需加入项目运行依赖。

生成后检查三张图的中文、箭头和边缘是否完整，并确认[课程报告](../README.md#模块划分)中的图片能显示。

# dsh-file-mention

> 为 **DSH (DeepSeek Harness) Web GUI** 打造的「工作区文件/文件夹选择」客户端插件。
> 在输入框上方提供一个 📎 按钮，搜索并选中工作区内的文件或文件夹后，以 **tag 引用**的形式插入对话，让模型（agent）能零歧义地定位并读取你指定的文件。

## 功能特性

- 📎 **一键选择**：输入框上方左侧的按钮，点击弹出搜索面板
- 📁/📄 **文件与文件夹**：同时支持选择文件或目录（「全部 / 文件 / 文件夹」筛选）
- 🔍 **即时搜索**：按文件名或路径过滤，支持方向键 + 回车选择
- 🏷️ **Tag 引用**：选中后以引用芯片（tag）插入输入框，追加在草稿末尾、不覆盖原内容
- 📍 **精确定位**：自动跟随当前会话的工作目录（不依赖服务启动目录），彻底消除同名文件歧义
- 🚀 **热更新**：浏览器端代码改动自动生效，无需频繁重启

## 安装

### 前置要求

- 已安装并可运行 DSH Web（`dsh web`）
- Windows 系统（安装脚本为 PowerShell）

### 方式一：下载仓库压缩包（推荐）

1. 下载本仓库 ZIP 并解压（或 `git clone` 到任意目录）
2. 在解压后的目录中运行 PowerShell：

```powershell
# 进入插件目录后执行
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

3. **重启 dsh web 服务**（Ctrl+C 停止后重新运行 `dsh web`）
4. 刷新页面，输入框上方出现 📎 按钮即安装成功

### 方式二：手动安装

```powershell
# 1. 将整个插件目录复制到 profile 的 node_modules 下
$dst = "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-file-mention"
Copy-Item . $dst -Recurse -Force
```

```yaml
# 2. 编辑 $env:USERPROFILE\.dsh\profiles\web\cordis.patch.yml，追加：
- insert:
    - id: file-mention
      name: 'dsh-file-mention'
```

```powershell
# 3. 重启 dsh web
```

## 使用

1. 点击输入框上方左侧的 **📎** 按钮
2. 在弹出面板中搜索文件名或路径（可用「全部 / 文件 / 文件夹」筛选）
3. 点击（或方向键 + 回车）选中
4. 输入框中出现 tag 引用芯片，随消息发送后模型会收到精确路径（如 `` `src/main/java/com/example/UserService.java` ``）

> 提示：发送后，agent 会按反引号内的相对路径直接读取对应文件；文件夹则会列出其内容。

## 卸载

```powershell
$dst = "$env:USERPROFILE\.dsh\profiles\web\node_modules\dsh-file-mention"
Remove-Item $dst -Recurse -Force
```

然后从 `cordis.patch.yml` 中删除对应的 `file-mention` 配置块，重启 `dsh web` 即可。

## 项目结构

```
dsh-file-mention/
├── package.json      # 插件包声明（含 dsh.client 浏览器端标记）
├── lib/
│   ├── index.js      # 宿主端：HTTP 路由，递归扫描工作区文件/目录
│   └── client.js     # 浏览器端：📎 按钮 + 搜索面板 + tag 引用插入
├── install.ps1       # 一键安装脚本
└── README.md
```

## 工作原理

- **宿主端**（`lib/index.js`）：注册 `/file-mention/files.json` 路由，递归扫描工作区（自动排除 `.git`、`target`、`node_modules` 等），支持 `?root=` 指定工作区、2 万条目上限保护
- **浏览器端**（`lib/client.js`）：通过 DSH 输入管线（`slash/input-insert-reference`）以引用芯片形式插入，提交时经注册的 codec 序列化为反引号路径

## 开发说明

- 浏览器端（`lib/client.js`）改动：保存后自动热更新（DSH HMR），无需重启
- 宿主端（`lib/index.js`）改动：需要重启 `dsh web`

## 许可证

[MIT](LICENSE)

# dsh-file-mention 一键安装脚本
# 将插件安装到 DSH web profile，并自动注册插件行。
# 用法：powershell -ExecutionPolicy Bypass -File .\install.ps1
# 可选参数：-ProfileDir <路径>  指定 DSH profile 目录（默认 %USERPROFILE%\.dsh\profiles\web）
param(
    [string]$ProfileDir = (Join-Path $env:USERPROFILE ".dsh\profiles\web")
)

$ErrorActionPreference = "Stop"

$source = $PSScriptRoot
if (-not (Test-Path (Join-Path $source "package.json"))) {
    throw "未找到 package.json，请在 dsh-file-mention 仓库根目录运行本脚本"
}
if (-not (Test-Path $ProfileDir)) {
    throw "未找到 DSH web profile：$ProfileDir （请确认已运行过 dsh web，或通过 -ProfileDir 指定）"
}

$target = Join-Path $ProfileDir "node_modules\dsh-file-mention"
New-Item -ItemType Directory -Path (Join-Path $ProfileDir "node_modules") -Force | Out-Null
if (Test-Path $target) { Remove-Item $target -Recurse -Force }
# 用 robocopy 复制（排除 .git，避免把仓库历史带进 profile）
robocopy $source $target /E /XD ".git" /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "复制插件失败（robocopy exit code: $LASTEXITCODE）" }
$global:LASTEXITCODE = 0
Write-Host "[1/2] 已复制插件到 $target"

$patch = Join-Path $ProfileDir "cordis.patch.yml"
$content = if (Test-Path $patch) { Get-Content $patch -Raw } else { "" }
if ($content -match "id: file-mention") {
    Write-Host "[2/2] cordis.patch.yml 已包含 file-mention 注册，跳过"
} else {
    $block = @"

# dsh-file-mention: 工作区文件/文件夹选择插件
- insert:
    - id: file-mention
      name: 'dsh-file-mention'
"@
    $content = $content.TrimEnd() + "`r`n" + $block + "`r`n"
    [System.IO.File]::WriteAllText($patch, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "[2/2] 已在 cordis.patch.yml 注册 file-mention"
}

Write-Host ""
Write-Host "安装完成！请按以下步骤生效："
Write-Host "  1. 停止当前 dsh web 服务（Ctrl+C）"
Write-Host "  2. 重新运行：dsh web"
Write-Host "  3. 刷新浏览器页面，输入框上方出现 📎 按钮即安装成功"

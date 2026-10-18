# 小安界面素材

所有图片路径统一配置在 `config/brand-assets.ts`，替换同名文件即可更新。

- `xiaoan-portrait.png`：Figma 的首页图层 `image 46`（节点 `105:63`）导出的高清透明 PNG（1214×972），首页主图与全站小安头像共用，头像使用 `cover` 居中显示。
- `support-conversation.png`：用户最新提供的完整插画（854×526），用于首页第二屏，文字和聊天入口单独实现。
- `value-safety.png`、`value-trust.png`、`value-privacy.png`：图4定位说明的三张插画。
- `help-understand.png`、`help-safety.png`、`help-legal.png`、`help-rebuild.png`：图4四张支持卡片的插画。

插画从用户提供的参考图片裁切，原始分辨率保留。页面文字使用 HTML，支持链接与移动端重排。首页与头像原图来源：Figma 文件 `rCHimJFqCjG9i3uTAvGYaQ`；第二屏通过 `mix-blend-mode: multiply` 与首页背景融合。

聊天入口参考：`chat-entry-figma-reference.png` 来自 Figma `Frame 15`（节点 `104:5`）。页面用 HTML/CSS 和 SVG 实现相同的渐变描边、聊天图标与右侧渐变按钮；箭头按用户要求缩短，文字保留可访问的文本。

## 2026-10-17 三个首页区块原始素材

来自 Figma `vaLK0i9cvHgsHAYVVcgnnf` 当前版本，通过图层 Copy as PNG 导出透明 PNG：

- `help-understand-original.png`：image 56，节点 `1:91`，386×386。
- `help-safety-original.png`：image 58，节点 `1:100`，394×394。
- `help-legal-original.png`：image 59，节点 `1:109`，352×352。
- `help-rebuild-original.png`：image 60，节点 `1:118`，358×358。
- `contact-original.png`：image 57，节点 `1:171`，702×702。

首页使用独立图片组件，不再引用截图定位素材。已核对最新 Frame 50、Frame 56、Frame 57；联系区背景采用当前版本的暖米色。

## 首页前两屏最新原图

- `home-intro-original.png`：首屏 image 62，节点 `23:10`，960×720，光球支持插画。
- `home-welcome-original.png`：第二屏 image 46，节点 `1:35`，1214×972。
- 核对画板：首屏 `1:2`、第二屏 `1:36`；首屏采用“讲出来，让支持发生”、橙色开始对话入口；第二屏采用新版说明与“立即倾诉”按钮。

## 定位说明（2026-10-18）

Figma 文件 `vaLK0i9cvHgsHAYVVcgnnf` 的 `Frame 54`（节点 `1:58`）对应首页定位说明。
`value-safety-figma.png`、`value-trust-figma.png`、`value-privacy-figma.png` 为用户提供的同版附件中提取的插画区域，保留原始分辨率（287×232），不包含卡片文字。
信任文案与设计同步；私密文案保留当前产品已支持的分享选择、清空对话与快速离开功能说明。

## 首屏与留言区（2026-10-18）

`home-star-art.png` 从 Figma `vaLK0i9cvHgsHAYVVcgnnf` 的「小安与星光对话 1」（`104:25`）Copy as PNG 导出后提取左侧插画，并去除米色纸纹背景；首屏文字与按钮独立实现，支持移动端重排。
留言区对应 `Frame 58`（`1:176`），采用设计中的邮箱、匿名反馈说明和回到首屏入口；在线反馈复用现有表单与接口。
私密卡文案按本次用户附件更新。

## 支持卡片缺图与字体修正（2026-10-18）

`help-rebuild-figma.png` 由同版 Figma 房屋原图重新编码为 RGBA PNG，保留 358×358 像素及透明背景；仅第 04 张小插画直出原图，避免已复现的优化图浏览器解码失败。
Figma 标题「小安帮你」（`1:119`）使用 `PingFang SC`、500 字重。网页以苹方为首选，缺少该系统字体时使用现有 Noto Sans SC 等回退字体；没有分发或复制苹果系统字体文件。

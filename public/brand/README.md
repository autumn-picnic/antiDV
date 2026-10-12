# 小安界面素材

所有图片路径统一配置在 `config/brand-assets.ts`，替换同名文件即可更新。

- `xiaoan-portrait.png`：Figma 的首页图层 `image 46`（节点 `105:63`）导出的高清透明 PNG（1214×972），首页主图与全站小安头像共用，头像使用 `cover` 居中显示。
- `support-conversation.png`：用户最新提供的完整插画（854×526），用于首页第二屏，文字和聊天入口单独实现。
- `value-safety.png`、`value-trust.png`、`value-privacy.png`：图4定位说明的三张插画。
- `help-understand.png`、`help-safety.png`、`help-legal.png`、`help-rebuild.png`：图4四张支持卡片的插画。

插画从用户提供的参考图片裁切，原始分辨率保留。页面文字使用 HTML，支持链接与移动端重排。首页与头像原图来源：Figma 文件 `rCHimJFqCjG9i3uTAvGYaQ`；第二屏通过 `mix-blend-mode: multiply` 与首页背景融合。

聊天入口参考：`chat-entry-figma-reference.png` 来自 Figma `Frame 15`（节点 `104:5`）。页面用 HTML/CSS 和 SVG 实现相同的渐变描边、聊天图标与右侧渐变按钮；箭头按用户要求缩短，文字保留可访问的文本。

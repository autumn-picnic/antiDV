# 小安前端清理候选清单

> **2026-10-09 更新：** 下文保留为迁移/审查快照。95 个遗留源码/样式及旧 Monaco 资源已按批准清单清理；反馈保留并迁到 Clerk user/admin 权限，评分写入原生会话库，快速退出清 Cookie、保留历史。当前实现与配置以 [Clerk/反馈启用说明](./CLERK_FEEDBACK_SETUP.md) 为准。

核对日期：2026-10-08。配合 [项目说明](./PROJECT_GUIDE.md) 阅读。此清单用于决定删除范围，本轮没有执行删除。

## A. 优先成组清理的遗留模块

| 组 | 范围 | 已取得的依据 | 删除时的边界 |
| --- | --- | --- | --- |
| 旧工作流与思考展示 | `app/components/workflow/`、`app/components/chat/thought/`、`public/vs/` | 当前 Answer 不再导入 workflow/thought；Monaco 只由旧 code-editor 引用；静态编辑器资源约 12 MiB | 一起处理 workflow 专用图标与包；后端 Safety/Router/Ground 不在这些文件里 |
| 旧参数与提示词配置 | `app/components/config-scence/`、`welcome/`、`value-panel/`、`utils/prompt.ts` | 主聊天不再加载 Dify 参数或 PromptConfig 表单；入口引用图不可达 | 核对残留类型，再裁剪 config 中旧常量；保留当前品牌图与配置 |
| 旧会话和识别码 | `hooks/use-conversation.ts`、`hooks/use-user-hash.ts`、`app/components/user-hash/` | 当前主入口使用 use-chatflow，Sidebar 不再展示识别码面板 | QuickExit 仍含旧 hash 保留逻辑，需要同时改行为；不能把 Cookie 会话删除功能一起移除 |
| 旧上传网络链 | `app/components/base/file-uploader-in-attachment/`、image-uploader 中候选文件、`service/base.ts` | Chat 不再加载上传器；原生 API 不支持附件；旧 base 的 import 来自旧上传工具 | **image-uploader/image-preview.tsx 仍被 image-gallery 使用，不能整目录删除** |
| 旧 Markdown 渲染器 | `app/components/base/markdown.tsx` | 当前回答使用 streamdown-markdown；旧文件未从页面入口可达 | 可移除旧渲染器独占的包；保留 Streamdown 与它直接使用的 KaTeX CSS |
| 旧反馈广播 | `utils/feedback-broadcast.ts` | 当前页面不再调用 broadcastFeedback/flushFeedback | 只删这个文件不会关闭 `/api/feedback` 或 `/feedback` |
| 其他遗留 UI/工具 | 附录所列 sidebar/card、app-unavailable、部分 base/icons、工具文件 | 当前入口引用图不可达 | 按文件清理；base 不是整包候选 |

第一批目标是切断完整的旧模块依赖，而不是只删除 package.json 条目。主 tsconfig 包含全项目 TS/TSX；留下旧源码 import、先卸载对应包，仍可能导致类型检查失败。

## B. 需要先确定产品或兼容策略

| 范围 | 建议 | 为什么需要单独决定 |
| --- | --- | --- |
| `/feedback`、`/api/feedback`、middleware 与 Neon 依赖 | 若不再用旧评价库，整体下线是最直接的精简；若保留，先修复 API 鉴权 | API 没有页面层同等认证；数据库地址缺失会在路由导入时抛错；旧数据是否需要保留尚未核对 |
| 8 个旧聊天 `/api` 路由 + `app/api/utils/common.ts` | 完成客户端迁移后可以成组删除 | 它们是 Next.js 自动注册路由，当前明确返回 410；删除后变成 404，对外契约发生变化 |
| `app/components/chat/answer/review-modal.tsx` 与 Answer 内评分代码 | 若旧评分彻底退出，可先移除 Answer 中相关 import/props/分支，再删 modal | 当前主入口关闭评分，但组件 import 仍存在，不能列为已无引用 |
| 非中文字典和语言协商 | 确定只做中文后统一裁剪 | 客户端静态导入多种语言，服务端也在协商 locale；不能只删字典 |
| 联系表单与 `/api/contact` | 需要则修正认证和存储；不需要则连首页表单一起删除 | 首页有真实调用，删除路由会造成表单失败 |
| 资源、故事、心理资料、文书模块 | 按产品定位取舍，不建议为“去模板”而删除 | 都有页面入口与站内导航，属于小安业务功能 |
| `app/styles/markdown.scss` 和旧聊天 CSS 规则 | 通过选择器覆盖检查与页面回归逐步缩减 | 样式文件仍由活跃布局或组件导入，静态 import 图不能证明每条规则未使用 |

旧 410 路由完整范围：

- `app/api/chat-messages/route.ts`
- `app/api/parameters/route.ts`
- `app/api/conversations/route.ts`
- `app/api/conversations/[conversationId]/route.ts`
- `app/api/conversations/[conversationId]/name/route.ts`
- `app/api/messages/route.ts`
- `app/api/messages/[messageId]/feedbacks/route.ts`
- `app/api/file-upload/route.ts`

## C. 依赖清理建议

### 未发现直接业务代码引用：可优先核对直接依赖声明

`axios`、`react-error-boundary`、`react-headless-pagination`、`react-tooltip`、`scheduler`、`swr`、`@mdx-js/loader`、`@mdx-js/react`。

上述判断来自源码及现有构建配置检查。`next.config.js` 虽包含 md/mdx 扩展名，但未发现实际 MDX 页面或 loader 配置。删除直接依赖后，某些包仍可能作为其他包的传递依赖保留；这不意味着删除失败，也不能将其整包大小作为净节省量。

### 跟随旧模块一起处理

| 旧模块 | 对应直接依赖候选 |
| --- | --- |
| workflow 编辑器 | `@monaco-editor/react`、`copy-to-clipboard` |
| 上传器及其状态工具 | `@remixicon/react`、`mime`、`uuid`、`zustand`、`lodash-es`；`immer` 还被旧会话 hook 使用 |
| 旧 Markdown | `react-markdown`、`react-syntax-highlighter`、`@types/react-syntax-highlighter`、`rehype-katex`、`remark-breaks`、`remark-gfm`、`remark-math` |
| 旧 select/action-button/classnames helper | `@headlessui/react`、`class-variance-authority`、`tailwind-merge` |
| 旧服务端 i18n 初始化文件 | `i18next-resources-to-backend` |

### 明确保留或不按业务 import 决定

- 原生聊天：`eventsource-parser`、`server-only`、React/Next、`ahooks`、`rc-textarea`。
- 活跃样式/组件：`streamdown`、`katex`、`classnames`、`@floating-ui/react`、`@heroicons/react`。
- 功能性依赖：`docx` 服务 Word 生成，`xlsx` 服务聊天/反馈导出；保留功能就保留包。
- i18n 链目前仍使用 `i18next`、`react-i18next`、`js-cookie`、`negotiator`、`@formatjs/intl-localematcher`。
- 类型包、TypeScript、Sass、Tailwind/PostCSS、Husky、lint-staged、ESLint 等由编译配置、样式和脚本使用，缺少业务 import 不构成删除依据。
- `eslint-config-next`、测试/压测工具需结合后续 CI 决策处理，本次不将其列为直接可删除项。

## D. 资源、历史文件与缓存

| 路径 | 判断 |
| --- | --- |
| `public/vs/` | 高优先级资源候选；唯一发现的 `/vs` loader 配置属于已退出入口链的 Monaco 编辑器 |
| `public/brand/` | 保留，首页和聊天头像正在使用 |
| `app/components/base/icons/` | 仅移除旧模块专用图标；IconBase、utils、x-close 等仍被使用 |
| `service/vercel.json` | 未发现仓库内引用；文件不在根目录。先确认外部部署有无显式指定该配置再删 |
| `load-test/` | 保留为历史材料或重写；k6/Playwright 仍监测旧 chat-messages 路径 |
| `locustfile.py` | 使用假定 `/api/chat` 路径，与当前协议不符；有继续压测计划则改造，否则归档 |
| `prompts/`、`memory/`、`seo_audit_memory/` | 历史知识资料，适合归档整合；不因代码无 import 自动删除 |
| `touxiang2png.png` | 未发现当前业务引用；可能是素材源文件，确认设计原稿用途再删 |
| `temp_clone/` | 小体积 Git 残留；先核对其元数据，不按重复完整项目删除 |
| `.next/` | 可重建缓存；不是部署前必须清理的业务内容 |
| `node_modules/` | 可重装依赖；当前安装体积约 901 MiB，清理不是代码精简收益 |
| `.github/prompts/ui-ux-pro-max/` 等开发资料 | 开发工具资料，当前指令还要求使用 ui-ux-pro-max，不因不参与网页运行就删除 |
| `.env.local`、`.git`、`LICENSE`、数据目录 | 不属于本次清理候选；分别涉及配置、历史、许可或实际记录 |

## E. 推荐验收方式

1. 先确定删除组和旧反馈后台的去留，保存当前工作树可恢复快照，保留用户尚未提交的界面修改。
2. 删除一组源文件后重新检查路径、类型、CSS 资源引用；更新对应包与 pnpm lock。
3. 执行 `npm run test:chatflow`、`npm run check:chatflow` 与相关 lint。
4. 在获准后执行干净安装、完整类型检查/构建与浏览器验收，至少覆盖首页、聊天恢复/删除/失败重试、资源页、文书下载及保留的后台功能。
5. 对旧 API 的删除，以外部调用迁移为条件；对数据存储的下线，以记录保留/迁移决策为条件。

项目 AGENTS.md 要求删除文件、安装包及完整构建/E2E 前确认。此文档只是范围清单，不是删除脚本。

## 附录：95 个入口不可达文件候选

范围包含 TS/JS/CSS/SCSS；不含资源目录中的全部图标/图片和 `public/vs` 文件。以下是可复核的静态候选，不是逐个独立删除指令。已排除编译器隐式加载的 `app/global.d.ts`。

### app/components/app-unavailable.tsx（1 个）

- `app/components/app-unavailable.tsx`

### app/components/base（61 个）

- `app/components/base/action-button/index.css`
- `app/components/base/action-button/index.tsx`
- `app/components/base/app-icon/style.module.css`
- `app/components/base/auto-height-textarea/index.tsx`
- `app/components/base/file-uploader-in-attachment/constants.ts`
- `app/components/base/file-uploader-in-attachment/file-from-link-or-local/index.tsx`
- `app/components/base/file-uploader-in-attachment/file-image-render.tsx`
- `app/components/base/file-uploader-in-attachment/file-input.tsx`
- `app/components/base/file-uploader-in-attachment/file-item.tsx`
- `app/components/base/file-uploader-in-attachment/file-type-icon.tsx`
- `app/components/base/file-uploader-in-attachment/hooks.ts`
- `app/components/base/file-uploader-in-attachment/index.tsx`
- `app/components/base/file-uploader-in-attachment/store.tsx`
- `app/components/base/file-uploader-in-attachment/types.ts`
- `app/components/base/file-uploader-in-attachment/utils.ts`
- `app/components/base/icons/line/alert-circle/index.tsx`
- `app/components/base/icons/line/alert-triangle/index.tsx`
- `app/components/base/icons/line/arrows/chevron-down/index.tsx`
- `app/components/base/icons/line/arrows/collapse-04/index.tsx`
- `app/components/base/icons/line/check-circle/index.tsx`
- `app/components/base/icons/line/chevron-right/index.tsx`
- `app/components/base/icons/line/files/Clipboard.tsx`
- `app/components/base/icons/line/files/ClipboardCheck.tsx`
- `app/components/base/icons/line/files/index.ts`
- `app/components/base/icons/line/image-plus/index.tsx`
- `app/components/base/icons/line/link-03/index.tsx`
- `app/components/base/icons/line/loading-02/index.tsx`
- `app/components/base/icons/line/refresh-ccw-01/index.tsx`
- `app/components/base/icons/line/upload-03/index.tsx`
- `app/components/base/icons/other/ReplayLine.tsx`
- `app/components/base/icons/public/data-set/index.tsx`
- `app/components/base/icons/solid/alert-circle/index.tsx`
- `app/components/base/icons/solid/alert-triangle/index.tsx`
- `app/components/base/icons/solid/expand-04/index.tsx`
- `app/components/base/icons/solid/general/check-circle/index.tsx`
- `app/components/base/icons/workflow/Answer.tsx`
- `app/components/base/icons/workflow/Code.tsx`
- `app/components/base/icons/workflow/End.tsx`
- `app/components/base/icons/workflow/Home.tsx`
- `app/components/base/icons/workflow/Http.tsx`
- `app/components/base/icons/workflow/IfElse.tsx`
- `app/components/base/icons/workflow/KnowledgeRetrieval.tsx`
- `app/components/base/icons/workflow/Llm.tsx`
- `app/components/base/icons/workflow/QuestionClassifier.tsx`
- `app/components/base/icons/workflow/TemplatingTransform.tsx`
- `app/components/base/icons/workflow/VariableX.tsx`
- `app/components/base/icons/workflow/index.ts`
- `app/components/base/image-uploader/chat-image-uploader.tsx`
- `app/components/base/image-uploader/hooks.ts`
- `app/components/base/image-uploader/image-link-input.tsx`
- `app/components/base/image-uploader/image-list.tsx`
- `app/components/base/image-uploader/uploader.tsx`
- `app/components/base/image-uploader/utils.ts`
- `app/components/base/loading/index.tsx`
- `app/components/base/loading/style.css`
- `app/components/base/markdown.tsx`
- `app/components/base/progress-bar/index.tsx`
- `app/components/base/progress-bar/progress-circle.tsx`
- `app/components/base/select/index.tsx`
- `app/components/base/toast/style.module.css`
- `app/components/base/tooltip-plus/index.tsx`

### app/components/chat（4 个）

- `app/components/chat/thought/index.tsx`
- `app/components/chat/thought/panel.tsx`
- `app/components/chat/thought/style.module.css`
- `app/components/chat/thought/tool.tsx`

### app/components/config-scence（1 个）

- `app/components/config-scence/index.tsx`

### app/components/sidebar（2 个）

- `app/components/sidebar/card.module.css`
- `app/components/sidebar/card.tsx`

### app/components/user-hash（1 个）

- `app/components/user-hash/index.tsx`

### app/components/value-panel（2 个）

- `app/components/value-panel/index.tsx`
- `app/components/value-panel/style.module.css`

### app/components/welcome（3 个）

- `app/components/welcome/index.tsx`
- `app/components/welcome/massive-component.tsx`
- `app/components/welcome/style.module.css`

### app/components/workflow（9 个）

- `app/components/workflow/block-icon.tsx`
- `app/components/workflow/code-editor/index.tsx`
- `app/components/workflow/code-editor/style.css`
- `app/components/workflow/editor/base.tsx`
- `app/components/workflow/editor/prompt-editor-height-resize-wrap.tsx`
- `app/components/workflow/editor/toggle-expand-btn.tsx`
- `app/components/workflow/editor/use-toggle-expend.ts`
- `app/components/workflow/node.tsx`
- `app/components/workflow/workflow-process.tsx`

### hooks（2 个）

- `hooks/use-conversation.ts`
- `hooks/use-user-hash.ts`

### i18n（1 个）

- `i18n/i18next-serverside-config.ts`

### service（1 个）

- `service/base.ts`

### types（2 个）

- `types/base.ts`
- `types/tools.ts`

### utils（5 个）

- `utils/classnames.ts`
- `utils/feedback-broadcast.ts`
- `utils/format.ts`
- `utils/prompt.ts`
- `utils/tools.ts`

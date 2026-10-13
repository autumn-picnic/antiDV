# Clerk 生产邮件配置

2026-10-12。采用 Clerk 邮箱验证码；暂不启用手机号注册或登录。

## 已确认状态

通过主机现有登录态读取 Clerk 配置和 Azure Container Apps 信息：

- 当前 Clerk 应用：`app_3KD8tybAVU2mpd55MDjANbA7kwO`（My Application）。
- 开发实例：`ins_3KD8tybtQwsf0ppNWLtPNk0CAbT`；生产实例尚未创建。
- 邮箱为必填，注册时验证，注册验证和登录均为 `email_code`。
- 手机号注册、登录和第二因素均已关闭。
- Azure 前端：`xiaoan-web`，资源组 `xiaoan-pilot-rg`，当前未绑定自有域名。
- 当前访问源：`<https://xiaoan-web.kindisland-409320c5.japaneast.azurecontainerapps.io`。>
- 本地 `.env.local` 使用开发实例密钥。本次未输出或更改密钥。
- 登录与注册页已有检查垃圾邮件和广告邮件的提示。

## 待提供的信息

需要确定可管理 DNS 的自有域名和 DNS 托管平台，以及可用的发件邮箱。Azure 提供的 `azurecontainerapps.io` 域名不是用户控制的 DNS 区域，不能直接为其配置 Clerk 所需邮件 DNS。

域名未确定前，不创建生产实例，不推测 DNS 记录值，不切换线上密钥。

## 执行顺序

1. 确定前端自有域名，检查其现有 DNS 与发信记录；将域名绑定到现有 Azure 前端，并验证 HTTPS。
2. 在当前 Clerk application 中创建 production instance，复制当前邮箱验证码设置；再次读取并核实手机号仍关闭。生产实例的 Paths、SSO connections 与 Integrations 需要独立核对，不能假定自动复制。
3. 获取该实例生成的真实 DNS 记录，逐条配置。Clerk CNAME 在 Cloudflare 应为 DNS only。保留已有邮件系统的有效记录，检查冲突和 SPF 现有配置。
4. 核验 Clerk 的 Frontend API、邮件域名 DNS、TLS 证书状态。按其要求完成 SPF/DKIM，并在审查现有邮件来源后设置 DMARC。不要在未检查其他合法发信源前直接套用严格 reject 策略。
5. 配置真实可收信的 From 邮箱，保留默认验证码模板及 Delivered by Clerk。
6. 准备前后端协调切换：生产 Publishable Key 与 Secret Key、后端 issuer/JWKS、前后端允许来源和 FRONTEND_ORIGIN、使用到的 webhook 签名密钥。生产与开发用户、会话和角色需分别核验，确认业务账号和历史归属后才切换。
7. NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 是 Next.js 构建时配置，需确认镜像构建流程；只修改运行时环境变量未必能更新已有浏览器包。本次未执行构建或部署。
8. 先核验配置和变更内容，保留可回退的现有版本，然后实施协调切换。
9. 使用真实 Outlook、QQ、163 等邮箱验证验证码送达、From 域名、邮件头 SPF/DKIM/DMARC 结果，以及注册、重新登录和历史访问。记录实际结果；邮箱接收并不保证进入普通收件箱。

## 核查命令

现有 CLI 的非交互只读命令：

```sh
clerk whoami --json
clerk deploy status
clerk config pull --keys auth_email auth_phone
clerk config pull --instance prod --keys auth_email auth_phone
```

`clerk deploy status` 当前返回 `not_started`。DNS 记录需要生产实例和正式域名后才会产生。尚未修改后台、DNS 或 Azure 部署。

## 官方依据

- <https://clerk.com/docs/guides/development/deployment/production.md>
- <https://clerk.com/docs/guides/development/troubleshooting/email-deliverability.md>

## 2026-10-13 更新

登录、注册页的收件提示已合入并部署。反馈管理账号 `autumnpicnic@proton.me` 已在 Azure 当前使用的 Clerk 实例中确认主邮箱已验证，并设置 publicMetadata.role 为 admin。PR #10 同时限制反馈页面及数据接口，要求该已验证主邮箱及 admin 角色。以上权限设置没有创建生产实例或配置邮件 DNS；自有域名与生产邮件切换继续按上方步骤执行。

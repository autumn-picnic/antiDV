# 邮件投递与中国用户登录方式核查

核查日期：2026-10-12。以下是官方文档支持的能力、实施建议和尚需实测的条件。未修改 Clerk 后台、DNS、短信服务或线上部署。

## 已确认选择（2026-10-12）

继续使用 Clerk，先完成生产邮件配置；暂不启用手机号注册。执行状态见 [生产邮件配置记录](CLERK_PRODUCTION_EMAIL.md)。

## 建议

当前阶段保留 Clerk，继续使用邮箱验证码，并保留收件提示。先改善生产发信配置，再验证中国大陆手机号。微信作为可选入口；若大陆短信和微信成为主要入口，再比较 Clerk 加身份代理与直接迁移到国内身份服务的成本。

## 邮件投递

Clerk 开发实例从 `@accounts.dev` 发信；生产实例从自己的域名发信。生产初始化需要按 Clerk 提供的 DNS 记录设置 SPF、DKIM，另外建议配置 DMARC，并确保 From 地址存在可收信邮箱。

新域名的信誉和邮箱提供商的过滤规则都会影响收件位置，因此这些设置能改善投递，但不能保证所有邮件进入普通收件箱。应保留默认验证码模板，并使用真实的 Outlook、QQ、163 等邮箱做收件测试。当前没有查看用户这封邮件的原始邮件头，因此无法确定本次垃圾邮件分类的具体原因。

Clerk 支持逐模板关闭 Delivered by Clerk，再使用 `email.created` webhook 交给自己的邮件服务发送。这需要可靠的 webhook 验签、去重、重试和投递监控；关闭前须让替代发送通路正常运行。

官方依据：
- Clerk Email deliverability: https://clerk.com/docs/guides/development/troubleshooting/email-deliverability.md
- Clerk New domain reputation and email warm-up: https://clerk.com/docs/guides/development/troubleshooting/email-domain-name-warmup.md

## 手机号

Clerk 支持手机短信验证码注册登录；生产使用需要付费方案。默认 SMS allowlist 仅启用美国和加拿大，可以在 SMS → Settings 调整。

当前公开文档没有在本次核查结果中明确保证中国大陆 +86 的可用性。需查看实际实例能否启用 China，并对大陆不同运营商实测接收时间、成功率和费用。若该国家不被平台支持，不能假定换成自己的短信网关就能绕过手机号准入限制。

Clerk 支持关闭短信模板的 Delivered by Clerk，并用 `sms.created` webhook 接自有短信发送服务；该能力与号码是否获准注册是不同条件。

官方依据：
- Clerk Sign-up and sign-in options: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options.md
- Clerk Email and SMS templates: https://clerk.com/docs/guides/customizing-clerk/email-sms-templates.md

## 微信

Clerk 当前列出的内置社会化登录没有微信；自定义社会化登录要求兼容 OIDC 的身份提供商。微信网站登录官方协议是 OAuth2.0 authorization_code，不能仅把微信 AppID 填入 Clerk 的 OIDC 配置就完成接入。

可评估微信 → Authing 等提供 OIDC 的身份服务 → Clerk 的方案。Authing 已提供 PC 微信扫码登录文档，但这条完整链路尚未在本项目验证，也未核实具体套餐费用及免邮箱注册的字段配置。

微信网站登录需要已审核通过的网站应用、AppID/AppSecret、微信登录权限及匹配的回调域名。PC 网站扫码、微信公众号网页授权和小程序登录应分别设计；不能把一种终端的接入视为覆盖所有终端。

微信登录接口返回 openid/unionid 等标识，不能假定会返回邮箱或手机号。应配置所需字段，设计现有邮箱账号与微信身份的显式绑定，避免聊天记录落入重复账户。AppSecret 必须保存在服务端。

小安场景的产品建议：微信与手机号作为可选登录方式，保留访客入口、邮箱备选、退出与历史控制。用户授权页面、邮件或短信可能在共用设备上留下使用线索，提示措辞应保持中性。这是设计建议，非已发生的泄露结论。

官方依据：
- Clerk Social connections: https://clerk.com/docs/nextjs/guides/configure/auth-strategies/social-connections/overview.md
- Clerk Custom OAuth provider: https://clerk.com/docs/guides/configure/auth-strategies/social-connections/custom-provider.md
- 微信网站应用微信登录开发指南: https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
- Authing PC 微信扫码: https://docs.authing.cn/v2/guides/connections/social/wechat-pc/

## 是否迁移

保留 Clerk 可延续现有会话和用户标识接入；加一层微信身份服务会增加配置、费用及故障依赖。若决定直接换平台，需同时修改服务端令牌校验和现有 clerk_user_id 的映射，明确聊天、反馈及角色迁移方式，避免用户失去历史记录。尚未实施迁移。

## 本次页面变更与验证

登录和注册页均添加：收不到邮箱验证码？请检查「垃圾邮件」或「广告邮件」文件夹，并确认邮箱地址填写正确。

已通过两个文件的 ESLint 检查。截至原始核查日未执行完整构建、浏览器端验证或线上部署。两页在本次开始前已是未跟踪文件，本次只修改页面排版并添加提示文字，保留 Clerk 组件和 /chat 跳转。

## 2026-10-13 已完成状态

登录、注册页的验证码收件提示已随 PR #8 合入远端 main 并通过 GitHub Actions 部署到 Azure。部署版本 94edf55 的登录页 HTTP 检查通过；真实邮箱收件及完整注册浏览器流程仍待验收。继续保留邮箱验证码，暂不启用手机号。本文其他服务能力判断属于 2026-10-12 核查记录，后续实施前需再次核实。

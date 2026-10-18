# 在线留言与 Chat 评价

在线留言与 Chat 评价共用 PostgreSQL 和 `/feedback` 管理页。在线留言可以匿名提交；Chat 评价需要登录，只能评价自己的已完成回答，支持 1–5 分与最多 500 字建议。同一回答再次提交会更新原评价。

## 数据与访问

- `POST /api/contact`：持久化到 `xiaoan_contact_feedback`，字段为 `id`、`createdAt`、`message`、`name`、`phone`、`wechat`、`email`。服务端生成 ID 和时间；可选联系方式留空保存为 NULL。
- `GET /api/contact?offset=0`：管理员读取，每页最多 50 条，返回 `items`、`nextOffset`；读取审计保存到 `xiaoan_contact_admin_access`。
- `POST /api/reviews`：保存到 `xiaoan_answer_feedback`；`GET /api/reviews?conversationId=...` 读取当前用户自己的评价。
- `GET /api/feedback`：管理员查询会话与评价，访问审计保存到 `xiaoan_admin_access`。
- `/feedback` 的“聊天评价”和“在线留言”两个入口均由服务端 Clerk 校验保护。

管理员必须同时满足有效会话、账号未被禁用、`publicMetadata.role=admin`、已验证主邮箱为 `autumnpicnic@proton.me`。其他 admin、未验证或仅次要邮箱匹配的账号均被拒绝。URL secret 已停用。API 不缓存敏感数据。

## PostgreSQL 接入

前端 `CHATFLOW_DATABASE_URL` 必须连接后端账号服务同一个 PostgreSQL，使用独立登录 `xiaoan_feedback_web`，启用 TLS 证书验证 `sslmode=verify-full`。凭证只保存在现有 Azure Key Vault，前端使用用户分配身份引用 `feedback-database-url` secret。

数据库管理员先执行 `db/migrations/001_answer_feedback.sql` 和 `db/migrations/002_contact_feedback.sql`。2026-10-18 已执行新增表迁移；重跑前应核对实际数据库。

独立登录只需：

```sql
GRANT USAGE ON SCHEMA public TO xiaoan_feedback_web;
GRANT SELECT ON app_users, account_conversations, account_turns TO xiaoan_feedback_web;
GRANT SELECT, INSERT, UPDATE ON xiaoan_answer_feedback TO xiaoan_feedback_web;
GRANT SELECT, INSERT ON xiaoan_contact_feedback TO xiaoan_feedback_web;
GRANT INSERT ON xiaoan_admin_access, xiaoan_contact_admin_access TO xiaoan_feedback_web;
GRANT USAGE ON SEQUENCE xiaoan_admin_access_id_seq,
  xiaoan_contact_admin_access_id_seq TO xiaoan_feedback_web;
```

另需对目标数据库授予 CONNECT。登录不需要 SUPERUSER、CREATEDB、CREATEROLE、DELETE 或 DDL 权限。应用启动和请求均不会自动执行迁移。

## 发布与验收

先配置数据库登录、Key Vault secret 引用与前端 `CHATFLOW_DATABASE_URL`，再合并发布。部署 workflow 会检查 secret 引用存在，避免部署缺失数据库配置的版本。

验收：匿名留言提交成功并在 PostgreSQL 存在；未登录访问两个管理 API 返回 401；普通用户与其他管理员返回 403；指定管理员可分页读取两类反馈并产生审计；登录用户可保存、修改、重新读取自己的评分，不能修改其他人的评分。指定管理员浏览器验收与 mock 权限测试分别记录。

旧容器 `contacts.jsonl` 没有自动迁移。更新旧容器之前，应检查是否有历史留言并在有记录时导入 PostgreSQL，保留原 `id` 与 `createdAt`。旧 secret 和 DATA_DIR 已不再使用。

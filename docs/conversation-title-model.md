# 小模型会话标题

新增标题功能使用服务器端 Responses API。默认模型为 `gpt-5.4-mini`；`CHAT_TITLE_MODEL` 可替换。该型号出现在 OpenAI 官方文档的 Context7 索引中；本次未能核实其是否仍为最新型号，也尚未验证账号调用权限。

## 交互与数据

新会话首轮成功保存后，聊天继续正常使用，前端独立请求 `POST /v1/conversations/:id/title`。先显示规则提取的短标题，模型成功后替换；后续用户输入不会触发新的标题生成。刷新或打开历史列表使用 GET，只读取已经生成的标题，不为旧会话批量调用模型。恢复中确认首轮已经成功保存时，也可生成标题。

接口沿用现有会话网关验证账号或游客凭据。浏览器传入的消息或身份不会用于模型输入。接口取得后端验证过的首个仍保留轮次的 response ID，再从同一 PostgreSQL 数据库的 `account_turns.content.user` 读取脱敏文本；不读取展示原文、调试信息或整段会话。

提示词要求概括核心主题、保留否定和不确定性，不补充事实、人物姓名或脱敏占位符。采用严格 JSON 输出，最多 24 个字符；仅有问候时使用“初次交流”。模型请求禁用 Responses 存储、禁止重定向，限制输出及 8 秒超时。标题语义质量仍需真实模型验证。

标题表关联 conversation ID 和来源 response ID，均设置级联删除。读取及生成完成写回时重新检查来源存在、保存方式和有效期限。临时模式不会写入标题；生成期间删除或过期不会重建标题。并发请求通过数据库租约避免重复生成，模型失败记为 fallback，不自动反复付费重试；仅中断且租约到期的 pending 请求允许一次重新领取。

## 启用

仅本地代码和模拟验证已完成，未配置服务密钥、执行数据库迁移或部署。

1. 为前端服务器配置 `CHATFLOW_DATABASE_URL`，指向账号服务使用的同一 PostgreSQL 数据库。
2. 显式执行 `db/migrations/006_conversation_titles.sql`。应用角色需要 SELECT 读取 account_turns、account_conversations、conversation_privacy_policies、conversation_turn_retention，并具有新标题表的 SELECT、INSERT、UPDATE 权限；不需要给账号数据写权限。
3. 配置服务器环境变量：

```dotenv
CHAT_TITLE_API_KEY=<服务器端 OpenAI API 密钥>
CHAT_TITLE_API_BASE=https://api.openai.com/v1/
CHAT_TITLE_MODEL=gpt-5.4-mini
```

4. 使用合成的首句验证真实模型输出、超时回退和持久化，再按项目发布流程上线。当前使用 OpenAI Responses 的 Bearer 认证；若使用 Azure，需要对应兼容端点及可用部署名，不能直接假定同名模型已经部署。

未配置时继续显示现有规则标题。密钥不得设置为 NEXT_PUBLIC 环境变量。

## 验证

定向测试：

```sh
node --test tests/chat-title-model.test.cjs tests/conversation-title.test.cjs tests/chatflow.test.cjs
node_modules/.bin/tsc --project tsconfig.chatflow.json --noEmit
```

模型、授权、并发认领、过期/删除期间的写回及回退路径均使用模拟接口/数据库测试；这些测试不替代实际 PostgreSQL 迁移与模型验收。前端定向浏览器检查使用真实 useChatflow hook 与模拟 HTTP 接口，覆盖生成期间可继续聊天、首轮仅生成一次、刷新读取、旧历史不生成、失败回退及身份切换取消。

# 网站每日体检报告 · 20260929

- 站点：https://ykmys.com
- 检查时间：2026-09-29 00:54:03
- 请求方式：C+（无头浏览器导航过 CF → 同 context evaluate fetch）
- 结果：**发现 10 个问题**

## 问题清单（P0 10 / P1 0 / P2 0）

1. **[P0]** 页面 / 返回异常（HTTP 403），期望 200。建议检查部署状态与 Cloudflare 缓存规则。
2. **[P0]** 页面 /library.html 返回异常（HTTP 403），期望 200。建议检查部署状态与 Cloudflare 缓存规则。
3. **[P0]** 页面 /tools.html 返回异常（HTTP 403），期望 200。建议检查部署状态与 Cloudflare 缓存规则。
4. **[P0]** 页面 /guild.html 返回异常（HTTP 403），期望 200。建议检查部署状态与 Cloudflare 缓存规则。
5. **[P0]** 页面 /builds-guides.html 返回异常（HTTP 403），期望 200。建议检查部署状态与 Cloudflare 缓存规则。
6. **[P0]** 数据文件 /data/members.json 异常（HTTP 403）。建议检查 publish/data 下该文件是否已提交。
7. **[P0]** 数据文件 /data/battles.json 异常（HTTP 403）。建议检查 publish/data 下该文件是否已提交。
8. **[P0]** 数据文件 /data/activities.json 异常（HTTP 403）。建议检查 publish/data 下该文件是否已提交。
9. **[P0]** 数据文件 /data/changelog.json 异常（HTTP 403）。建议检查 publish/data 下该文件是否已提交。
10. **[P0]** 线上 https://ykmys.com/ 或本地 index.html 读取失败（HTTP 403）

## 检查明细

| 检查项 | 结果 | 说明 |
|---|---|---|
| 页面 /（首页） | FAIL | HTTP 403, 5954 bytes |
| 页面 /library.html（资料库） | FAIL | HTTP 403, 6011 bytes |
| 页面 /tools.html（工具） | FAIL | HTTP 403, 6005 bytes |
| 页面 /guild.html（公会） | FAIL | HTTP 403, 6005 bytes |
| 页面 /builds-guides.html（配装攻略） | FAIL | HTTP 403, 6029 bytes |
| 数据 /data/stats.json | OK | HTTP 200, 1991 bytes, JSON OK |
| 数据 /data/members.json | FAIL | HTTP 403, 6026 bytes |
| 数据 /data/battles.json | FAIL | HTTP 403, 6005 bytes |
| 数据 /data/activities.json | FAIL | HTTP 403, 6035 bytes |
| 数据 /data/changelog.json | FAIL | HTTP 403, 6011 bytes |
| 渲染：#dashboardUpdate | OK | 更新于 09-26 |
| 渲染：功勋榜 TOP5 | OK | 傲慢50650 / 醉摇摆47750 / 手插兜39450 / 烬36750 / 本射34000 |
| 渲染：公告区条数 | OK | 3 条 |
| 本地/线上 index.html 差异 | FAIL | 线上 https://ykmys.com/ 或本地 index.html 读取失败（HTTP 403） |

## 本地 vs 线上差异

- 未能对比（线上或本地 index.html 读取失败）

## Qwen 深度分析（本地 Qwen 32B）

> 由 ask_qwen.py 调用本地 Qwen 32B 生成，仅 P0 级异常触发。

(ASK_QWEN_ENABLED=0，跳过 Qwen 分析；P0 异常 10 条待人工处理)

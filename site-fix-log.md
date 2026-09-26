# ykmys.com 修复日志

**项目**: ykmys.com（《英雄没有闪》公会资料站）
**记录时间**: 2026-09-27

---

## 2026-09-27 全站诊断与修复

### Commit: 0d6a1af — 新增报名管理模块
**类型**: feature
**文件**: worker.js, publish/admin.html
**内容**:
- 后端新增3个API:
  - `PUT /api/signups/:id` — 更新报名状态（pending/approved/cancelled）
  - `GET /api/signups/stats` — 按活动+状态分组统计
  - `GET /api/export/signups` — CSV导出（UTF-8 BOM防乱码）
- 前端新增报名管理模块:
  - 侧边菜单"报名管理"tab
  - 表格展示（游戏ID/活动/职业/备注/状态/提交时间/操作）
  - 活动筛选下拉框 + 状态筛选下拉框
  - 操作按钮：确认→approved、取消→cancelled、删除（二次确认）
  - 导出CSV按钮（fetch+blob下载，token走header）
  - 状态标签颜色：pending黄/approved绿/cancelled灰
  - XSS防护：所有用户输入escapeHtml转义
- 修复admin.html原有showMemberForm语法错误（4处，多了一个`}`）
- 将switchTab函数移至独立script标签，避免受原有语法错误影响
- **测试**: jsdom 31项测试全通过

### Commit: 288061a — P0修复：SEO与安全头
**类型**: fix
**文件**: sitemap.xml, library.html, guild-member-detail.html, _headers
**内容**:
- sitemap.xml添加3个核心聚合页（library/tools/guild），priority=1.0
- library.html添加meta description和canonical
- guild-member-detail.html添加h1标签
- 创建_headers配置文件:
  - 安全头：X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy
  - 静态资源缓存1年（immutable）
  - 数据文件缓存1小时
  - HTML页面不缓存

---

## 修复统计

| 指标 | 数值 |
|------|------|
| 诊断页面数 | 42 |
| 诊断代码行数 | worker.js 697行 + 前端约5000行 |
| 发现问题总数 | 35 |
| 已修复问题 | 8 |
| 待处理问题 | 27（大部分为低优先级优化项） |
| jsdom测试项 | 31项（报名管理模块） |
| Qwen审查项 | worker.js 2片，0问题 |

---

## 待办清单

### P1
- [ ] index.html添加escapeHtml（XSS防护）
- [ ] library.html的runes/darkarmor数据懒加载

### P2
- [ ] 补充49张图片alt属性
- [ ] 外部脚本添加defer
- [ ] 图片WebP转换
- [ ] 侍从desc字段补充（45条）
- [ ] 洗炼词条desc字段补充（300条）

---

*修复日志结束*

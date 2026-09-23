# 全站布局优化规范（执行手册）

## 通用原则
- **只改布局和样式，不改内容**：技能名称、装备名称、数值、描述文字一律不动
- **保持原有主题色**：每个页面的 :root 变量、主题色（战士金橙、法师紫青、游侠绿等）不变
- **不删除任何内容**：只调整 HTML 结构和 CSS
- **备份已在 _backup_20260923/**

---

## 一、装备卡片：2列 → 4列（所有页面必改）

### CSS 修改
找到 `.equip-grid`，将：
```css
.equip-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* 改为下面 */
  gap: 12px;
}
```
改为：
```css
.equip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
```

### 响应式（添加/修改 media query）
```css
@media (max-width: 900px) {
  .equip-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .equip-grid { grid-template-columns: 1fr; }
}
```
如果已有 `@media (max-width: 720px)` 或 `@media (max-width: 600px)` 包含 `.equip-grid { grid-template-columns: 1fr; }`，需要拆分：900px 断点设为2列，600px 断点设为1列。

### 装备卡片紧凑化（4列下必须）
`.equip-card` padding 从 `14px 16px` 改为 `10px 12px`。
`.equip-header` margin-bottom 从 `10px` 改为 `6px`，padding-bottom 从 `8px` 改为 `6px`。
`.equip-name` font-size 从 `15px` 改为 `14px`。
`.equip-slot` font-size 保持 `12px`。
`.affix-tag` 保持原样（会自动换行）。
`.equip-note` font-size 保持 `11px`，margin-top 改为 `6px`，padding 改为 `6px 8px`。

---

## 二、技能卡片：3列布局（3+2排列）

### Pattern A（已有 .grid .item-card 详细卡片的页面）
找到技能详情的 grid 容器（class="grid" 且内含5个 item-card），添加 `skill-detail-grid` 类：
```html
<div class="grid skill-detail-grid">
```
确保 CSS 中有：
```css
.skill-detail-grid {
  grid-template-columns: repeat(3, 1fr);
}
.skill-detail-grid .item-card {
  align-items: stretch;
}
.skill-detail-grid .item-info {
  display: flex;
  flex-direction: column;
}
.skill-detail-grid .item-desc {
  flex: 1;
}
@media (max-width: 900px) {
  .skill-detail-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .skill-detail-grid { grid-template-columns: 1fr; }
}
```
如果页面已有 `.skill-detail-grid` 定义（如 youxia-gandian.html），跳过。

### Pattern B（使用 .skill-row 紧凑5列的页面）
将 `.skill-row` 的5个 `.skill-item` 重构为3列卡片布局：
1. CSS 中添加 `.skill-detail-grid` 定义（同上）
2. HTML 中将 `<div class="skill-row">` 改为 `<div class="grid skill-detail-grid">`
3. 每个 `.skill-item` 改为 `.item-card` 结构：
```html
<div class="item-card">
  <div class="item-icon icon-skill">🪓</div>
  <div class="item-info">
    <div class="item-name">破伤·粉碎</div>
    <div class="item-desc">主动技能</div>
  </div>
</div>
```
注意：Pattern B 的技能没有详细描述，item-desc 放技能类型（主动/核心等）或留空。
需要添加 `.item-card`, `.item-icon`, `.item-info`, `.item-name`, `.item-desc`, `.icon-skill` 的 CSS（参考 youxia-gandian.html 中的定义，颜色用当前页面主题色）。

---

## 三、技能流程条（顶部5节点横向排列）

### Pattern B 页面缺少流程条，需要添加
在技能 section 内、技能卡片上方添加：
```html
<div class="skill-flow">
  <div class="flow-node"><div class="label">基础技</div><div class="name">技能名</div></div>
  <div class="flow-arrow">→</div>
  <div class="flow-node"><div class="label">核心技</div><div class="name">技能名</div></div>
  <div class="flow-arrow">→</div>
  <div class="flow-node"><div class="label">掌控1</div><div class="name">技能名</div></div>
  <div class="flow-arrow">→</div>
  <div class="flow-node"><div class="label">掌控2</div><div class="name">技能名</div></div>
  <div class="flow-arrow">→</div>
  <div class="flow-node"><div class="label">终极技</div><div class="name">技能名</div></div>
</div>
```
技能名称从原 `.skill-row` 的5个技能中按顺序提取（基础→核心→掌控1→掌控2→终极）。
如果原页面技能没有明确标注类型，按游戏常规顺序排列。

### CSS 添加
```css
.skill-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.flow-node {
  background: var(--bg-card2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
  min-width: 90px;
}
.flow-node .label { font-size: 10px; color: var(--text-dim); }
.flow-node .name { font-size: 13px; font-weight: bold; color: var(--text-bright); }
.flow-arrow { color: var(--gold); font-size: 18px; }
@media (max-width: 600px) {
  .skill-flow { flex-direction: column; }
  .flow-arrow { transform: rotate(90deg); }
}
```
`.flow-arrow` 颜色用页面主题色（如战士用 --orange 或 --gold，法师用 --purple 或 --cyan）。

### Pattern A 已有流程条的页面
检查 `.skill-flow` 是否存在，如已有则跳过，确保响应式正确。

---

## 四、被动技能 + 侍从：并排显示（左右两栏）

### Pattern A（被动和侍从是独立 section）
将"被动技能"section 和"侍从/随从"section 合并为一个 section：
```html
<div class="section">
  <div class="section-title">被动技能与侍从</div>
  <div class="passive-minion-grid">
    <div class="pm-col">
      <div class="pm-subtitle">被动技能</div>
      <!-- 原被动技能的4个 item-card -->
    </div>
    <div class="pm-col">
      <div class="pm-subtitle">侍从</div>
      <!-- 原侍从的3个 item-card -->
    </div>
  </div>
</div>
```
CSS：
```css
.passive-minion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.pm-subtitle {
  font-size: 14px;
  color: var(--gold);
  font-weight: bold;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
}
.pm-col .item-card {
  margin-bottom: 8px;
}
@media (max-width: 700px) {
  .passive-minion-grid { grid-template-columns: 1fr; }
}
```
如果被动技能用的是 `.grid`（自动多列），在左栏内改为单列堆叠（每个 item-card 占满宽度）。

### Pattern B（已有 .sub-row 并排）
`.sub-row` 已经是左右两栏，保持结构。优化：
- `.sub-title` 字号改为 `14px`，颜色用主题色，加底部边框
- `.sub-tag` 保持不变
- 确保两栏间距合理

---

## 五、刻印搭配：5个位置用 3+2 网格

### Pattern A（刻印用 .grid）
将刻印的 `.grid` 改为指定3列：
```css
.engrave-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
@media (max-width: 700px) {
  .engrave-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 500px) {
  .engrave-grid { grid-template-columns: 1fr; }
}
```
HTML 中将刻印容器的 `class="grid"` 改为 `class="engrave-grid"`。
5个 item-card 在3列网格中自然形成 3+2 排列（第2行2个左对齐）。

### Pattern B（刻印用 .engrave-row 5列）
将 `.engrave-row` 从 `repeat(5, 1fr)` 改为 `repeat(3, 1fr)`：
```css
.engrave-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
```
响应式：700px→2列，500px→1列。
`.engrave-item` 保持原有样式，5个在3列中形成3+2。

如果页面有两组刻印（如 huodao-shouling 有两个 engrave-row），两组都改。

---

## 六、图标统一规范

所有图标（技能/装备/刻印/侍从）检查：
- `.item-icon`：48-52px 正方形，`border-radius: 8px`，居中，`font-size: 24px`
- `.equip-card` 内没有图标（用 emoji slot 标签），保持不变
- `.engrave-item .e-icon`：36px 可保持，但建议统一到 40px，`border-radius: 6px`
- `.skill-item .icon`（Pattern B 转换后不再使用）
- `.book-item .b-icon`：36px 保持（书籍供奉是独立模块）

---

## 七、标题规范

- `.section-title`：已有左边框4px，字号18-19px，bold — 保持
- 子标题（被动/侍从）：用 `.pm-subtitle` 或 `.sub-title`，字号14px，主题色，底部边框
- 卡片内装备名称：`.equip-name` 14-15px bold
- 卡片内描述：12-13px，text-dim 颜色

---

## 八、核心配装概要（如有此 section）

使用 2-3 列网格，禁止单列：
```css
.core-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
```
如果内容是文字列表，用 `repeat(2, 1fr)`。

---

## 九、空白利用检查

修改后检查：
- 没有任何区域出现超过100px的无内容空白
- 被动+侍从并排后不会出现一侧过高一侧过矮的严重失衡（如差异过大，可在矮的一侧底部加说明文字或调整卡片间距）
- 装备4列后卡片内容不溢出（affix-tag 会自动换行，正常）

---

## 十、各页面特定注意事项

### youxia-gandian.html
- 技能卡片已是3列（skill-detail-grid），**不要改这部分**
- 需要改：装备2列→4列、被动和侍从合并并排、刻印3+2、图标检查

### huodao-shouling.html
- 有"三职业首领战流派对应"特殊 section，保持不变
- 有两个 engrave-row，都要改3列
- 有"核心配装概要"section，确保用多列网格
- 主动技能部分检查结构（可能不是 skill-row）

### fashi-leidian-shaquan.html
- 最近修改过（9/23），注意不要覆盖已有修复
- Pattern B，需全面转换

### 所有页面
- 导航栏 `.site-nav` 不要动
- `:root` 变量不要动
- footer 不要动
- 词条图例 `.affix-legend` 保持不变

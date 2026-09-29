#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
daily_check.py —— 英雄没有闪资料站 每日网站体检（C+ 版，2026-09-28 改造）

【v2 改造（Phase A）】
1. 所有 HTTP 请求改走 C+ 路径：Playwright 无头导航首页过 CF 质询（浏览器自动执行
   challenge JS 拿 clearance cookie）→ 同 context 内 page.evaluate(fetch) 发请求。
   两轮 GH Actions 探针实测：curl/urllib 任何头组合都会被 CF 质询（TLS 指纹拦截），
   浏览器导航稳定通过；PoC（cplus-poc.py）实测 evaluate fetch 取到真实 JSON。
2. 路径相对化：LOCAL_INDEX / REPORT_DIR 支持环境变量覆盖，默认相对仓库根
   （CI 场景），本地跑用环境变量指到实际路径即可。
3. Qwen 调用条件化：ASK_QWEN_ENABLED 读环境变量（默认开）；且仅 P0 级异常
   （页面/数据/渲染不可用）才调 ask_qwen.py，P1/P2 只记录不调用。
4. EXPECT_UPDATE 改为格式校验（r"更新于 \\d{2}-\\d{2}"），不再锁具体日期。
5. 收尾模式：不用 with sync_playwright()、绝不调 browser.close()（本机会阻塞）；
   报告先落盘，__main__ 用 os._exit(code) 终止（cplus-poc.py 再次实证）。

【执行原则】
1. 只读线上：GET + 无头渲染，不向线上写任何数据。
2. 退出码：0 = 全部通过；1 = 存在失败项。

【检查项】
1. HTTP 状态码：5 个核心页面全部 200（C+ fetch）
2. HTTP 状态码：5 个 /data/*.json 全部 200 + JSON 可解析（C+ fetch）
3. Playwright 真实渲染首页断言（dashboardUpdate 格式 / 功勋榜 TOP5 / 公告条数）
4. 本地 vs 线上 index.html diff（剥离 Cloudflare 注入后对比）
5. 【仅 P0 级异常时触发】异常汇总交本地 Qwen 32B 做根因分析，失败优雅降级
"""

from __future__ import annotations

import datetime
import difflib
import json
import os
import re
import subprocess
import sys

# ---------------------------------------------------------------- 配置区

BASE = "https://ykmys.com"

# 相对化（Phase A）：环境变量可覆盖；默认相对仓库根（CI 场景）
LOCAL_INDEX = os.environ.get("LOCAL_INDEX", "index.html")
REPORT_DIR = os.environ.get("REPORT_DIR", ".")
REPORT_FMT = "daily-check-{date}.md"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
TIMEOUT = 25
NAV_WAIT_MS = 3000          # C+：导航后等质询 JS 执行完、拿 clearance cookie
FETCH_TIMEOUT_MS = 25000

# 检查项 1：核心页面
PAGES = [
    ("/", "首页"),
    ("/library.html", "资料库"),
    ("/tools.html", "工具"),
    ("/guild.html", "公会"),
    ("/builds-guides.html", "配装攻略"),
]

# 检查项 2：数据 JSON
DATA_FILES = [
    "/data/stats.json",
    "/data/members.json",
    "/data/battles.json",
    "/data/activities.json",
    "/data/changelog.json",
]

# 检查项 3：渲染断言
# v2：dashboardUpdate 改为格式校验（数据更新后不再误报）
EXPECT_UPDATE_RE = re.compile(r"更新于 \d{2}-\d{2}")
EXPECT_TOP5 = [
    ("傲慢", "50650"),
    ("醉摇摆", "47750"),
    ("手插兜", "39450"),
    ("烬", "36750"),
    ("本射", "34000"),
]
EXPECT_ANNOUNCE = 3

# 检查项 5：Qwen 深度分析（C+ 版：读环境变量 + 仅 P0 级异常才调）
ZYB_ROOT = os.environ.get("ZYB_ROOT", r"D:\ZYB")
ASK_QWEN_ENABLED = (os.environ.get("ASK_QWEN_ENABLED", "1") == "1"
                    and os.environ.get("SKIP_QWEN") != "1")
ASK_QWEN_SCRIPT = os.environ.get(
    "ASK_QWEN_SCRIPT", os.path.join(ZYB_ROOT, "tools", "ask_qwen.py"))
ASK_QWEN_TIMEOUT = 240
ASK_QWEN_BRIEF = os.environ.get(
    "ASK_QWEN_BRIEF", os.path.join(ZYB_ROOT, "shared", "artifacts", "_dailycheck-issues.txt"))


def log(msg: str) -> None:
    try:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
    except Exception:
        pass


# ---------------------------------------------------------------- 异常分级
# P0 = 可用性故障（页面/数据/渲染整体不可用）→ 才调 Qwen
# P1 = 内容异常（TOP5/公告/更新日期与预期不符）
# P2 = 本地/线上 diff 类

_P0_HINTS = ("返回异常", "JSON 解析失败", "渲染过程出错", "未渲染出",
             "403", "500", "超时", "无法")
_P2_HINTS = ("差异", "对比 index.html")


def issue_severity(msg: str) -> str:
    if any(h in msg for h in _P0_HINTS):
        return "P0"
    if any(h in msg for h in _P2_HINTS):
        return "P2"
    return "P1"


# ---------------------------------------------------------------- C+ 请求

_EVAL_FETCH = """async ([u, t]) => {
    try {
        const resp = await fetch(u, {credentials: 'same-origin',
                                     signal: AbortSignal.timeout(t)});
        const text = await resp.text();
        return {status: resp.status, len: text.length, text: text};
    } catch (e) {
        return {status: 0, len: 0, text: '', error: String(e)};
    }
}"""


def cplus_fetch_via_evaluate(page, url: str):
    """fallback：同 context 内 evaluate(fetch)。返回 {status, len, text, error?}。"""
    return page.evaluate(_EVAL_FETCH, [url, FETCH_TIMEOUT_MS])


def cplus_fetch(page, url: str):
    """E变体：ctx.new_page() 开独立页面 goto，不碰主 page。
    若 403 → wait 3s 让质询 JS 执行 → 重试一次。
    失败 → fallback 到 evaluate(fetch)。
    返回 {status, len, text, error?}。"""
    ctx = page.context
    tmp = None
    try:
        tmp = ctx.new_page()
        resp = tmp.goto(url, wait_until="domcontentloaded", timeout=15000)
        status = resp.status if resp else 0
        # 403 且是 CF 质询 → 等 3 秒让质询 JS 执行，重试一次
        if status == 403:
            tmp.wait_for_timeout(3000)
            resp = tmp.goto(url, wait_until="domcontentloaded", timeout=15000)
            status = resp.status if resp else 0
        text = resp.text() if resp else ""
        return {"status": status, "len": len(text), "text": text}
    except Exception as e:
        # goto 失败 → fallback 到 evaluate(fetch)
        try:
            return cplus_fetch_via_evaluate(page, url)
        except Exception as e2:
            return {"status": 0, "len": 0, "text": "", "error": str(e2)}
    finally:
        if tmp:
            try:
                tmp.close()
            except Exception:
                pass


# ---------------------------------------------------------------- diff 工具

_SCRIPT_RE = re.compile(r"<script\b[^>]*>(.*?)</script>", re.S | re.I)
_CF_MARKERS = (
    "__CF$cv$params",
    "/cdn-cgi/challenge-platform",
    "cloudflareinsights",
    "beacon.min.js",
)


def strip_cf_injection(html: str) -> str:
    """剥离 Cloudflare 注入的 script（内联 challenge + 外链 beacon，匹配整段标签）。"""
    out = []
    pos = 0
    for m in _SCRIPT_RE.finditer(html):
        whole = m.group(0)
        if not any(marker in whole for marker in _CF_MARKERS):
            continue
        start, end = m.start(), m.end()
        line_start = html.rfind("\n", 0, start) + 1
        if html[line_start:start].strip() == "":
            line_end = html.find("\n", end)
            if line_end != -1 and html[end:line_end].strip() == "":
                start, end = line_start, line_end + 1
        out.append(html[pos:start])
        pos = end
    out.append(html[pos:])
    return "".join(out)


def normalize_html(html: str) -> str:
    """归一化：去 BOM、去 CF 注入、统一行尾、忽略空白行。"""
    if html.startswith("\ufeff"):
        html = html[1:]
    html = strip_cf_injection(html)
    html = html.replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln for ln in html.split("\n") if ln.strip() != ""]
    return "\n".join(lines)


def diff_stat(local: str, online: str):
    """返回 (变更行数, 新增行数, 删除行数, opcodes)。"""
    a = normalize_html(local).split("\n")
    b = normalize_html(online).split("\n")
    added = deleted = 0
    ops = []
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b).get_opcodes():
        if tag == "equal":
            continue
        deleted += i2 - i1
        added += j2 - j1
        ops.append(
            {
                "tag": tag,
                "local_lines": [i1 + 1, i2],
                "online_lines": [j1 + 1, j2],
                "local_sample": a[i1: min(i2, i1 + 4)],
                "online_sample": b[j1: min(j2, j1 + 4)],
            }
        )
    return deleted + added, added, deleted, ops


# ---------------------------------------------------------------- 渲染断言（同 context）

_JS_TOP5 = """
() => {
  const cards = Array.from(document.querySelectorAll('.activity-card'));
  const card = cards.find(c => {
    const t = c.querySelector('.activity-card-title');
    return t && t.textContent && t.textContent.includes('功勋榜');
  });
  if (!card) return null;
  return Array.from(card.querySelectorAll('.attendance-item')).slice(0, 5).map(it => {
    const n = it.querySelector('.attendance-name');
    const c = it.querySelector('.attendance-count');
    return {
      name: n ? n.textContent.trim() : '',
      count: c ? c.textContent.trim() : ''
    };
  });
}
"""


def render_checks(page, issues: list, checks: list):
    """在已过 CF 的同一 page 上做渲染断言。失败写入 issues。"""
    # --- 3.1 dashboardUpdate（v2：格式校验，不锁具体日期）
    el = page.query_selector("#dashboardUpdate")
    update_text = el.inner_text().strip() if el else ""
    if EXPECT_UPDATE_RE.search(update_text):
        checks.append(("渲染：#dashboardUpdate", True, update_text))
    else:
        checks.append(("渲染：#dashboardUpdate", False, update_text))
        issues.append(
            "首页 #dashboardUpdate 不含「更新于 MM-DD」格式，实际为「%s」。"
            "通常是 /data/stats.json 未部署或 dashboard.data_date 缺失。"
            % (update_text or "(空)")
        )

    # --- 3.2 功勋榜 TOP5
    top5 = page.evaluate(_JS_TOP5)
    if not top5:
        checks.append(("渲染：功勋榜 TOP5", False, "未找到功勋榜卡片"))
        issues.append(
            "首页未渲染出「功勋榜」卡片（.activity-card 内不含标题「功勋榜」），"
            "可能 HTML 结构被改动。"
        )
    else:
        bad = []
        for idx, (exp_name, exp_num) in enumerate(EXPECT_TOP5):
            got = top5[idx] if idx < len(top5) else {"name": "", "count": ""}
            got_num = re.sub(r"[,\s]", "", got.get("count", ""))
            if exp_name not in got.get("name", "") or got_num != exp_num:
                bad.append(
                    "第%d名 期望 %s/%s，实际 %s/%s"
                    % (idx + 1, exp_name, exp_num,
                       got.get("name") or "(空)", got_num or "(空)")
                )
        if bad:
            checks.append(("渲染：功勋榜 TOP5", False, "; ".join(bad)))
            issues.append("首页功勋榜 TOP5 与预期不符：" + "；".join(bad))
        else:
            checks.append(
                (
                    "渲染：功勋榜 TOP5",
                    True,
                    " / ".join(
                        "%s%s" % (re.sub(r"天涯丶", "", t["name"]),
                                  re.sub(r"[,\s]", "", t["count"]))
                        for t in top5
                    ),
                )
            )

    # --- 3.3 公告条数
    ann = page.eval_on_selector_all(
        "#announcementScroll .announcement-item", "els => els.length"
    )
    if ann == EXPECT_ANNOUNCE:
        checks.append(("渲染：公告区条数", True, "%d 条" % ann))
    else:
        checks.append(("渲染：公告区条数", False, "%d 条" % ann))
        issues.append(
            "首页公告区期望渲染 %d 条，实际 %d 条。"
            "通常是 /api/announcements 返回异常（或硬编码兜底被改动）。"
            % (EXPECT_ANNOUNCE, ann)
        )


# ---------------------------------------------------------------- Qwen（仅 P0）

def qwen_deep_analysis(issues, checks):
    """仅当存在 P0 级异常时，把汇总交给本地 Qwen 32B 根因分析。

    返回 None（无异常）或说明/分析文本。绝不抛异常。
    """
    if not issues:
        return None

    p0 = [m for m in issues if issue_severity(m) == "P0"]
    if not p0:
        return ("(策略：仅 P0 级异常调用 Qwen；本次 %d 条均为 %s 级，已记录不分析)"
                % (len(issues),
                   "/".join(sorted({issue_severity(m) for m in issues}))))
    if not ASK_QWEN_ENABLED:
        return "(ASK_QWEN_ENABLED=0，跳过 Qwen 分析；P0 异常 %d 条待人工处理)" % len(p0)
    if not os.path.isfile(ASK_QWEN_SCRIPT):
        return "(找不到 ask_qwen.py：%s)" % ASK_QWEN_SCRIPT

    buf = ["# 网站体检异常汇总（P0 级）", ""]
    buf.append("检查时间：%s" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    buf.append("站点：%s" % BASE)
    buf.append("")
    buf.append("## P0 异常（触发 Qwen 分析的条目）")
    buf.append("")
    for i, m in enumerate(p0, 1):
        buf.append("%d. %s" % (i, m))
    buf.append("")
    failed = [(n, d) for n, ok, d in checks if not ok]
    if failed:
        buf.append("## 失败检查项（全部）")
        buf.append("")
        for n, d in failed:
            buf.append("- %s | %s" % (n, d))
    buf.append("")

    try:
        os.makedirs(os.path.dirname(ASK_QWEN_BRIEF), exist_ok=True)
        with open(ASK_QWEN_BRIEF, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(buf))
    except Exception as e:  # noqa: BLE001
        return "(写入异常汇总失败：%s)" % e

    cmd = [
        sys.executable, ASK_QWEN_SCRIPT,
        "--task-type", "incident-analysis",
        "--input-file", ASK_QWEN_BRIEF,
        "--timeout", str(max(30, ASK_QWEN_TIMEOUT - 30)),
    ]
    log("\n[5/5] 检测到 %d 个 P0 异常 → 调用本地 Qwen 32B 根因分析" % len(p0))
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=ASK_QWEN_TIMEOUT,
                              encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired:
        log("  Qwen 分析超时（%d 秒）" % ASK_QWEN_TIMEOUT)
        return "(Qwen 分析超时，已跳过；可调大 ASK_QWEN_TIMEOUT)"
    except Exception as e:  # noqa: BLE001
        log("  Qwen 调用失败：%s" % e)
        return "(Qwen 调用失败：%s)" % e

    out = (proc.stdout or "").strip()
    if proc.returncode != 0:
        log("  Qwen 返回码 %d" % proc.returncode)
        err_lines = [x for x in (proc.stderr or "").strip().splitlines() if x.strip()]
        if err_lines:
            out += "\n\n> Qwen 进程返回码 %d，stderr 末尾：\n> %s" % (
                proc.returncode, " / ".join(err_lines[-3:]))
    log("  Qwen 分析完成（%d 字符）" % len(out))
    return out or "(Qwen 无输出)"


# ---------------------------------------------------------------- 报告

def build_report(date_str, checks, issues, diff_info, qwen_note=None):
    all_ok = not issues
    lines = []
    lines.append("# 网站每日体检报告 · %s" % date_str)
    lines.append("")
    lines.append("- 站点：%s" % BASE)
    lines.append("- 检查时间：%s" % datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    lines.append("- 请求方式：C+（无头浏览器导航过 CF → 同 context evaluate fetch）")
    lines.append("- 结果：**%s**" % ("全部正常" if all_ok else "发现 %d 个问题" % len(issues)))
    lines.append("")

    if all_ok:
        lines.append("全部正常")
        lines.append("")
        lines.append("<details><summary>明细（点击展开）</summary>")
        lines.append("")
        lines.append("| 检查项 | 结果 | 说明 |")
        lines.append("|---|---|---|")
        for name, ok, detail in checks:
            lines.append("| %s | %s | %s |" % (name, "OK" if ok else "FAIL", detail))
        lines.append("")
        lines.append("</details>")
    else:
        p0 = [m for m in issues if issue_severity(m) == "P0"]
        p1 = [m for m in issues if issue_severity(m) == "P1"]
        p2 = [m for m in issues if issue_severity(m) == "P2"]
        lines.append("## 问题清单（P0 %d / P1 %d / P2 %d）" % (len(p0), len(p1), len(p2)))
        lines.append("")
        for sev, group in (("P0", p0), ("P1", p1), ("P2", p2)):
            for i, msg in enumerate(group, 1):
                lines.append("%d. **[%s]** %s" % (i, sev, msg))
        lines.append("")
        lines.append("## 检查明细")
        lines.append("")
        lines.append("| 检查项 | 结果 | 说明 |")
        lines.append("|---|---|---|")
        for name, ok, detail in checks:
            lines.append("| %s | %s | %s |" % (name, "OK" if ok else "FAIL", detail))

    lines.append("")
    lines.append("## 本地 vs 线上差异")
    lines.append("")
    if diff_info is None:
        lines.append("- 未能对比（线上或本地 index.html 读取失败）")
    else:
        total, added, deleted, ops = diff_info
        lines.append("- 本地文件：`%s`" % LOCAL_INDEX)
        lines.append("- 已剥离 Cloudflare 注入 script、忽略空白行后对比")
        lines.append(
            "- **差异行数：%d**（新增 %d / 删除 %d；仅计有内容的行）"
            % (total, added, deleted)
        )
        if ops:
            lines.append("")
            lines.append("<details><summary>差异片段（最多 5 处）</summary>")
            lines.append("")
            for op in ops[:5]:
                lines.append(
                    "- `%s` 本地 L%d-%d ↔ 线上 L%d-%d"
                    % (op["tag"], op["local_lines"][0], op["local_lines"][1],
                       op["online_lines"][0], op["online_lines"][1])
                )
                for s in op["local_sample"][:2]:
                    lines.append("  - 本地：`%s`" % s.strip()[:140])
                for s in op["online_sample"][:2]:
                    lines.append("  - 线上：`%s`" % s.strip()[:140])
            lines.append("")
            lines.append("</details>")
    lines.append("")

    if qwen_note:
        lines.append("## Qwen 深度分析（本地 Qwen 32B）")
        lines.append("")
        lines.append("> 由 ask_qwen.py 调用本地 Qwen 32B 生成，仅 P0 级异常触发。")
        lines.append("")
        lines.append(qwen_note.strip())
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------- main

def main() -> int:
    date_str = datetime.date.today().strftime("%Y%m%d")
    checks = []
    issues = []
    diff_info = None

    log("=" * 62)
    log("英雄没有闪资料站 · 每日体检（C+ 版）  %s" % date_str)
    log("=" * 62)

    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        extra_headers = {}
        if os.environ.get("CF_ACCESS_CLIENT_ID"):
            extra_headers["CF-Access-Client-Id"] = os.environ["CF_ACCESS_CLIENT_ID"]
        if os.environ.get("CF_ACCESS_CLIENT_SECRET"):
            extra_headers["CF-Access-Client-Secret"] = os.environ["CF_ACCESS_CLIENT_SECRET"]
        ctx = browser.new_context(user_agent=UA,
                                  viewport={"width": 1440, "height": 900},
                                  extra_http_headers=extra_headers)
        page = ctx.new_page()
        page.goto(BASE + "/", wait_until="load", timeout=60000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:  # noqa: BLE001
            pass

        # [CF诊断] 检查 cf_clearance cookie 和页面状态
        try:
            cookies = page.context.cookies()
            cf_clearance = [c for c in cookies if c["name"] == "cf_clearance"]
            log("[CF诊断] cf_clearance 存在: %s (共%d个cookie)" % (bool(cf_clearance), len(cookies)))
            log("[CF诊断] page.title: %s" % page.title())
            log("[CF诊断] page.url: %s" % page.url)
            log("[CF诊断] cookie列表: %s" % ", ".join(sorted(set(c["name"] for c in cookies))))
        except Exception as _e:  # noqa: BLE001
            log("[CF诊断] 诊断异常: %s" % _e)
        page.wait_for_timeout(NAV_WAIT_MS)   # C+：等质询 JS 执行完

        # --- 1. 核心页面（C+ fetch，自动跟随重定向到最终 200）
        log("\n[1/4] 核心页面 HTTP 状态（C+ fetch）")
        for path, label in PAGES:
            r = cplus_fetch(page, BASE + path)
            status = r["status"]
            ok = status == 200
            detail = "HTTP %s, %d bytes" % (status, r["len"])
            if r.get("error"):
                detail += " | %s" % r["error"]
            checks.append(("页面 %s（%s）" % (path, label), ok, detail))
            log("  %-28s %s  %s" % (path, "OK" if ok else "FAIL", detail))
            if not ok:
                issues.append("页面 %s 返回异常（HTTP %s），期望 200。"
                              "建议检查部署状态与 Cloudflare 缓存规则。"
                              % (path, status))

        # --- 2. 数据 JSON（C+ fetch + Python 解析）
        log("\n[2/4] 数据 JSON 状态（C+ fetch）")
        for path in DATA_FILES:
            r = cplus_fetch(page, BASE + path)
            status = r["status"]
            ok = status == 200
            detail = "HTTP %s, %d bytes" % (status, r["len"])
            if ok:
                try:
                    json.loads(r["text"])
                    detail += ", JSON OK"
                except Exception as e:  # noqa: BLE001
                    ok = False
                    detail += ", JSON 解析失败: %s" % e
            elif r.get("error"):
                detail += " | %s" % r["error"]
            checks.append(("数据 %s" % path, ok, detail))
            log("  %-28s %s  %s" % (path, "OK" if ok else "FAIL", detail))
            if not ok:
                issues.append("数据文件 %s 异常（HTTP %s）。"
                              "建议检查 publish/data 下该文件是否已提交。"
                              % (path, status))

        # --- 3. 渲染（同 context，不再新开浏览器）
        log("\n[3/4] 渲染断言（同 context）")
        before = len(checks)
        render_checks(page, issues, checks)
        for name, ok, detail in checks[before:]:
            log("  %s %-24s %s" % ("OK  " if ok else "FAIL", name, detail))

        # --- 4. diff
        log("\n[4/4] 本地 vs 线上 index.html 差异")
        r = cplus_fetch(page, BASE + "/")
        if r["status"] == 200 and os.path.isfile(LOCAL_INDEX):
            try:
                with open(LOCAL_INDEX, encoding="utf-8", errors="replace") as f:
                    local_html = f.read()
                online_html = r["text"]
                diff_info = diff_stat(local_html, online_html)
                total, added, deleted, _ops = diff_info
                log("  差异行数：%d（新增 %d / 删除 %d）" % (total, added, deleted))
                checks.append(("本地/线上 index.html 差异", True,
                               "差异 %d 行（新增 %d / 删除 %d）" % (total, added, deleted)))
            except Exception as e:  # noqa: BLE001
                checks.append(("本地/线上 index.html 差异", False, str(e)))
                issues.append("对比 index.html 失败：%s" % e)
                log("  FAIL %s" % e)
        else:
            msg = "线上 %s 或本地 %s 读取失败（HTTP %s）" % (BASE + "/", LOCAL_INDEX, r["status"])
            checks.append(("本地/线上 index.html 差异", False, msg))
            issues.append(msg)
            log("  FAIL %s" % msg)

    except Exception as e:  # noqa: BLE001
        # 浏览器整体失败：记 P0，报告仍要产出
        msg = "浏览器/导航阶段失败：%r" % e
        checks.append(("C+ 浏览器阶段", False, msg))
        issues.append(msg)
        log("\nFAIL %s" % msg)

    # --- 5. 仅 P0 级异常才调 Qwen
    qwen_note = qwen_deep_analysis(issues, checks)

    # --- 报告落盘（先落盘，后收尾）
    os.makedirs(REPORT_DIR or ".", exist_ok=True)
    report_path = os.path.join(REPORT_DIR or ".", REPORT_FMT.format(date=date_str))
    with open(report_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(build_report(date_str, checks, issues, diff_info, qwen_note))

    log("\n" + "=" * 62)
    if issues:
        log("结果：发现 %d 个问题（P0 %d / P1 %d / P2 %d）"
            % (len(issues),
               sum(1 for m in issues if issue_severity(m) == "P0"),
               sum(1 for m in issues if issue_severity(m) == "P1"),
               sum(1 for m in issues if issue_severity(m) == "P2")))
        for i, msg in enumerate(issues, 1):
            log("  %d. [%s] %s" % (i, issue_severity(msg), msg))
    else:
        log("结果：全部正常")
    log("报告已写入：%s" % report_path)
    log("=" * 62)

    return 1 if issues else 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass
    _code = main()
    try:
        sys.stdout.flush()
        sys.stderr.flush()
    except Exception:  # noqa: BLE001
        pass
    # 本机 Playwright 的 browser.close() 会阻塞 → 一律 os._exit 终止（报告已先落盘）
    os._exit(_code)

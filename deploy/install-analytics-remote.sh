#!/usr/bin/env bash
set -euo pipefail

API_DIR="/var/www/zhouying.cn/5lovelanguages-api"
NGINX_CONF="/etc/nginx/conf.d/zhouying.cn.conf"
SERVICE="five-love-languages-analytics.service"

cd "$API_DIR"
npm install --omit=dev --no-audit --no-fund
mkdir -p data
chmod 700 data
cp "/tmp/$SERVICE" "/etc/systemd/system/$SERVICE"

python3 - "$NGINX_CONF" <<'PY'
from pathlib import Path
import re, sys, time

target = Path(sys.argv[1])
snippet = Path("/tmp/nginx-api-location.conf").read_text()
text = target.read_text()
marker = "location ^~ /5lovelanguages/api/"
blocks = []
for match in re.finditer(r"(?m)^\s*server\s*\{", text):
    depth, end = 0, None
    for pos in range(match.start(), len(text)):
        if text[pos] == "{": depth += 1
        elif text[pos] == "}":
            depth -= 1
            if depth == 0:
                end = pos + 1
                break
    if end:
        block = text[match.start():end]
        if re.search(r"\bserver_name\s+zhouying\.cn(?:\s|;)", block):
            blocks.append((match.start(), end, block))

if not blocks:
    raise SystemExit("未找到 zhouying.cn 的 Nginx server 块")

insertions = []
for start, _, block in blocks:
    if marker in block:
        continue
    location = re.search(r"(?m)^[ \t]+location\s+/\s*\{", block)
    if not location:
        raise SystemExit("未找到可插入 API 路由的位置")
    insertions.append(start + location.start())

if insertions:
    backup = target.with_suffix(target.suffix + f".bak-{int(time.time())}")
    backup.write_text(text)
    for position in reversed(insertions):
        text = text[:position] + snippet + "\n" + text[position:]
    target.write_text(text)
    print(f"已备份 Nginx 配置到 {backup}")
    print(f"已向 {len(insertions)} 个 zhouying.cn 服务块补充 API 路由")
else:
    print("所有 zhouying.cn 服务块均已有 API 路由")
PY

nginx -t
systemctl daemon-reload
systemctl enable --now "$SERVICE"
systemctl restart "$SERVICE"
curl --fail --silent http://127.0.0.1:3025/health
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
else
    # Some existing hosts run Nginx directly instead of through systemd.
    nginx -s reload
fi
echo
echo "匿名统计服务部署完成"

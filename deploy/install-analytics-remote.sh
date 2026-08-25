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
import sys, time

target = Path(sys.argv[1])
snippet = Path("/tmp/nginx-api-location.conf").read_text()
text = target.read_text()
marker = "location ^~ /5lovelanguages/api/"
if marker not in text:
    server_pos = text.find("server_name zhouying.cn")
    if server_pos < 0:
        raise SystemExit("未找到 zhouying.cn 的 Nginx server 块")
    location_pos = text.find("    location / {", server_pos)
    if location_pos < 0:
        raise SystemExit("未找到可插入 API 路由的位置")
    backup = target.with_suffix(target.suffix + f".bak-{int(time.time())}")
    backup.write_text(text)
    target.write_text(text[:location_pos] + snippet + "\n" + text[location_pos:])
    print(f"已备份 Nginx 配置到 {backup}")
else:
    print("Nginx API 路由已存在")
PY

nginx -t
systemctl daemon-reload
systemctl enable --now "$SERVICE"
systemctl restart "$SERVICE"
curl --fail --silent http://127.0.0.1:3025/health
systemctl reload nginx
echo
echo "匿名统计服务部署完成"

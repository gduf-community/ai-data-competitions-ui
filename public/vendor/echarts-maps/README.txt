将地图脚本下载到当前目录。

已使用：
- `china.js`
- `world.js`（世界地图，缺失时会先尝试 CDN 回退）

推荐来源：
https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/china.js
https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/world.js

Windows PowerShell：
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/china.js" -OutFile "public/vendor/echarts-maps/china.js"
Invoke-WebRequest -Uri "https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/world.js" -OutFile "public/vendor/echarts-maps/world.js"

Linux/macOS：
curl -L "https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/china.js" -o public/vendor/echarts-maps/china.js
curl -L "https://cdn.jsdelivr.net/npm/echarts-maps@1.1.0/world.js" -o public/vendor/echarts-maps/world.js

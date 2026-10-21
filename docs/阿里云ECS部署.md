# 阿里云 ECS Web 部署与更新

2026-10-21 11:18 UTC交接记录，替换旧候选方案。Web已部署 `4fefbe6baf93e44c14b49818455b11d94b65d990`，实际目录 `/srv/competition-web/mail-pair-e19db6a6/releases/4fefbe6baf93e44c14b49818455b11d94b65d990`；配对API `e19db6a64588b2d6004027dfd17a0db2d86c7e84`。Web源码SHA与旧包相同，但新包SHA256为 `2ad21c0ffa803c5450e0c952ce3e7bf543c35904e64821361d44be9e5baff0af`、20461468B，使用独立mail-pair路径，不覆盖同SHA旧目录。

主站HTTPS ai-data-competitions.cn，www与HTTP301至主站。nginx→127.0.0.1:13000 Web→127.0.0.1:13001 API；不得新增直达API公网入口。Web环境仅七项，见[样例](../deploy/ecs/runtime.env.example)，不含AUTH_SECRET/DB/OSS/Redis/邮件凭据。入口覆盖客户端IP头，不信任浏览器自填XFF。

## 服务和内存事故

competition-web.service enabled、DynamicUser=yes，共享competition-apps.slice；通过ecs-start.mjs启动server.js。release代码root只读，无广泛可写.next；PrivateTmp磁盘支持，页缓存仍计入cgroup。unit设置oldspace192MiB和BFF_UPLOAD_TIMEOUT_SECONDS1260，env文件不覆盖unit拥有的设置。root私有日志在 `/opt/competition-staging/formal-service-logs-20261021/web.*`。

截至2026-10-21 11:18 UTC，故障恢复后的300.6秒观察通过：10次ready和公网首页均200，原PID未变，重启及high/max/OOM/swap增量均0。最低主机可用812.4MiB，API/Web/共享slice采样最大288.1/109.7/400.6MiB。这是恢复证据，不是高流量容量保证。内存同值持久化已完成：systemctl set-property写入 `/etc/systemd/system.control` 对应API/Web/shared的MemoryHigh/MemoryMax文件，生效值逐项一致、noRestart=true；ready200/0.009s、主页200/0.481s、MLflow200。该目录优先级高，不能假称修改base unit就必然改变生效值。

已生效预算：API640/768MiB、Web384/512MiB、共享896/1024MiB（high/max）。CPU各50%/共享100%，swap全部0，TasksMax各64/共享128。旧API256MiB high低于真实匿名内存，引发约90%PSI，服务active但接口超时；提高软限额后原PID恢复，不是重启修复。MLflow server实占约1.641GiB且未修改，不假定可随意缩小其内存。用户确认无痕可用，普通浏览器旧状态可能影响访问，具体缓存类型未证实。

[服务模板](../deploy/ecs/competition-web.service.example)和[内存drop-in](../deploy/ecs/memory-budget.conf.example)是交接事实整理而非原文件逐字导出；Node绝对路径 `/usr/bin/node` 已由目标交接核实；每次更新仍须核对运行版本与配对路径。共享slice由API配置统一维护。无RuntimeMaxSec/LimitFSIZE16MiB，Restart5s、3次/60s、Stop30s、OOMPolicy stop、143正常退出。停机先排空上传，不用30秒超时截断业务。

## 上传、反代和维护

正式主站配置历史名称仍 `/etc/nginx/conf.d/competition-maintenance-20261021.conf`，内容实际为正式vhost。精确/api/uploads用HTTP1.1、101m、request_buffering off、next_upstream off、ignore_client_abort off，覆盖Host和可信IP。API总1200秒、BFF总1260秒、nginx上传闲置1320秒，其他路由120秒/connect5秒；闲置超时不是总预算。业务限制仍20MiB单文件/100MiB合计/10文件。

维护与正式配置二选一；503/Retry-After300/no-store，独立公共维护HTML，无第三方资源，ACME例外。只备份替换竞赛站点文件，nginx -t成功再reload；不改MLflow vhost/全局配置。证书及HTTP01续签已建立，两域challenge绕过跳转和维护；私钥不入仓库。详细入口/TLS/备份见[API部署记录](https://github.com/gduf-community/competition-Q-A-website/blob/migration/aliyun-ecs-rds-oss/docs/阿里云迁移部署.md)。

## 配对更新与验证边界

Linux x64、Node22.23.3、pnpm10.34.5离线构建，双向manifest和payload摘要必须核验。只暂存不等于激活。main新增奖项页面须配套API0033/0034及独立密钥，不能先发Web；已开始新写入，不能回旧Zeabur/旧库。代码回滚需兼容当前数据，保留完整旧pair，维护/排空/备份后协调。

Web push/PR自动CI但不部署、不晋级production；旧平台订阅仍是独立风险。全部配置、文档、PR准备完毕且故障收口后才推进更新，本轮仅本地整理。

Resend sending-only状态查询可能403，注册提示unconfirmed并保留码；输入与提交不阻断，发送按钮冷却60秒，不自动重发。用户授权测试邮件已收到，不据此声称自动化注册/登录全链路完成。真实QA：首页/ready200、公开图片哈希、私有头像匿名401通过；完整容量和真实用户会话不由本地单测代替。

后续每次发布必须核对systemctl show的生效MemoryHigh/MemoryMax及DropInPaths（包括system.control），并对真实应用连续观察至少300秒：readiness和公网页面成功、PID/重启记录、父子cgroup high/max/OOM/swap事件增量、PSI阻塞增量/比例及主机MemAvailable。仅首页一次200、仅无OOM或合成fixture通过均不能放行。机器余量阈值需按同机MLflow实际占用批准，不通过压低其资源伪造通过。

现网校准模板：[正式入口](../deploy/ecs/nginx/competition-main.conf)、[维护入口](../deploy/ecs/nginx/competition-maintenance.conf)、[静态公告](../deploy/ecs/nginx/maintenance.html)。两种入口必须二选一；先准备必要目录与权限，仅替换主站配置，经 nginx -t 后再经授权 reload，不能覆盖 MLflow 配置。这些是离线模板，不是自动安装器。

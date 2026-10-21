# 阿里云 ECS Web 部署候选方案

2026-10-21：本分支交付离线 standalone 产物与独立 systemd 模板，尚未部署；API/RDS/OSS 由 API 仓库管理。Web 继续只持有 API 服务令牌和入口配置，不持有数据库、认证签名或对象管理凭据。

已核实正式 origin 为 https://ai-data-competitions.cn，Web 模式 trusted，入口头 x-forwarded-for。新模板的 loopback 13000/13001 为避开旧部署约定的候选端口，不代表已核实空闲；不照搬旧附件 API 的 0.0.0.0:8080 到公网。

## 离线构建与暂存（不自动部署）

目标 ECS 为 Ubuntu 22.04、2 核/4 GiB、40 GiB、1 Mbps，有现有业务和 CPU/磁盘告警。必须先完成主机故障调查、端口/服务/磁盘与内存盘点，不在目标机 install/build，不覆盖已有反代或工作负载。所有下列命令是维护者经核实后执行的流程，本次未执行远端操作。

构建机使用 Linux、与 ECS 一致的架构、Node 22.23.3 和 pnpm 10.34.5。在干净迁移分支提交上先完成质量检查，再设置 `COMPANION_SHA=<另一仓库完整40位SHA>`，执行 `pnpm run release:ecs`。该入口拒绝脏工作区和根环境文件，使用不含后端凭据的合成构建环境，冻结安装并复用现有 standalone 打包、摘要和解包探针。配对 SHA 写入 manifest；可重建不表示 tar 字节在不同时间完全相同，最终以本次 payload SHA256 为准。

输出 `build/release/runtime.tar.gz` 与 `runtime-manifest.json`。通过已验证的受限上传通道传输这两份文件及同提交的 `deploy/ecs/stage-release.py`；不上传源码、node_modules 安装缓存或秘密到公共对象。1 Mbps 链路须先计算包大小/预计传输时间，使用通道支持的续传并核对最终摘要。上传通道由主线程核实，脚本不假定 SSH 可用，不创建凭据或改安全组。

目标机使用自带 Python3 暂存。`--sha` 与 `--digest` 必须来自受信构建回执，不仅从同一份未验证上传的 manifest 读取。`--releases` 为预先创建且仅该业务可写的独立目录：

```sh
python3 stage-release.py --unit UNIT --payload runtime.tar.gz --manifest runtime-manifest.json --sha SOURCE_SHA --digest TRUSTED_PAYLOAD_SHA256 --releases /opt/competition/UNIT/releases
```

把 UNIT/SOURCE_SHA/TRUSTED_PAYLOAD_SHA256 换成已验证值。脚本校验仓库/角色/SHA/Node/平台/架构/摘要，拒绝越界路径、危险链接、特殊文件和覆盖同 SHA 目录，保留至少 512 MiB 磁盘余量；此下限不代替主机容量评估。成功只生成 releases/SHA，不修改 current、不重启服务、不连接数据库或对象桶。不并发暂存同一 unit。

systemd 文件仅为 `.service.example` 模板：独立用户、独立 /opt/competition/UNIT 与 /etc/competition/UNIT.env；固定私有 loopback 端口（API 13001，Web 13000）须先核实无占用，可用 ECS_PORT 同步修改。上传旧环境秘密时使用受限通道，目标 env 文件 root 所有、0600；不要 shell echo、set -x、命令行参数内嵌或输出文件内容。示例中的 REPLACE_* 不能用作实际值；原盘点附件的占位符也不是凭据。秘密文件不进入 release、git 或归档。保留原 AUTH_SECRET 及实际加密/HMAC key，不能轮换 fallback。

目标预置准确 Node 工具链至模板指定路径，不从系统其他业务的 Node 安装推定兼容。release 目录及所需 .next 缓存的用户权限需在安装时核实。模板不会自动创建用户、安装 unit、切换 current 或更新反代；这些步骤须由主线程在故障解除和容量验证后对精确版本协调执行。

## 切换门禁与回退

先做备份恢复演练、对象清单/字节校验和权限核对，确认源数据库与 RDS PostgreSQL18 的完整业务结构、ICU 中文 collation；禁止不加区别重放含已退役 Geo 表的全量 SQL。新增迁移、搜索回填和社团切换由单一 release runner 独立审批执行，启动无迁移。腾讯补全 worker 不恢复，gduf-mlflow 及既有业务不动。

配对版本在隔离验证通过后安排冻结写入/最终增量同步/原子入口切换。反代只指向 Web，覆盖选定客户端 IP 头为单一有效 IP；不要直接公开 API。主机 loopback 不等于 Web 禁连 RDS/对象管理端：必须另验进程/用户出站隔离。模板未实施网络策略，不能宣称生产私网隔离已完成。

放量前分别验证 API health、ready、登录/CSRF/回调、注册/找回密码、搜索、上传/私有下载、SSE、现有业务未受影响。health 存活和 ready 的 select 1 不能代替 Schema/对象/邮件验收。记录配对 SHA、摘要、目标端口、备份一致恢复点和验收回执。回退只切到已验证兼容版本，保留新列/对象；涉及写入后的数据库恢复需先冻结并处理新增数据，不恢复旧审核写入口，不盲目回滚整台 ECS。

模板：[Web 环境](../deploy/ecs/runtime.env.example)、[systemd](../deploy/ecs/competition-web.service.example)、[启动器](../deploy/ecs/start-runtime.mjs)、[暂存脚本](../deploy/ecs/stage-release.py)。

返回[文档入口](./README.md) · [CI与构建](./CI与构建.md)。

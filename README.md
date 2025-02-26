# vote-svg

`vote-svg` 是一个使用 Cloudflare Workers 构建的项目，旨在提供投票功能并生成 SVG 图像,可以用于在markdown中添加投票功能。

# 前端项目
[https://github.com/bigQY/vote-svg-vue](https://github.com/bigQY/vote-svg-vue)

# demo
[https://vote-svg.qytest.workers.dev/](https://vote-svg.qytest.workers.dev/)


# 投票
![投票结果](https://vote-svg.qytest.workers.dev/api/vote/38/result.svg)
## 投票选项
[选项1](https://vote-svg.qytest.workers.dev/api/vote/38/voteUrl?optionId=161)
[选项2](https://vote-svg.qytest.workers.dev/api/vote/38/voteUrl?optionId=162)
[选项3](https://vote-svg.qytest.workers.dev/api/vote/38/voteUrl?optionId=163)


## 项目结构

```
.editorconfig
.gitignore
.prettierrc
.wrangler/
package.json
pnpm-lock.yaml
sql/
src/
wrangler.toml
```

- .editorconfig, .gitignore, .prettierrc: 配置文件
- `wrangler/`: Cloudflare Wrangler 相关文件
- package.json, pnpm-lock.yaml: 项目依赖管理文件
- sql: 数据库相关文件
- src: 源代码目录
- wrangler.toml: Cloudflare Workers 配置文件

## 主要文件和目录

- index.js: 主入口文件
- router.js: 路由配置
- static: 静态资源目录
- utils.js: 工具函数

## 环境变量

在 wrangler.toml 中配置环境变量：

```toml
# Variable bindings. These are arbitrary, plaintext strings (similar to environment variables)
# Note: Use secrets to store sensitive data.
# Docs: https://developers.cloudflare.com/workers/platform/environment-variables
# [vars]
# MY_VARIABLE = "production_value"
```

## KV Namespace

使用 KV 作为持久化存储：

```toml
[[kv_namespaces]]
binding = "voteKV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

## D1 Database

配置 D1 数据库：

```toml
[[d1_databases]]
binding = "DB"
database_name = "vote"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

## 静态资源

配置静态资源目录：

```toml
[site]
bucket = "src/static"
```

## 运行项目

1. 安装依赖：

```sh
pnpm install
```

2. 启动项目：

```sh
pnpm start
```

## 贡献

欢迎贡献代码！请提交 Pull Request 或报告问题。
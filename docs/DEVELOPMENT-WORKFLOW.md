# SonarFC Development Workflow

## Goal

避免出现“代码已经改完，但打开 localhost 还是报错”的情况。

当前仓库基于 Next.js App Router。在这个环境里，`next dev` 的热更新偶尔会出现 server chunk 丢失，表现为：

- `Cannot find module './249.js'`
- `Cannot find module './vendor-chunks/next.js'`
- 页面在浏览器里随机 500，但 `typecheck` / `build` 其实是通过的

所以后续开发要把“开发模式”和“交付预览模式”分开。

## 推荐流程

### 1. 日常开发

只在自己开发时使用热更新：

```bash
npm run dev:fresh
```

这个命令会：

- 清掉 `.next` 和 `tsconfig.tsbuildinfo`
- 释放 `3000` 端口
- 用一个干净的 `next dev` 重新启动

如果中途热更新开始异常，不要继续在同一个 `dev` 进程上反复刷新，直接停止后重新跑 `npm run dev:fresh`。

### 2. 提交前自检

每次改完功能，先跑：

```bash
npm run verify
```

这个命令会：

- 清缓存
- 跑 `typecheck`
- 跑 `production build`

只要这一步没过，就不要把页面链接发给别人看。

### 3. 给别人看页面

不要把 `npm run dev` 的地址直接发出去。

一律使用稳定预览：

```bash
npm run review
```

这个命令会：

- 停掉现有的 `3001` 预览
- 重新执行一遍 `verify`
- 用 `next start` 在 `3001` 启动生产预览

然后把下面这个地址发出去：

- [http://localhost:3001](http://localhost:3001)

### 4. 评审反馈后继续开发

如果要继续改代码：

1. 停掉 `npm run review`
2. 回到 `npm run dev:fresh`
3. 修改完成后再次执行 `npm run verify`
4. 再次执行 `npm run review`

## 命令约定

- `npm run dev:fresh`
  - 本地开发专用，带热更新
- `npm run verify`
  - 功能完成后的必跑校验
- `npm run review`
  - 发给他人查看前的稳定预览
- `npm run start:preview`
  - 如果已经 build 完成，只想直接起 `3001` 预览

## 团队规则

建议以后默认遵守下面这几条：

1. `dev` 只给开发者自己看，不作为交付地址。
2. 任何“请你打开看看”的链接，都必须来自 `npm run review`。
3. 任何 UI 改动在发预览前，都要先过 `npm run verify`。
4. 一旦浏览器出现 chunk 丢失报错，第一反应不是刷新，而是重启流程：
   - 停进程
   - 清 `.next`
   - 重新 `verify`
   - 重新 `review`

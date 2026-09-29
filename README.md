# Prompt Atlas

Vite + React 的 BYOK prompt 查询页面。页面从浏览器 `localStorage` 读取 `gh_image_gen_repo` 和 `gh_image_gen_token`，然后直接调用 GitHub Contents API 读取固定的 `data/data_all_prompts.json` 文件。

在设置区域填写并读取一次后，浏览器会保存：

```text
gh_image_gen_repo = shalom-lab/image-gen
gh_image_gen_token = github_pat_your_token_here
```

Token 只发往 `api.github.com`，请使用权限最小、可随时撤销的 Token。

请求不指定 `ref`，GitHub 会使用源仓库的默认分支。默认分支变更后，页面读取的数据来源也会随之变化。

## 本地运行

```bash
npm install
npm run dev
```

## GitHub Pages

仓库中的 `.github/workflows/deploy.yml` 会在推送到 `master` 或 `main` 后构建并部署。首次使用时，在 GitHub 仓库 Settings → Pages → Build and deployment 中选择 **GitHub Actions**。

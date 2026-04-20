# JobLens 部署指南

## 项目结构

```
joblens/
├── index.html          # 主页面
├── css/
│   └── style.css       # 样式文件
├── js/
│   ├── api.js          # API调用层（OpenAI兼容格式）
│   ├── settings.js     # 设置页逻辑
│   └── modules.js      # 3大模块AI对接
└── assets/             # 静态资源（预留）
```

## Step 1：创建 GitHub 仓库

1. 打开 https://github.com ，登录你的账号
2. 点击右上角 **+** → **New repository**
3. 填写：
   - Repository name: `joblens`
   - Description: `AI求职助手 - 轻量化求职辅助工具`
   - 选择 **Public**（公开仓库才能用免费GitHub Pages）
   - **不要**勾选 Add README / .gitignore / License（后面手动添加）
4. 点击 **Create repository**

## Step 2：上传项目文件

### 方式A：网页上传（推荐新手）

1. 进入刚创建的仓库页面
2. 点击 **Add file** → **Upload files**
3. 将整个 `joblens/` 文件夹中的文件拖拽上传：
   - `index.html`
   - `css/style.css`
   - `js/api.js`
   - `js/settings.js`
   - `js/modules.js`
4. 点击 **Commit changes**

### 方式B：Git命令行（推荐开发者）

```bash
# 进入项目目录
cd joblens/

# 初始化Git
git init
git add .
git commit -m "init: JobLens AI求职助手"

# 关联远程仓库（替换为你的用户名）
git remote add origin https://github.com/你的用户名/joblens.git
git branch -M main
git push -u origin main
```

## Step 3：启用 GitHub Pages

1. 进入仓库页面
2. 点击 **Settings**（设置）
3. 左侧菜单找到 **Pages**
4. 在 **Build and deployment** → **Source** 下：
   - Branch 选择 **main**
   - Folder 选择 **/ (root)**
5. 点击 **Save**
6. 等待1-2分钟，页面顶部会显示：
   ```
   Your site is live at https://你的用户名.github.io/joblens/
   ```

## Step 4：访问你的网站

打开浏览器访问：`https://你的用户名.github.io/joblens/`

首次使用需要配置API Key（在「设置」页面）。

## Step 5：配置 API Key

### 支持的API服务商

| 服务商 | API地址 | 模型名称 | 获取方式 |
|--------|---------|----------|----------|
| **DeepSeek** | `https://api.deepseek.com/v1` | `deepseek-chat` | https://platform.deepseek.com |
| **智谱GLM** | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` | https://open.bigmodel.cn |
| **通义千问** | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` | https://dashscope.console.aliyun.com |
| **Moonshot** | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` | https://platform.moonshot.cn |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini` | https://platform.openai.com |

### 配置步骤

1. 打开网站，点击右上角「设置」
2. 填写：
   - **API Key**：你的API密钥（以 `sk-` 开头）
   - **API地址**：上表中的对应地址
   - **模型名称**：上表中的对应模型
3. 点击「测试连接」验证是否配置正确
4. 点击「保存设置」

> API Key 仅存储在你的浏览器本地（localStorage），不会上传到任何服务器。

## Step 6：更新部署（后续修改代码后）

### 方式A：网页上传
进入仓库 → 修改对应文件 → Commit changes（GitHub Pages自动更新，1-2分钟生效）

### 方式B：Git命令行
```bash
git add .
git commit -m "update: 更新内容"
git push
```

## 常见问题

### Q: 页面显示404？
- 确认仓库名为 `joblens`（或修改Pages配置中的自定义域名）
- 确认Pages的Branch选择了 `main`，Folder选择了 `/ (root)`
- 等待2-3分钟让部署完成

### Q: API调用报错？
- 检查API Key是否正确（没有多余空格）
- 检查API地址是否正确（末尾不需要 `/`）
- 检查模型名称是否与服务商匹配
- 检查账户余额是否充足

### Q: 国内访问GitHub Pages慢？
- 可以绑定自定义域名 + Cloudflare CDN加速
- 或者使用 Gitee Pages / Vercel 等国内替代方案

### Q: 如何绑定自定义域名？
1. 在仓库根目录创建 `CNAME` 文件，内容为你的域名（如 `joblens.com`）
2. 在域名服务商处添加 CNAME 记录指向 `你的用户名.github.io`
3. 在 GitHub Pages 设置中填入自定义域名

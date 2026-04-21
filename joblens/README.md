# JobLens - AI求职助手

> 轻量化AI求职辅助工具，一站式搞定公司背调、简历优化、面试准备

## 在线体验

👉 **https://zbcs-studiocr-cn.github.io/joblens/**

## 功能特性

### 🏢 公司反向背调
输入公司名称，AI自动生成包含公司基本面、薪资水位、职场口碑、风险提示的结构化背调报告

### 📄 简历快速优化
粘贴目标岗位JD，AI分析简历匹配度、关键词覆盖率，输出针对性优化建议

### 🎯 面试全流程准备
- **面试题库** — 策略框架版，告诉你考察意图和回答策略
- **面试话术** — 全流程结构化表达模板，从开场寒暄到收尾致谢
- **问答QA** — 可直接背诵的参考答案，按6大维度分类

## 技术架构

- **纯前端** — 无需后端服务器，零运维成本
- **GitHub Pages** — 免费部署，一键上线
- **OpenAI兼容API** — 支持DeepSeek、智谱GLM、通义千问、Moonshot等
- **流式输出** — AI生成内容实时显示，体验流畅
- **响应式设计** — 支持PC和移动端

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/ZBCs-StudioCr-CN/joblens.git
cd joblens
```

### 2. 本地预览

```bash
# 方式一：Python
python3 -m http.server 8080

# 方式二：Node.js
npx serve .
```

打开浏览器访问 `http://localhost:8080`

### 3. 配置API Key

打开网站 → 点击右上角「设置」→ 填写API信息

#### 支持的API服务商

| 服务商 | API地址 | 模型名称 |
|--------|---------|----------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 智谱GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4-flash` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

> API Key 仅存储在浏览器本地（localStorage），不会上传到任何服务器

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
└── DEPLOY.md           # 部署指南
```

## 部署到GitHub Pages

详见 [DEPLOY.md](DEPLOY.md)

简要步骤：
1. Fork 本仓库
2. 在仓库 Settings → Pages 中启用 GitHub Pages
3. 访问 `https://你的用户名.github.io/joblens/`

## License

MIT License - 自由使用、修改和分发

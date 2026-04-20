/**
 * JobLens - AI 模块集成
 * 负责公司背调、简历优化、面试梳理三大模块的 AI 调用
 * 依赖 window.JobLensAPI（定义在 api.js 中）
 */

(function () {
  'use strict';

  // ============================================================
  //  工具函数
  // ============================================================

  /**
   * 将 Markdown 文本转换为 HTML（基础实现）
   * 支持：标题、加粗、斜体、有序/无序列表、代码块、行内代码、分隔线
   */
  function renderMarkdown(text) {
    if (!text) return '';

    var html = text;

    // 代码块 ```lang ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
      var escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      return '<pre class="code-block"><code' + (lang ? ' class="lang-' + lang + '"' : '') + '>' + escaped + '</code></pre>';
    });

    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 标题 h1-h6
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // 加粗 **text** 或 __text__
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // 斜体 *text* 或 _text_
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');

    // 无序列表 - item（连续行合并）
    html = html.replace(/((?:^[-*]\s+.+$\n?)+)/gm, function (block) {
      var items = block.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^[-*]\s+/, '') + '</li>';
      }).join('');
      return '<ul>' + items + '</ul>';
    });

    // 有序列表 1. item
    html = html.replace(/((?:^\d+\.\s+.+$\n?)+)/gm, function (block) {
      var items = block.trim().split('\n').map(function (line) {
        return '<li>' + line.replace(/^\d+\.\s+/, '') + '</li>';
      }).join('');
      return '<ol>' + items + '</ol>';
    });

    // 分隔线
    html = html.replace(/^---+$/gm, '<hr>');

    // 段落：将连续非标签行包裹为 <p>
    html = html.replace(/^(?!<[houblph]|<\/|<hr|<pre|<ul|<ol|<li|<code|<strong|<em)(.*\S.*)$/gm, '<p>$1</p>');

    // 清理多余空行
    html = html.replace(/\n{2,}/g, '\n');

    return html;
  }

  /**
   * 将流式文本实时渲染到 DOM 元素中
   * @param {HTMLElement} element - 目标 DOM 元素
   * @param {string} text - 当前累积的完整文本
   */
  function showStreamingOutput(element, text) {
    if (!element) return;
    element.innerHTML = renderMarkdown(text);
    // 自动滚动到底部
    element.scrollTop = element.scrollHeight;
  }

  /**
   * 解析简历文件（PDF / DOCX / TXT），提取纯文本内容
   * @param {File} file - 用户上传的文件对象
   * @returns {Promise<string>} - 提取出的文本内容
   */
  function parseResumeFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        reject(new Error('未选择文件'));
        return;
      }

      var fileName = file.name.toLowerCase();

      // 纯文本文件直接读取
      if (fileName.endsWith('.txt')) {
        var reader = new FileReader();
        reader.onload = function (e) {
          resolve(e.target.result);
        };
        reader.onerror = function () {
          reject(new Error('文件读取失败'));
        };
        reader.readAsText(file, 'utf-8');
        return;
      }

      // PDF 文件：使用 pdf.js 或基础文本提取
      if (fileName.endsWith('.pdf')) {
        var pdfReader = new FileReader();
        pdfReader.onload = function (e) {
          var typedArray = new Uint8Array(e.target.result);
          // 尝试使用 pdf.js（如果已加载）
          if (window.pdfjsLib) {
            window.pdfjsLib.getDocument({ data: typedArray }).promise.then(function (pdf) {
              var pages = [];
              var numPages = pdf.numPages;
              var chain = Promise.resolve();
              for (var i = 1; i <= numPages; i++) {
                (function (pageNum) {
                  chain = chain.then(function () {
                    return pdf.getPage(pageNum).then(function (page) {
                      return page.getTextContent().then(function (content) {
                        var strings = content.items.map(function (item) {
                          return item.str;
                        });
                        pages.push(strings.join(' '));
                      });
                    });
                  });
                })(i);
              }
              chain.then(function () {
                resolve(pages.join('\n'));
              }).catch(function (err) {
                reject(new Error('PDF 解析失败: ' + err.message));
              });
            }).catch(function (err) {
              reject(new Error('PDF 加载失败: ' + err.message));
            });
          } else {
            // pdf.js 未加载时，尝试从二进制中提取可读文本（效果有限）
            var text = '';
            for (var i = 0; i < typedArray.length; i++) {
              var byte = typedArray[i];
              if (byte >= 32 && byte <= 126) {
                text += String.fromCharCode(byte);
              } else if (byte === 10 || byte === 13) {
                text += '\n';
              }
            }
            if (text.trim().length < 20) {
              reject(new Error('PDF 解析需要 pdf.js 库支持，请确保已加载 pdf.js'));
            } else {
              resolve(text);
            }
          }
        };
        pdfReader.onerror = function () {
          reject(new Error('PDF 文件读取失败'));
        };
        pdfReader.readAsArrayBuffer(file);
        return;
      }

      // DOCX 文件：使用 mammoth.js 或基础 zip 解析
      if (fileName.endsWith('.docx')) {
        var docxReader = new FileReader();
        docxReader.onload = function (e) {
          var arrayBuffer = e.target.result;
          // 尝试使用 mammoth.js（如果已加载）
          if (window.mammoth) {
            window.mammoth.extractRawText({ arrayBuffer: arrayBuffer }).then(function (result) {
              resolve(result.value);
            }).catch(function (err) {
              reject(new Error('DOCX 解析失败: ' + err.message));
            });
          } else {
            // mammoth.js 未加载时，尝试从 ZIP 结构中提取 document.xml 的文本
            try {
              var text = extractDocxTextFallback(arrayBuffer);
              if (text.trim().length < 10) {
                reject(new Error('DOCX 解析需要 mammoth.js 库支持，请确保已加载 mammoth.js'));
              } else {
                resolve(text);
              }
            } catch (err) {
              reject(new Error('DOCX 解析失败: ' + err.message));
            }
          }
        };
        docxReader.onerror = function () {
          reject(new Error('DOCX 文件读取失败'));
        };
        docxReader.readAsArrayBuffer(file);
        return;
      }

      reject(new Error('不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件'));
    });
  }

  /**
   * DOCX 文本提取的后备方案（从 ZIP 中提取 document.xml 的文本节点）
   * 注意：这是简化实现，完整解析建议使用 mammoth.js
   */
  function extractDocxTextFallback(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    var text = '';

    // 在二进制数据中搜索 XML 文本标签 <w:t>...</w:t>
    var str = '';
    for (var i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }

    // 匹配 <w:t> 和 <w:t xml:space="preserve"> 标签中的内容
    var regex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
    var match;
    var texts = [];
    while ((match = regex.exec(str)) !== null) {
      texts.push(match[1]);
    }

    return texts.join('');
  }

  // ============================================================
  //  模块一：公司背调
  // ============================================================

  /**
   * 生成公司背调报告
   * @param {string} companyName - 公司名称
   * @param {string} jd - 职位描述文本
   * @param {HTMLElement} [outputElement] - 可选，用于实时显示流式输出的 DOM 元素
   * @returns {Promise<string>} - 完整的公司背调报告文本
   */
  async function generateCompanyReport(companyName, jd, outputElement) {
    // 参数校验
    if (!companyName || !companyName.trim()) {
      throw new Error('请输入公司名称');
    }
    if (!jd || !jd.trim()) {
      throw new Error('请输入职位描述（JD）');
    }

    // 检查 API 是否可用
    if (!window.JobLensAPI || !window.JobLensAPI.streamAI) {
      throw new Error('AI 服务未就绪，请检查 API 配置');
    }

    var systemPrompt = [
      '你是一位资深的职场调研分析师，擅长对目标公司进行全面深入的背景调查。',
      '请根据用户提供的公司名称和职位描述（JD），生成一份结构化的公司背调报告。',
      '',
      '报告必须包含以下四大板块，每个板块都需要有具体、有价值的内容：',
      '',
      '## 一、公司基本面',
      '- 公司规模、发展阶段（初创/成长/成熟/上市）',
      '- 主营业务与行业地位',
      '- 融资情况与投资方背景',
      '- 组织架构与团队规模',
      '',
      '## 二、薪资水位',
      '- 该岗位在市场上的薪资范围（参考同行业同级别）',
      '- 公司的薪酬体系特点（固定薪资/绩效/期权/补贴等）',
      '- 加班文化与工作强度评估',
      '- 福利待遇（五险一金比例、年假、补充福利等）',
      '',
      '## 三、职场口碑',
      '- 员工评价与离职率情况',
      '- 管理风格与企业文化',
      '- 职业发展空间与晋升通道',
      '- 工作环境与团队氛围',
      '',
      '## 四、风险提示',
      '- 潜在的经营风险或行业风险',
      '- 需要关注的合同条款或竞业协议',
      '- 其他求职者需要注意的事项',
      '',
      '输出要求：',
      '1. 全部使用中文输出',
      '2. 信息要具体、有参考价值，避免空泛描述',
      '3. 如果某些信息无法确认，请明确标注"待核实"',
      '4. 适当使用数据支撑观点',
      '5. 使用 Markdown 格式，层次分明'
    ].join('\n');

    var userPrompt = [
      '请对以下公司进行背调分析：',
      '',
      '**公司名称：** ' + companyName.trim(),
      '',
      '**目标职位描述（JD）：**',
      jd.trim()
    ].join('\n');

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    var fullText = '';

    try {
      await window.JobLensAPI.streamAI(messages, function (token) {
        fullText += token;
        if (outputElement) {
          showStreamingOutput(outputElement, fullText);
        }
      });
    } catch (err) {
      if (err.message && err.message.indexOf('API Key') !== -1) {
        throw new Error('API Key 未配置，请在设置中填写有效的 API Key');
      }
      if (err.message && (err.message.indexOf('network') !== -1 || err.message.indexOf('fetch') !== -1)) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('生成公司背调报告时出错: ' + (err.message || '未知错误'));
    }

    return fullText;
  }

  // ============================================================
  //  模块二：简历优化
  // ============================================================

  /**
   * 生成简历分析报告
   * @param {string} resumeText - 简历文本内容
   * @param {string} jd - 职位描述文本
   * @param {HTMLElement} [outputElement] - 可选，用于实时显示流式输出的 DOM 元素
   * @returns {Promise<string>} - 完整的简历分析文本
   */
  async function generateResumeAnalysis(resumeText, jd, outputElement) {
    // 参数校验
    if (!resumeText || !resumeText.trim()) {
      throw new Error('简历内容为空，请先上传或粘贴简历');
    }
    if (!jd || !jd.trim()) {
      throw new Error('请输入职位描述（JD）');
    }

    // 检查 API 是否可用
    if (!window.JobLensAPI || !window.JobLensAPI.streamAI) {
      throw new Error('AI 服务未就绪，请检查 API 配置');
    }

    var systemPrompt = [
      '你是一位资深的简历优化专家和 HR 顾问，拥有丰富的招聘和简历评审经验。',
      '请根据用户提供的简历内容和目标职位描述（JD），进行深度分析并给出优化建议。',
      '',
      '分析报告必须包含以下板块：',
      '',
      '## 一、匹配度评分',
      '- 综合匹配度评分（百分比）',
      '- 核心能力匹配分析',
      '- 经验年限匹配度',
      '- 技能栈覆盖度',
      '',
      '## 二、关键词覆盖率分析',
      '- JD 中提取的核心关键词列表',
      '- 简历中已覆盖的关键词',
      '- 简历中缺失的关键词（重点标注）',
      '- 关键词覆盖百分比',
      '',
      '## 三、内容优化建议',
      '- 工作经历描述优化（STAR 法则应用建议）',
      '- 量化成果补充建议（哪些经历需要补充数据支撑）',
      '- 技能描述优化（如何更好地呈现技能深度）',
      '- 项目经验优化（突出与目标岗位相关的项目）',
      '',
      '## 四、结构优化建议',
      '- 简历整体结构评估',
      '- 模块顺序调整建议',
      '- 信息密度与排版建议',
      '- 针对该岗位的简历模板建议',
      '',
      '## 五、优化后的简历要点',
      '- 提供一份优化后的简历核心内容摘要',
      '- 重点突出与 JD 高度匹配的经历和技能',
      '',
      '输出要求：',
      '1. 全部使用中文输出',
      '2. 建议要具体、可操作，避免空泛',
      '3. 对每个优化建议说明"为什么要改"和"怎么改"',
      '4. 使用 Markdown 格式，层次分明',
      '5. 评分要客观，既指出不足也肯定优势'
    ].join('\n');

    var userPrompt = [
      '请分析以下简历与目标职位的匹配情况：',
      '',
      '---',
      '**简历内容：**',
      resumeText.trim(),
      '---',
      '',
      '**目标职位描述（JD）：**',
      jd.trim()
    ].join('\n');

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    var fullText = '';

    try {
      await window.JobLensAPI.streamAI(messages, function (token) {
        fullText += token;
        if (outputElement) {
          showStreamingOutput(outputElement, fullText);
        }
      });
    } catch (err) {
      if (err.message && err.message.indexOf('API Key') !== -1) {
        throw new Error('API Key 未配置，请在设置中填写有效的 API Key');
      }
      if (err.message && (err.message.indexOf('network') !== -1 || err.message.indexOf('fetch') !== -1)) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('生成简历分析时出错: ' + (err.message || '未知错误'));
    }

    return fullText;
  }

  // ============================================================
  //  模块三：面试梳理
  // ============================================================

  /**
   * 子模块 3-1：生成面试题库
   * @param {string} jd - 职位描述文本
   * @param {string} companyName - 公司名称
   * @param {HTMLElement} [outputElement] - 可选，用于实时显示流式输出的 DOM 元素
   * @returns {Promise<string>} - 完整的面试题库文本
   */
  async function generateInterviewQuestions(jd, companyName, outputElement) {
    if (!jd || !jd.trim()) {
      throw new Error('请输入职位描述（JD）');
    }

    if (!window.JobLensAPI || !window.JobLensAPI.streamAI) {
      throw new Error('AI 服务未就绪，请检查 API 配置');
    }

    var companyInfo = companyName ? '**目标公司：** ' + companyName.trim() : '';

    var systemPrompt = [
      '你是一位资深的面试教练和 HR 专家，精通各行业各岗位的面试流程和考察要点。',
      '请根据用户提供的职位描述（JD）和公司信息，生成一份全面的面试题库。',
      '',
      '题库需要按难度和出现频率分为三大类：',
      '',
      '## 一、必考题（出现概率 90%+）',
      '这些是几乎一定会被问到的问题，每道题需要包含：',
      '- **题目**：完整的面试问题',
      '- **考察意图**：面试官想通过这道题了解什么',
      '- **回答思路**：推荐 2-3 个关键回答要点',
      '',
      '## 二、高频题（出现概率 50%-90%）',
      '这些是根据岗位特点大概率会出现的问题，格式同上。',
      '',
      '## 三、加分题（出现概率 <50%，但答好可大幅加分）',
      '这些是能展示深度思考和专业素养的问题，格式同上。',
      '',
      '输出要求：',
      '1. 全部使用中文输出',
      '2. 每个分类至少 5 道题',
      '3. 题目要紧贴 JD 中提到的技能和要求',
      '4. 考察意图要精准，回答思路要具体可操作',
      '5. 使用 Markdown 格式'
    ].join('\n');

    var userPrompt = [
      '请为以下岗位生成面试题库：',
      '',
      companyInfo,
      '',
      '**职位描述（JD）：**',
      jd.trim()
    ].join('\n');

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    var fullText = '';

    try {
      await window.JobLensAPI.streamAI(messages, function (token) {
        fullText += token;
        if (outputElement) {
          showStreamingOutput(outputElement, fullText);
        }
      });
    } catch (err) {
      if (err.message && err.message.indexOf('API Key') !== -1) {
        throw new Error('API Key 未配置，请在设置中填写有效的 API Key');
      }
      if (err.message && (err.message.indexOf('network') !== -1 || err.message.indexOf('fetch') !== -1)) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('生成面试题库时出错: ' + (err.message || '未知错误'));
    }

    return fullText;
  }

  /**
   * 子模块 3-2：生成面试话术稿
   * @param {string} jd - 职位描述文本
   * @param {HTMLElement} [outputElement] - 可选，用于实时显示流式输出的 DOM 元素
   * @returns {Promise<string>} - 完整的面试话术稿文本
   */
  async function generateInterviewSpeech(jd, outputElement) {
    if (!jd || !jd.trim()) {
      throw new Error('请输入职位描述（JD）');
    }

    if (!window.JobLensAPI || !window.JobLensAPI.streamAI) {
      throw new Error('AI 服务未就绪，请检查 API 配置');
    }

    var systemPrompt = [
      '你是一位资深的面试话术教练，擅长帮助求职者准备面试全流程的表达。',
      '请根据用户提供的职位描述（JD），生成一份完整的面试话术稿。',
      '',
      '话术稿需要覆盖面试的完整流程，包含以下环节：',
      '',
      '## 一、开场寒暄',
      '- 进门打招呼的得体表达',
      '- 破冰话题建议',
      '- 注意事项',
      '',
      '## 二、自我介绍',
      '- 1 分钟版本（电梯演讲）',
      '- 3 分钟版本（完整版）',
      '- 根据该岗位特点定制的关键信息点',
      '',
      '## 三、优势展示',
      '- 核心竞争力的表达方式',
      '- 如何将经历与岗位需求精准对接',
      '- 差异化优势的呈现技巧',
      '',
      '## 四、情景应对',
      '- 常见棘手问题的应对话术',
      '- 薪资谈判的话术策略',
      '- 如何优雅地回答"你有什么问题想问我吗"',
      '',
      '## 五、反问环节',
      '- 推荐向面试官提问的高质量问题',
      '- 通过提问展示专业度和诚意',
      '',
      '## 六、收尾致谢',
      '- 面试结束时的得体表达',
      '- 面试后的跟进话术（邮件/消息模板）',
      '',
      '输出要求：',
      '1. 全部使用中文输出',
      '2. 话术要自然、口语化，避免生硬背诵感',
      '3. 标注关键停顿和语气提示（如：[停顿]、[微笑]）',
      '4. 紧贴 JD 要求，体现岗位匹配度',
      '5. 使用 Markdown 格式'
    ].join('\n');

    var userPrompt = [
      '请为以下岗位生成面试话术稿：',
      '',
      '**职位描述（JD）：**',
      jd.trim()
    ].join('\n');

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    var fullText = '';

    try {
      await window.JobLensAPI.streamAI(messages, function (token) {
        fullText += token;
        if (outputElement) {
          showStreamingOutput(outputElement, fullText);
        }
      });
    } catch (err) {
      if (err.message && err.message.indexOf('API Key') !== -1) {
        throw new Error('API Key 未配置，请在设置中填写有效的 API Key');
      }
      if (err.message && (err.message.indexOf('network') !== -1 || err.message.indexOf('fetch') !== -1)) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('生成面试话术稿时出错: ' + (err.message || '未知错误'));
    }

    return fullText;
  }

  /**
   * 子模块 3-3：生成面试 Q&A
   * @param {string} jd - 职位描述文本
   * @param {string} companyName - 公司名称
   * @param {HTMLElement} [outputElement] - 可选，用于实时显示流式输出的 DOM 元素
   * @returns {Promise<string>} - 完整的面试 Q&A 文本
   */
  async function generateInterviewQA(jd, companyName, outputElement) {
    if (!jd || !jd.trim()) {
      throw new Error('请输入职位描述（JD）');
    }

    if (!window.JobLensAPI || !window.JobLensAPI.streamAI) {
      throw new Error('AI 服务未就绪，请检查 API 配置');
    }

    var companyInfo = companyName ? '**目标公司：** ' + companyName.trim() : '';

    var systemPrompt = [
      '你是一位资深的面试辅导专家，擅长为求职者提供高质量的面试问答参考。',
      '请根据用户提供的职位描述（JD）和公司信息，生成一份全面的面试 Q&A 手册。',
      '',
      'Q&A 手册需要按考察维度分为以下六大类，每个类别至少 3 组问答：',
      '',
      '## 一、公司认知类',
      '考察对目标公司、行业、竞品的了解程度。',
      '每组包含：**Q（面试官提问）** + **A（参考回答）**',
      '',
      '## 二、岗位匹配类',
      '考察个人能力与岗位需求的匹配度。',
      '每组包含：**Q（面试官提问）** + **A（参考回答）**',
      '',
      '## 三、行为面试类（STAR 法则）',
      '通过过往行为预测未来表现，考察软技能。',
      '每组包含：**Q（面试官提问）** + **A（参考回答，使用 STAR 结构）**',
      '',
      '## 四、技术理解类',
      '考察专业知识深度和技术视野。',
      '每组包含：**Q（面试官提问）** + **A（参考回答）**',
      '',
      '## 五、HR 面类',
      '考察职业规划、稳定性、团队协作等。',
      '每组包含：**Q（面试官提问）** + **A（参考回答）**',
      '',
      '## 六、压力测试类',
      '考察抗压能力、临场反应和情绪管理。',
      '每组包含：**Q（面试官提问）** + **A（参考回答）**',
      '',
      '输出要求：',
      '1. 全部使用中文输出',
      '2. 参考回答要完整、具体，可直接作为准备素材',
      '3. 回答要体现专业性和个人特色，避免模板化',
      '4. 紧贴 JD 中提到的技能和要求来设计问答',
      '5. 使用 Markdown 格式，问答清晰分隔'
    ].join('\n');

    var userPrompt = [
      '请为以下岗位生成面试 Q&A 手册：',
      '',
      companyInfo,
      '',
      '**职位描述（JD）：**',
      jd.trim()
    ].join('\n');

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    var fullText = '';

    try {
      await window.JobLensAPI.streamAI(messages, function (token) {
        fullText += token;
        if (outputElement) {
          showStreamingOutput(outputElement, fullText);
        }
      });
    } catch (err) {
      if (err.message && err.message.indexOf('API Key') !== -1) {
        throw new Error('API Key 未配置，请在设置中填写有效的 API Key');
      }
      if (err.message && (err.message.indexOf('network') !== -1 || err.message.indexOf('fetch') !== -1)) {
        throw new Error('网络连接失败，请检查网络后重试');
      }
      throw new Error('生成面试 Q&A 时出错: ' + (err.message || '未知错误'));
    }

    return fullText;
  }

  // ============================================================
  //  导出
  // ============================================================

  window.JobLensModules = {
    // 模块一：公司背调
    generateCompanyReport: generateCompanyReport,

    // 模块二：简历优化
    generateResumeAnalysis: generateResumeAnalysis,

    // 模块三：面试梳理（3 个子模块）
    generateInterviewQuestions: generateInterviewQuestions,
    generateInterviewSpeech: generateInterviewSpeech,
    generateInterviewQA: generateInterviewQA,

    // 工具函数
    parseResumeFile: parseResumeFile,
    renderMarkdown: renderMarkdown,
    showStreamingOutput: showStreamingOutput
  };

})();

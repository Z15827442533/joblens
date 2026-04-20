/**
 * JobLens — API 调用层
 *
 * 封装所有与 OpenAI 兼容 API 的交互逻辑，包括：
 * - 配置管理（ApiConfig）
 * - 普通请求（callAI）
 * - 流式请求（streamAI）
 * - 系统提示词构建（buildSystemPrompt）
 *
 * 依赖：无第三方库，纯原生 ES5+ JavaScript
 */

(function () {
  'use strict';

  // ============================
  //  ApiConfig — 配置管理对象
  // ============================

  var STORAGE_KEY = 'joblens_api_config';

  var ApiConfig = {
    /** 默认配置 */
    defaults: {
      apiKey: '',
      apiEndpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini'
    },

    /**
     * 从 localStorage 读取配置
     * 如果不存在则返回默认值
     * @returns {Object} 配置对象
     */
    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          // 合并默认值，确保新增字段也有值
          return {
            apiKey: saved.apiKey || this.defaults.apiKey,
            apiEndpoint: saved.apiEndpoint || this.defaults.apiEndpoint,
            model: saved.model || this.defaults.model
          };
        }
      } catch (e) {
        console.warn('[JobLens] 读取配置失败，使用默认值：', e.message);
      }
      // 返回默认值的副本
      return {
        apiKey: this.defaults.apiKey,
        apiEndpoint: this.defaults.apiEndpoint,
        model: this.defaults.model
      };
    },

    /**
     * 保存配置到 localStorage
     * @param {Object} config - 要保存的配置对象
     */
    save: function (config) {
      try {
        var data = {
          apiKey: config.apiKey || '',
          apiEndpoint: config.apiEndpoint || this.defaults.apiEndpoint,
          model: config.model || this.defaults.model
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error('[JobLens] 保存配置失败：', e.message);
        throw new Error('保存配置失败：' + e.message);
      }
    },

    /**
     * 清除所有已保存的配置
     */
    clear: function () {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        console.warn('[JobLens] 清除配置失败：', e.message);
      }
    },

    /**
     * 检查配置是否完整（至少有 apiKey）
     * @returns {boolean}
     */
    isConfigured: function () {
      var config = this.load();
      return !!config.apiKey && config.apiKey.trim().length > 0;
    }
  };

  // ============================
  //  buildSystemPrompt — 系统提示词
  // ============================

  /**
   * 根据模块名称返回对应的系统提示词
   * @param {string} module - 模块标识符
   *   可选值：company | resume | interview-questions | interview-speech | interview-qa
   * @returns {string} 系统提示词
   */
  function buildSystemPrompt(module) {
    var prompts = {
      // 公司分析模块
      company: [
        '你是一位资深的行业分析师和职业规划顾问。',
        '你的任务是帮助用户深入了解目标公司，包括但不限于：',
        '- 公司背景、发展历程、核心业务',
        '- 企业文化、工作氛围、员工评价',
        '- 薪资福利、晋升通道、职业发展',
        '- 面试流程及注意事项',
        '- 行业地位与竞争格局',
        '',
        '请基于你的知识提供全面、客观、有深度的分析。',
        '如果信息有限，请明确说明，不要编造。',
        '回复请使用中文。'
      ].join('\n'),

      // 简历优化模块
      resume: [
        '你是一位专业的简历优化专家和人力资源顾问。',
        '你的任务是帮助用户优化简历，提升求职竞争力。',
        '',
        '请关注以下方面：',
        '- 内容结构与逻辑是否清晰',
        '- 量化成果和数据支撑',
        '- 关键词匹配与 ATS 友好性',
        '- 语言表达的专业性和简洁性',
        '- 与目标岗位的匹配度',
        '',
        '请给出具体、可操作的修改建议，并附上优化后的示例。',
        '回复请使用中文。'
      ].join('\n'),

      // 面试问题生成模块
      'interview-questions': [
        '你是一位经验丰富的面试官和求职辅导专家。',
        '你的任务是根据用户提供的岗位信息和简历，生成针对性的面试问题。',
        '',
        '请生成以下类型的问题：',
        '- 行为面试题（STAR 法则）',
        '- 技术专业问题',
        '- 情景模拟题',
        '- 压力面试题',
        '- 反问面试官的问题建议',
        '',
        '每个问题附带考察要点和参考回答思路。',
        '问题难度应与岗位级别匹配。',
        '回复请使用中文。'
      ].join('\n'),

      // 面试演讲稿模块
      'interview-speech': [
        '你是一位出色的演讲教练和面试辅导专家。',
        '你的任务是帮助用户准备面试中的自我介绍和关键演讲环节。',
        '',
        '请提供：',
        '- 结构清晰、有亮点的自我介绍模板',
        '- 针对常见面试问题的回答话术',
        '- 表达技巧和注意事项',
        '- 如何突出个人优势和与岗位的匹配度',
        '',
        '演讲稿应自然流畅、不生硬，体现个人特色。',
        '回复请使用中文。'
      ].join('\n'),

      // 面试问答模块
      'interview-qa': [
        '你是一位资深面试辅导专家，擅长模拟真实面试场景。',
        '你的任务是与用户进行面试问答互动。',
        '',
        '工作模式：',
        '1. 根据用户提供的岗位和简历信息，逐个提出面试问题',
        '2. 等待用户回答后，给出专业点评和改进建议',
        '3. 提供参考回答示例',
        '4. 根据用户表现调整后续问题难度',
        '',
        '请保持专业、鼓励性的语气，帮助用户提升面试表现。',
        '回复请使用中文。'
      ].join('\n')
    };

    // 返回对应模块的提示词，未知模块返回通用提示词
    return prompts[module] || [
      '你是 JobLens 智能求职助手的 AI 后端。',
      '请根据用户的问题提供专业、有用的回答。',
      '回复请使用中文。'
    ].join('\n');
  }

  // ============================
  //  callAI — 普通请求
  // ============================

  /**
   * 调用 AI API（非流式）
   * @param {Array} messages - 消息数组，格式 [{ role: 'system'|'user'|'assistant', content: '...' }]
   * @param {Object} [options] - 可选参数
   * @param {string} [options.systemPrompt] - 自定义系统提示词（会作为第一条 system 消息插入）
   * @param {number} [options.temperature] - 温度参数（默认 0.7）
   * @param {number} [options.maxTokens] - 最大 token 数（默认 4096）
   * @param {string} [options.module] - 模块名称，用于自动构建系统提示词
   * @returns {Promise<string>} AI 回复的文本内容
   */
  async function callAI(messages, options) {
    options = options || {};

    // 读取配置
    var config = ApiConfig.load();

    // 校验 apiKey
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('请先在设置中配置 API Key');
    }

    // 构建请求消息列表
    var requestMessages = [];

    // 系统提示词：优先使用传入的 systemPrompt，其次根据 module 构建
    var systemPrompt = options.systemPrompt;
    if (!systemPrompt && options.module) {
      systemPrompt = buildSystemPrompt(options.module);
    }
    if (systemPrompt) {
      requestMessages.push({ role: 'system', content: systemPrompt });
    }

    // 追加用户消息
    if (Array.isArray(messages)) {
      for (var i = 0; i < messages.length; i++) {
        requestMessages.push(messages[i]);
      }
    }

    // 构建请求 URL
    var endpoint = config.apiEndpoint.replace(/\/+$/, '');
    var url = endpoint + '/chat/completions';

    // 构建请求体
    var body = {
      model: options.model || config.model,
      messages: requestMessages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens !== undefined ? options.maxTokens : 4096
    };

    try {
      var response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify(body)
      });

      // 处理 HTTP 错误状态码
      if (!response.ok) {
        var errorData = null;
        var errorText = '';

        try {
          errorData = await response.json();
          errorText = (errorData.error && errorData.error.message) || '';
        } catch (parseErr) {
          // 响应体不是 JSON，尝试读取纯文本
          try {
            errorText = await response.text();
          } catch (textErr) {
            errorText = '未知错误';
          }
        }

        // 根据状态码返回不同的错误信息
        switch (response.status) {
          case 401:
            throw new Error('API Key 无效或已过期，请在设置中检查您的 API Key');
          case 429:
            throw new Error('请求过于频繁，已触发速率限制，请稍后重试');
          case 500:
          case 502:
          case 503:
            throw new Error('API 服务暂时不可用（' + response.status + '），请稍后重试');
          default:
            throw new Error('API 请求失败（' + response.status + '）：' + errorText);
        }
      }

      // 解析响应
      var data = await response.json();

      // 提取回复内容
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content || '';
      }

      // 响应格式异常
      if (data.error) {
        throw new Error('API 返回错误：' + (data.error.message || JSON.stringify(data.error)));
      }

      throw new Error('API 返回了意外的数据格式');

    } catch (err) {
      // 网络错误特殊处理
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.indexOf('NetworkError') !== -1)) {
        throw new Error('网络连接失败，请检查网络设置和 API 地址是否正确');
      }

      // 如果是我们自己抛出的错误，直接传递
      if (err.message && (err.message.indexOf('API Key') !== -1 ||
          err.message.indexOf('速率限制') !== -1 ||
          err.message.indexOf('服务暂时不可用') !== -1 ||
          err.message.indexOf('网络连接失败') !== -1)) {
        throw err;
      }

      // 其他未知错误
      throw new Error('调用 AI 时发生错误：' + err.message);
    }
  }

  // ============================
  //  streamAI — 流式请求
  // ============================

  /**
   * 调用 AI API（流式），通过回调实时返回内容片段
   * @param {Array} messages - 消息数组，格式同 callAI
   * @param {Function} onChunk - 收到内容片段时的回调函数，参数为 (chunkText: string, fullText: string)
   * @param {Object} [options] - 可选参数，同 callAI
   * @returns {Promise<string>} 完整的 AI 回复文本
   */
  async function streamAI(messages, onChunk, options) {
    options = options || {};

    // 校验回调函数
    if (typeof onChunk !== 'function') {
      throw new Error('streamAI 需要一个 onChunk 回调函数');
    }

    // 读取配置
    var config = ApiConfig.load();

    // 校验 apiKey
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('请先在设置中配置 API Key');
    }

    // 构建请求消息列表
    var requestMessages = [];

    // 系统提示词
    var systemPrompt = options.systemPrompt;
    if (!systemPrompt && options.module) {
      systemPrompt = buildSystemPrompt(options.module);
    }
    if (systemPrompt) {
      requestMessages.push({ role: 'system', content: systemPrompt });
    }

    // 追加用户消息
    if (Array.isArray(messages)) {
      for (var i = 0; i < messages.length; i++) {
        requestMessages.push(messages[i]);
      }
    }

    // 构建请求 URL
    var endpoint = config.apiEndpoint.replace(/\/+$/, '');
    var url = endpoint + '/chat/completions';

    // 构建请求体（开启 stream）
    var body = {
      model: options.model || config.model,
      messages: requestMessages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens !== undefined ? options.maxTokens : 4096,
      stream: true
    };

    var fullText = '';

    try {
      var response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey
        },
        body: JSON.stringify(body)
      });

      // 处理 HTTP 错误
      if (!response.ok) {
        var errorText = '';
        try {
          var errorData = await response.json();
          errorText = (errorData.error && errorData.error.message) || '';
        } catch (parseErr) {
          try {
            errorText = await response.text();
          } catch (textErr) {
            errorText = '未知错误';
          }
        }

        switch (response.status) {
          case 401:
            throw new Error('API Key 无效或已过期，请在设置中检查您的 API Key');
          case 429:
            throw new Error('请求过于频繁，已触发速率限制，请稍后重试');
          case 500:
          case 502:
          case 503:
            throw new Error('API 服务暂时不可用（' + response.status + '），请稍后重试');
          default:
            throw new Error('API 请求失败（' + response.status + '）：' + errorText);
        }
      }

      // 读取流式响应
      var reader = response.body.getReader();
      var decoder = new TextDecoder('utf-8');
      var buffer = '';

      while (true) {
        var result = await reader.read();
        if (result.done) {
          break;
        }

        buffer += decoder.decode(result.value, { stream: true });

        // 按行处理 SSE 数据
        var lines = buffer.split('\n');
        // 最后一个元素可能是不完整的行，保留在 buffer 中
        buffer = lines.pop() || '';

        for (var j = 0; j < lines.length; j++) {
          var line = lines[j].trim();

          // 跳过空行和注释
          if (line === '' || line.indexOf(':') === -1) {
            continue;
          }

          // SSE 格式：data: {...}
          if (line.indexOf('data: ') === 0) {
            var dataStr = line.substring(6);

            // 流结束标记
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              var chunk = JSON.parse(dataStr);

              // 提取内容片段
              if (chunk.choices && chunk.choices.length > 0) {
                var delta = chunk.choices[0].delta;
                if (delta && delta.content) {
                  fullText += delta.content;
                  onChunk(delta.content, fullText);
                }
              }
            } catch (jsonErr) {
              // JSON 解析失败，跳过这一行（可能是非标准数据）
              console.warn('[JobLens] 流式数据解析失败：', jsonErr.message, '数据：', dataStr);
            }
          }
        }
      }

      return fullText;

    } catch (err) {
      // 网络错误
      if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.indexOf('NetworkError') !== -1)) {
        throw new Error('网络连接失败，请检查网络设置和 API 地址是否正确');
      }

      // 如果是我们自己抛出的错误，直接传递
      if (err.message && (err.message.indexOf('API Key') !== -1 ||
          err.message.indexOf('速率限制') !== -1 ||
          err.message.indexOf('服务暂时不可用') !== -1 ||
          err.message.indexOf('网络连接失败') !== -1 ||
          err.message.indexOf('回调函数') !== -1)) {
        throw err;
      }

      throw new Error('流式调用 AI 时发生错误：' + err.message);
    }
  }

  // ============================
  //  导出到全局
  // ============================

  window.JobLensAPI = {
    callAI: callAI,
    streamAI: streamAI,
    buildSystemPrompt: buildSystemPrompt,
    ApiConfig: ApiConfig
  };

})();

/**
 * JobLens — 设置页面逻辑
 *
 * 管理 API 配置的表单交互，包括：
 * - 初始化表单（initSettings）
 * - 保存配置（saveSettings）
 * - 测试连接（testConnection）
 * - 重置设置（resetSettings）
 *
 * 依赖：JobLensAPI（api.js）需在本文件之前加载
 * 依赖：页面中需存在以下表单元素：
 *   - #settings-api-key       （API Key 输入框）
 *   - #settings-api-endpoint  （API 地址输入框）
 *   - #settings-model         （模型名称输入框）
 *   - #settings-save-btn      （保存按钮）
 *   - #settings-test-btn      （测试连接按钮）
 *   - #settings-reset-btn     （重置按钮）
 *   - #settings-toast         （提示消息容器）
 */

(function () {
  'use strict';

  // ============================
  //  DOM 元素引用
  // ============================

  var elements = {};

  /**
   * 缓存 DOM 元素引用，避免重复查询
   */
  function cacheElements() {
    elements.apiKeyInput = document.getElementById('settings-api-key');
    elements.endpointInput = document.getElementById('settings-api-endpoint');
    elements.modelInput = document.getElementById('settings-model');
    elements.saveBtn = document.getElementById('settings-save-btn');
    elements.testBtn = document.getElementById('settings-test-btn');
    elements.resetBtn = document.getElementById('settings-reset-btn');
    elements.toast = document.getElementById('settings-toast');
  }

  // ============================
  //  Toast 提示
  // ============================

  /**
   * 显示 Toast 提示消息
   * @param {string} message - 提示文本
   * @param {string} [type] - 类型：'success' | 'error' | 'info'（默认 'info'）
   * @param {number} [duration] - 显示时长（毫秒），默认 3000
   */
  function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;

    var toast = elements.toast;
    if (!toast) {
      // 如果没有 toast 容器，使用 alert 兜底
      alert(message);
      return;
    }

    // 设置内容和样式
    toast.textContent = message;
    toast.className = 'toast toast-' + type + ' toast-show';

    // 清除之前的定时器
    if (toast._hideTimer) {
      clearTimeout(toast._hideTimer);
    }

    // 自动隐藏
    toast._hideTimer = setTimeout(function () {
      toast.className = 'toast toast-' + type;
    }, duration);
  }

  // ============================
  //  initSettings — 初始化设置页面
  // ============================

  /**
   * 从 localStorage 加载已保存的配置，填充到表单字段中
   */
  function initSettings() {
    // 缓存 DOM 引用
    cacheElements();

    // 检查依赖
    if (!window.JobLensAPI || !window.JobLensAPI.ApiConfig) {
      console.error('[JobLens] api.js 未加载，设置页面无法初始化');
      showToast('API 模块未加载，请检查页面引用', 'error');
      return;
    }

    // 读取已保存的配置
    var config = window.JobLensAPI.ApiConfig.load();

    // 填充表单
    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = config.apiKey || '';
    }
    if (elements.endpointInput) {
      elements.endpointInput.value = config.apiEndpoint || window.JobLensAPI.ApiConfig.defaults.apiEndpoint;
    }
    if (elements.modelInput) {
      elements.modelInput.value = config.model || window.JobLensAPI.ApiConfig.defaults.model;
    }

    console.log('[JobLens] 设置页面初始化完成');
  }

  // ============================
  //  saveSettings — 保存设置
  // ============================

  /**
   * 验证表单输入并保存配置到 localStorage
   * 成功后显示 Toast 提示
   */
  function saveSettings() {
    // 检查依赖
    if (!window.JobLensAPI || !window.JobLensAPI.ApiConfig) {
      showToast('API 模块未加载', 'error');
      return;
    }

    // 获取输入值
    var apiKey = elements.apiKeyInput ? elements.apiKeyInput.value.trim() : '';
    var endpoint = elements.endpointInput ? elements.endpointInput.value.trim() : '';
    var model = elements.modelInput ? elements.modelInput.value.trim() : '';

    // ---- 输入验证 ----

    // API Key 必填
    if (!apiKey) {
      showToast('请输入 API Key', 'error');
      if (elements.apiKeyInput) {
        elements.apiKeyInput.focus();
      }
      return;
    }

    // API Key 基本格式检查（不能包含空格）
    if (apiKey.indexOf(' ') !== -1) {
      showToast('API Key 不应包含空格', 'error');
      if (elements.apiKeyInput) {
        elements.apiKeyInput.focus();
      }
      return;
    }

    // API 地址验证
    if (!endpoint) {
      showToast('请输入 API 地址', 'error');
      if (elements.endpointInput) {
        elements.endpointInput.focus();
      }
      return;
    }

    // 验证 URL 格式
    var urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(endpoint)) {
      showToast('API 地址格式不正确，需以 http:// 或 https:// 开头', 'error');
      if (elements.endpointInput) {
        elements.endpointInput.focus();
      }
      return;
    }

    // 去掉末尾的斜杠
    endpoint = endpoint.replace(/\/+$/, '');

    // 模型名称验证
    if (!model) {
      showToast('请输入模型名称', 'error');
      if (elements.modelInput) {
        elements.modelInput.focus();
      }
      return;
    }

    // ---- 保存配置 ----
    try {
      window.JobLensAPI.ApiConfig.save({
        apiKey: apiKey,
        apiEndpoint: endpoint,
        model: model
      });

      showToast('设置已保存', 'success');
      console.log('[JobLens] 设置已保存');

    } catch (err) {
      showToast('保存失败：' + err.message, 'error');
      console.error('[JobLens] 保存设置失败：', err);
    }
  }

  // ============================
  //  testConnection — 测试连接
  // ============================

  /**
   * 发送一个简单的测试请求，验证 API Key 和地址是否可用
   * 结果通过 Toast 提示展示
   */
  async function testConnection() {
    // 检查依赖
    if (!window.JobLensAPI || !window.JobLensAPI.callAI) {
      showToast('API 模块未加载', 'error');
      return;
    }

    // 先保存当前表单中的设置
    var apiKey = elements.apiKeyInput ? elements.apiKeyInput.value.trim() : '';
    var endpoint = elements.endpointInput ? elements.endpointInput.value.trim() : '';
    var model = elements.modelInput ? elements.modelInput.value.trim() : '';

    // 基本验证
    if (!apiKey) {
      showToast('请先输入 API Key', 'error');
      if (elements.apiKeyInput) {
        elements.apiKeyInput.focus();
      }
      return;
    }

    if (!endpoint) {
      showToast('请先输入 API 地址', 'error');
      return;
    }

    // 去掉末尾斜杠
    endpoint = endpoint.replace(/\/+$/, '');

    // 临时保存当前表单值（不覆盖已保存的配置）
    try {
      window.JobLensAPI.ApiConfig.save({
        apiKey: apiKey,
        apiEndpoint: endpoint,
        model: model || window.JobLensAPI.ApiConfig.defaults.model
      });
    } catch (err) {
      showToast('保存临时配置失败：' + err.message, 'error');
      return;
    }

    // 更新按钮状态
    var btn = elements.testBtn;
    var originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '测试中...';
    }

    showToast('正在测试连接...', 'info', 5000);

    try {
      // 发送测试消息
      var startTime = Date.now();
      var result = await window.JobLensAPI.callAI(
        [{ role: 'user', content: '请回复"连接成功"四个字。' }],
        {
          temperature: 0,
          maxTokens: 20
        }
      );
      var elapsed = Date.now() - startTime;

      // 判断是否成功
      if (result && result.trim().length > 0) {
        showToast('连接成功！响应时间：' + elapsed + 'ms', 'success', 5000);
        console.log('[JobLens] 连接测试成功，耗时：' + elapsed + 'ms，响应：' + result.trim());
      } else {
        showToast('连接成功，但返回内容为空', 'error');
      }

    } catch (err) {
      showToast('连接失败：' + err.message, 'error', 5000);
      console.error('[JobLens] 连接测试失败：', err);
    } finally {
      // 恢复按钮状态
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  }

  // ============================
  //  resetSettings — 重置设置
  // ============================

  /**
   * 清除所有已保存的设置，恢复表单为默认值
   * 使用确认对话框防止误操作
   */
  function resetSettings() {
    // 确认对话框
    var confirmed = confirm('确定要重置所有设置吗？已保存的 API Key 和配置将被清除。');
    if (!confirmed) {
      return;
    }

    // 清除 localStorage 中的配置
    if (window.JobLensAPI && window.JobLensAPI.ApiConfig) {
      window.JobLensAPI.ApiConfig.clear();
    }

    // 恢复表单为默认值
    var defaults = (window.JobLensAPI && window.JobLensAPI.ApiConfig)
      ? window.JobLensAPI.ApiConfig.defaults
      : { apiKey: '', apiEndpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini' };

    if (elements.apiKeyInput) {
      elements.apiKeyInput.value = defaults.apiKey || '';
    }
    if (elements.endpointInput) {
      elements.endpointInput.value = defaults.apiEndpoint || 'https://api.openai.com/v1';
    }
    if (elements.modelInput) {
      elements.modelInput.value = defaults.model || 'gpt-4o-mini';
    }

    showToast('设置已重置为默认值', 'info');
    console.log('[JobLens] 设置已重置');
  }

  // ============================
  //  事件绑定
  // ============================

  /**
   * 绑定按钮点击事件
   */
  function bindEvents() {
    // 保存按钮
    if (elements.saveBtn) {
      elements.saveBtn.addEventListener('click', function (e) {
        e.preventDefault();
        saveSettings();
      });
    }

    // 测试连接按钮
    if (elements.testBtn) {
      elements.testBtn.addEventListener('click', function (e) {
        e.preventDefault();
        testConnection();
      });
    }

    // 重置按钮
    if (elements.resetBtn) {
      elements.resetBtn.addEventListener('click', function (e) {
        e.preventDefault();
        resetSettings();
      });
    }

    // 支持 Enter 键保存（在输入框中按回车）
    var inputs = [elements.apiKeyInput, elements.endpointInput, elements.modelInput];
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i]) {
        inputs[i].addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            saveSettings();
          }
        });
      }
    }
  }

  // ============================
  //  DOM Ready 初始化
  // ============================

  /**
   * 当 DOM 加载完成后自动初始化设置页面
   */
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      // DOM 已经就绪
      callback();
    }
  }

  onReady(function () {
    initSettings();
    bindEvents();
  });

  // ============================
  //  导出到全局
  // ============================

  window.JobLensSettings = {
    initSettings: initSettings,
    saveSettings: saveSettings,
    testConnection: testConnection,
    resetSettings: resetSettings
  };

})();

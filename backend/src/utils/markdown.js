const { marked } = require('marked');

marked.setOptions({
  gfm: true,
  breaks: true
});

/** 将 Markdown 渲染为 HTML；已是 HTML 的旧数据原样返回 */
function renderMarkdown(md) {
  if (!md || !String(md).trim()) return '';
  const text = String(md);
  if (/^\s*</.test(text)) return text;
  return marked.parse(text);
}

module.exports = { renderMarkdown };

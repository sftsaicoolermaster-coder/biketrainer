// Google AI Gemini Assistant integration for AeroSpin
export class GeminiManager {
  constructor() {
    this.apiKey = localStorage.getItem('gemini_api_key') || '';
  }

  getAPIKey() {
    return this.apiKey;
  }

  setAPIKey(key) {
    this.apiKey = key.trim();
    localStorage.setItem('gemini_api_key', this.apiKey);
  }

  hasAPIKey() {
    return !!this.apiKey;
  }

  async validateAPIKey(key) {
    const k = key.trim();
    if (!k) return false;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${k}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say 'OK' in one word." }] }]
        })
      });
      if (!response.ok) return false;
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text && text.trim().toLowerCase().includes('ok');
    } catch (e) {
      console.error("Gemini API validation failed:", e);
      return false;
    }
  }

  async generateTrainingAdvice(params) {
    if (!this.apiKey) {
      throw new Error("請先設定 Gemini API 金鑰。");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    
    const prompt = `您是一位專業的自行車教練與運動科學專家。請針對使用者本次騎乘訓練數據進行深度分析，並提供本次訓練的結論（包含優缺點、強度是否合適）以及下一次訓練的建議設定（例如應維持、增加或減少強度，或是推薦哪類型的訓練課表）。

使用者個人資訊：
- 身高：${params.height} cm
- 體重：${params.weight} kg
- FTP (功率極限值)：${params.ftp} W

本次訓練資訊：
- 課表名稱：${params.workoutName}
- 強度調整：選擇了設定功率的 ${params.intensityScalePct}%
- 總時間：${params.duration}
- 總距離：${params.distance}
- 平均功率：${params.avgPower} W
- 最大功率：${params.maxPower} W
- 平均心率：${params.avgHR} BPM
- 最大心率：${params.maxHR} BPM
- 標準化功率 (NP)：${params.np} W
- 訓練壓力分數 (TSS)：${params.tss}
- 強度係數 (IF)：${params.ifVal}
- 消耗能量：${params.kj} kJ

數據歷程摘要（每隔一段時間的實際踩踏功率與心率）：
${params.historySummary.join('\n')}

請以繁體中文 (zh-TW) 回覆，結構清晰（使用 Markdown 標題、清單、粗體字），字數約在 300-500 字，回覆內容必須包括：
1. 🏆 本次訓練結論（分析平均功率、心率與區間分布，評估此強度的身體適應性，說明是否達到設定的${params.intensityScalePct}%強度的訓練效果）
2. 📈 下次訓練設定與建議（針對使用者身高、體重與 FTP，推薦下次的目標功率區間、強度調整及適合的課表）`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `HTTP 錯誤！狀態碼: ${response.status}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("Gemini 未傳回任何建議文字。");
      }
      return text;
    } catch (err) {
      console.error("Failed to generate AI advice:", err);
      throw err;
    }
  }
}

export const geminiManager = new GeminiManager();

// Simple self-contained Markdown-to-HTML parser for formatted responses
export function parseMarkdownToHTML(md) {
  if (!md) return '';
  return md
    // Headers
    .replace(/^### (.*$)/gim, '<h4 style="color:var(--color-power);margin-top:0.8rem;margin-bottom:0.4rem;">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 style="color:var(--color-power);margin-top:1rem;margin-bottom:0.5rem;">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 style="color:var(--color-power);margin-top:1.2rem;margin-bottom:0.6rem;">$1</h2>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .split('\n')
    .map(line => {
      line = line.trim();
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li style="margin-left:1rem;margin-bottom:0.25rem;list-style-type:disc;text-align:left;">${line.substring(2)}</li>`;
      }
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '');
        return `<li style="margin-left:1rem;margin-bottom:0.25rem;list-style-type:decimal;text-align:left;">${content}</li>`;
      }
      if (line === '') return '';
      if (line.startsWith('<h') || line.startsWith('<li')) return line;
      return `<p style="margin-bottom:0.5rem;line-height:1.6;text-align:left;">${line}</p>`;
    })
    .join('\n');
}

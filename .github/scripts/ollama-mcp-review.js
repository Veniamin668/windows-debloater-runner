import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода (Model: 7B + Beautified Report)...");

  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const targetFilePath = path.join(workspaceDir, "action.yml");
  let yamlCode = "";

  try {
    yamlCode = fs.readFileSync(targetFilePath, "utf-8");
    console.log("✅ Файл action.yml успешно прочитан через fs!");
  } catch (fsError) {
    console.error("❌ Не удалось прочитать файл action.yml:", fsError);
    process.exit(1);
  }

  const branchName = process.env.GITHUB_REF_NAME || "dynamic-branch";
  
  // Генерируем красивую дату и время с учетом Екатеринбурга (UTC+5) и UTC
  const now = new Date();
  
  const optionsEkb = { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeEkb = new Intl.DateTimeFormat('ru-RU', optionsEkb).format(now); // формат: DD.MM.YYYY, HH:mm:ss
  
  const optionsUtc = { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeUtc = new Intl.DateTimeFormat('ru-RU', optionsUtc).format(now);
  
  const dateFileStr = now.toISOString().split('T')[0]; // YYYY-MM-DD для имени файла

  const prompt = `
You are a senior AI security architect and code quality inspector for GitHub Actions.
Analyze the provided Composite Action code (action.yml) strictly.

CRITICAL RULE: DO NOT copy the source code of action.yml into your response. 
Structure your report cleanly using rich Markdown, callout blocks (> [!NOTE]), tables, and emojis to make it look professional.

Use the exact sections below:

# 🕵️‍♂️ Automated AI Code Audit & Security Report

> **📊 Meta Information:**
> - **Branch:** \`${branchName}\`
> - **Time (EKB, UTC+5):** \`${timeEkb}\`
> - **Time (UTC):** \`${timeUtc}\`
> - **Engine:** \`qwen2.5-coder:7b-instruct\`

## 📌 Executive Summary
Brief overview of what this configuration does and its architectural purpose.

## 📊 Criticality & Metrics Table
| Threat Level | Status / Count | Description & Impact |
| :--- | :--- | :--- |
| 🔴 Critical Bug | [Count & Details] | Logic broken, action will fail |
| 🟡 Medium Vulnerability | [Count & Details] | Potential script injection or unsafe context usage |
| 🟢 Optimization | [Count & Details] | Redundant steps or performance tips |

## 🔍 Detailed Breakdown of Steps
- **Step Name:** Analysis of logic, potential edge cases, and recommendations.

## 🛡️ Security Check
Verdict on 'run:' execution blocks and environment safety.

## 🏁 Final Conclusion
SUCCESS (or warning if issues found).

---

# 🇷🇺 РУССКАЯ ВЕРСИЯ ОТЧЕТА (Russian Translation)

Переведи весь предыдущий аналитический отчет на русский язык, сохранив красивое оформление, таблицы и блоки:

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода и Безопасности

> **📊 Мета-информация:**
> - **Ветка:** \`${branchName}\`
> - **Время (ЕКБ, UTC+5):** \`${timeEkb}\`
> - **Время (UTC):** \`${timeUtc}\`
> - **Движок:** \`qwen2.5-coder:7b-instruct\`

## 📌 Краткая сводка
Обзор назначения файла и его архитектуры.

## 📊 Таблица критичности и метрик
| Уровень угрозы | Статус / Количество | Описание и влияние |
| :--- | :--- | :--- |
| 🔴 Критический баг | [Оценка и детали] | Логика сломана, экшен упадет |
| 🟡 Средняя уязвимость | [Оценка и детали] | Потенциальный Script Injection через контексты |
| 🟢 Оптимизация | [Оценка и детали] | Избыточные шаги |

## 🔍 Детальный разбор шагов
- **Название шага:** Анализ логики, краевых случаев и рекомендации.

## 🛡️ Безопасность (Security Check)
Вердикт безопасности по блокам 'run:'.

## 🏁 Итоговое заключение
SUCCESS (или описание статуса).

КОД ФАЙЛА ДЛЯ АНАЛИЗА:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  console.log("🤖 Отправляем запрос в Ollama (qwen2.5-coder:7b-instruct)...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 900 * 1000); // 15 минут лимит

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "qwen2.5-coder:7b-instruct", 
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 4096,
          temperature: 0.1
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ошибка сервера Ollama: ${response.statusText}`);
    }

    const result = await response.json();
    const aiVerdict = result.response.trim();

    console.log("\n====== [ВЕРДИКТ ЛОКАЛЬНОГО ИИ (7B)] ======");
    console.log(aiVerdict);
    console.log("===========================================\n");

    const reportsDir = path.join(workspaceDir, "ai-reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Имя файла: audit-<ветка>-<дата>.md
    const reportFileName = `audit-${branchName}-${dateFileStr}.md`;
    const reportPath = path.join(reportsDir, reportFileName);
    
    fs.writeFileSync(reportPath, aiVerdict, "utf-8");
    console.log(`💾 Отчет успешно сохранен в папку: ai-reports/${reportFileName}`);

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("❌ Превышен лимит времени ожидания Ollama (15 минут истекли).");
    } else {
      console.error("❌ Ошибка при общении с API Ollama:", error);
    }
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("💥 Критическая ошибка выполнения скрипта:", err);
  process.exit(1);
});

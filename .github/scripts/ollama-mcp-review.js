import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода (Model: 14B Heavy + Ultra Beautified Report)...");

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
  const timeEkb = new Intl.DateTimeFormat('ru-RU', optionsEkb).format(now);
  
  const optionsUtc = { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeUtc = new Intl.DateTimeFormat('ru-RU', optionsUtc).format(now);
  
  const dateFileStr = now.toISOString().split('T')[0]; // YYYY-MM-DD для имени файла

  const prompt = `
You are a Lead AI Security Architect and Code Quality Specialist for GitHub Actions.
Analyze the provided Composite Action code (action.yml) with maximum precision.

CRITICAL RULES:
1. DO NOT copy the whole source code of action.yml into your response.
2. Structure your report cleanly using Markdown callouts (> [!NOTE], > [!WARNING], > [!IMPORTANT]), tables, badges, and clean formatting.
3. Feel free to provide deep, detailed technical analysis if you find non-trivial architectural patterns or potential edge cases. Depth of detail is welcome!

Required structure:

# 🕵️‍♂️ Automated AI Code Audit & Security Report

> **📊 Audit Metadata:**
> - **Target Branch:** \`${branchName}\`
> - **Execution Time (EKB, UTC+5):** \`${timeEkb}\`
> - **Execution Time (UTC):** \`${timeUtc}\`
> - **AI Engine:** \`qwen2.5-coder:14b-instruct\`

## 📌 Executive Summary
High-level overview of what this workflow/action performs, its purpose, and overall code hygiene.

## 📊 Criticality & Metrics Table
| Severity Level | Count / Status | Description & Security Impact |
| :--- | :--- | :--- |
| 🔴 Critical Bug | [Count] | Broken logic or steps that will fail execution |
| 🟡 Vulnerability | [Count] | Unsafe context usage, potential injection, or weak permissions |
| 🟢 Optimization | [Count] | Performance bottlenecks, redundant steps, maintainability tips |

## 🔍 Deep Dive Step Analysis
Break down each key step or block. Provide code snippets for fixes where appropriate.

## 🛡️ Security & Hardening Check
Verdict on \`run:\` blocks, shell safety, secrets handling, and system privileges.

## 🏁 Final Verdict
State "SUCCESS" if clean, or highlight action items required.

---

# 🇷🇺 РУССКАЯ ВЕРСИЯ ОТЧЕТА (Russian Translation)

Переведи весь прошлый отчет на русский язык. Сохрани стильное оформление, красивые таблицы, блоки подсветок (> [!NOTE]) и дай детальный понятный разбор:

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода и Безопасности

> **📊 Мета-информация аудита:**
> - **Целевая ветка:** \`${branchName}\`
> - **Время выполнения (ЕКБ, UTC+5):** \`${timeEkb}\`
> - **Время выполнения (UTC):** \`${timeUtc}\`
> - **Движок ИИ:** \`qwen2.5-coder:14b-instruct\`

## 📌 Краткая сводка
Обзор работы action.yml, архитектуры и общего качества кода.

## 📊 Таблица критичности и метрик
| Уровень риска | Статус / Кол-во | Описание и влияние на безопасность |
| :--- | :--- | :--- |
| 🔴 Критический баг | [Количество] | Ошибки в логике, при которых шаг упадет |
| 🟡 Уязвимость | [Количество] | Опасные контексты, риск инъекций или лишние права |
| 🟢 Оптимизация | [Количество] | Лишние действия, скорость работы и чистота кода |

## 🔍 Детальный технический разбор
Разбери ключевые шаги. Если нужно — предложи точные варианты исправлений в виде фрагментов кода.

## 🛡️ Безопасность и защита (Security Check)
Вердикт по блокам \`run:\`, проверке контекстов и работе с окружением.

## 🏁 Итоговое заключение
Напиши "SUCCESS", если критических проблем нет, или перечисли необходимые правки.

КОД ФАЙЛА ДЛЯ АНАЛИЗА:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  console.log("🤖 Отправляем запрос в Ollama (qwen2.5-coder:14b-instruct)...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 900 * 1000); // 15 минут

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "qwen2.5-coder:14b-instruct", 
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 4096,
          temperature: 0.15 // Небольшой вариатив для более красивого описания
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ошибка сервера Ollama: ${response.statusText}`);
    }

    const result = await response.json();
    const aiVerdict = result.response.trim();

    console.log("\n====== [ВЕРДИКТ ЛОКАЛЬНОГО ИИ (14B)] ======");
    console.log(aiVerdict);
    console.log("============================================\n");

    const reportsDir = path.join(workspaceDir, "ai-reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

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

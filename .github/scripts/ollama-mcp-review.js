import fs from "fs";
import path from "path";

async function queryOllama(model, prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 900 * 1000); // 15 минут

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 4096,
          temperature: 0.15
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ошибка сервера Ollama: ${response.statusText}`);
    }

    const result = await response.json();
    return result.response.trim();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода (Dual-Language Mode)...");

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
  const now = new Date();
  
  const optionsEkb = { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeEkb = new Intl.DateTimeFormat('ru-RU', optionsEkb).format(now);
  
  const optionsUtc = { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeUtc = new Intl.DateTimeFormat('ru-RU', optionsUtc).format(now);
  
  const dateFileStr = now.toISOString().split('T')[0];
  const modelName = "qwen2.5-coder:14b-instruct";

  // --- 1. ПРОМПТ НА АНГЛИЙСКОМ ---
  const promptEN = `
You are a Lead AI Security Architect and Code Quality Specialist for GitHub Actions.
Analyze the provided Composite Action code (action.yml) with maximum precision.

CRITICAL RULES:
1. DO NOT copy the whole source code of action.yml into your response.
2. Output ONLY in ENGLISH.
3. Structure your report cleanly using Markdown callouts (> [!NOTE], > [!WARNING]), tables, and clean formatting.

# 🕵️‍♂️ Automated AI Code Audit & Security Report

> **📊 Audit Metadata:**
> - **Target Branch:** \`${branchName}\`
> - **Execution Time (EKB, UTC+5):** \`${timeEkb}\`
> - **Execution Time (UTC):** \`${timeUtc}\`
> - **AI Engine:** \`${modelName}\`

## 📌 Executive Summary
High-level overview of what this action performs, its purpose, and overall code hygiene.

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

SOURCE CODE FOR ANALYSIS:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  // --- 2. ПРОМПТ НА РУССКОМ ---
  const promptRU = `
Ты — ведущий AI-архитектор безопасности и инспектор качества кода для GitHub Actions.
Проанализируй предоставленный код Composite Action (action.yml) с максимальной точностью.

КРИТИЧЕСКИЕ ПРАВИЛА:
1. НЕ копируй исходный код action.yml целиком в свой ответ.
2. Ответ должен быть ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ.
3. Оформляй отчет красиво, используя Markdown, таблицы, эмодзи и блоки-подсказки (> [!NOTE], > [!WARNING]).

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода и Безопасности

> **📊 Мета-информация аудита:**
> - **Целевая ветка:** \`${branchName}\`
> - **Время выполнения (ЕКБ, UTC+5):** \`${timeEkb}\`
> - **Время выполнения (UTC):** \`${timeUtc}\`
> - **Движок ИИ:** \`${modelName}\`

## 📌 Краткая сводка
Обзор работы action.yml, архитектуры и общего назначения скрипта.

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
Напиши слово "SUCCESS", если критических проблем нет, или перечисли необходимые правки.

КОД ФАЙЛА ДЛЯ АНАЛИЗА:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  const reportsDir = path.join(workspaceDir, "ai-reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  try {
    // Генерация EN отчета
    console.log("🤖 [1/2] Генерируем Английский отчет...");
    const reportEN = await queryOllama(modelName, promptEN);
    const fileNameEN = `audit-${branchName}-${dateFileStr}-en.md`;
    fs.writeFileSync(path.join(reportsDir, fileNameEN), reportEN, "utf-8");
    console.log(`💾 Английский отчет сохранен: ai-reports/${fileNameEN}`);

    // Генерация RU отчета
    console.log("🤖 [2/2] Генерируем Русский отчет...");
    const reportRU = await queryOllama(modelName, promptRU);
    const fileNameRU = `audit-${branchName}-${dateFileStr}-ru.md`;
    fs.writeFileSync(path.join(reportsDir, fileNameRU), reportRU, "utf-8");
    console.log(`💾 Русский отчет сохранен: ai-reports/${fileNameRU}`);

    console.log("\n🎉 Оба отчета успешно сгенерированы!");

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("❌ Превышен лимит времени ожидания Ollama (15 минут истекли).");
    } else {
      console.error("❌ Ошибка при генерации отчетов:", error);
    }
    process.exit(1);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("💥 Критическая ошибка выполнения скрипта:", err);
  process.exit(1);
});

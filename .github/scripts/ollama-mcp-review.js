import fs from "fs";
import path from "path";
import { fetch, Agent } from "undici";

// Отключаем таймауты undici для ожидания 32B модели
const customAgent = new Agent({
  headersTimeout: 0,
  bodyTimeout: 0,
  connectTimeout: 30000
});

async function run() {
  console.log("🚀 Запуск ИИ-агента (32B Model + Strict System Prompt)...");

  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const targetFilePath = path.join(workspaceDir, "action.yml");
  let yamlCode = "";

  try {
    yamlCode = fs.readFileSync(targetFilePath, "utf-8");
    console.log("✅ Файл action.yml успешно прочитан!");
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
  
  const ekbParts = new Intl.DateTimeFormat('ru-RU', { 
    timeZone: 'Asia/Yekaterinburg', 
    year: 'numeric', month: '2-digit', day: '2-digit', 
    hour: '2-digit', minute: '2-digit', hour12: false 
  }).formatToParts(now);
  
  const partMap = Object.fromEntries(ekbParts.map(p => [p.type, p.value]));
  const dateTimeFileStr = `${partMap.year}-${partMap.month}-${partMap.day}_${partMap.hour}-${partMap.minute}`;

  // МЕНЯЕМ НА 32B МОДЕЛЬ
  const modelName = "qwen2.5-coder:32b-instruct";

  // --- 1. ПРОМПТ EN ---
  const promptEN = `
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

  // --- 2. ПРОМПТ RU ---
  const promptRU = `
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1800 * 1000); // 30 минут на 32B модель

  try {
    // === ГЕНЕРАЦИЯ EN ОТЧЕТА ===
    console.log("🤖 [1/2] Генерируем Английский отчет (32B)...");
    const resEN = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      dispatcher: customAgent,
      body: JSON.stringify({
        model: modelName,
        system: "You are an expert AI Code Auditor. Respond strictly in English.",
        prompt: promptEN,
        stream: false,
        options: { num_ctx: 4096, temperature: 0.15 }
      })
    });
    const dataEN = await resEN.json();
    const fileNameEN = `audit-${branchName}-${dateTimeFileStr}-en.md`;
    fs.writeFileSync(path.join(reportsDir, fileNameEN), dataEN.response.trim(), "utf-8");
    console.log(`💾 Английский отчет сохранен: ai-reports/${fileNameEN}`);

    // === ГЕНЕРАЦИЯ RU ОТЧЕТА С ЖЕСТКИМ SYSTEM PROMPT ===
    console.log("🤖 [2/2] Генерируем Русский отчет (32B + Strict System)...");
    const resRU = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      dispatcher: customAgent,
      body: JSON.stringify({
        model: modelName,
        // ЖЕСТКАЯ УСТАНОВКА ЯЗЫКА НА УРОВНЕ СИСТЕМНОЙ РОЛИ:
        system: "Ты — русскоязычный ИИ-архитектор. Твоя ТРЕБОВАТЕЛЬНАЯ ОБЯЗАННОСТЬ — писать весь отчет ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. Запрещено использовать английский язык где-либо, кроме кода и названий переменных.",
        prompt: promptRU,
        stream: false,
        options: { num_ctx: 4096, temperature: 0.0 } // 0.0 убирает любую склонность сбиваться на инглиш
      })
    });
    const dataRU = await resRU.json();
    const fileNameRU = `audit-${branchName}-${dateTimeFileStr}-ru.md`;
    fs.writeFileSync(path.join(reportsDir, fileNameRU), dataRU.response.trim(), "utf-8");
    console.log(`💾 Русский отчет сохранен: ai-reports/${fileNameRU}`);

    clearTimeout(timeoutId);
    console.log("\n🎉 Оба 32B-отчета успешно сгенерированы!");

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("❌ Превышен лимит времени ожидания Ollama (30 минут истекли).");
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

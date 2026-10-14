import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода...");

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

  // ДВУХЪЯЗЫЧНЫЙ ПРОМПТ: Сначала английский анализ, затем полный перевод на русский
  const prompt = `
You are a senior AI security architect and code quality inspector for GitHub Actions.
Analyze the provided Composite Action code (action.yml) strictly.

CRITICAL RULE: DO NOT copy the source code of action.yml into your response. Only provide technical analysis, tables, and conclusions!

Structure your report in Markdown using the exact sections below:

# 🕵️‍♂️ Automated AI Code Audit (Branch: ${branchName})

## 📊 Criticality Summary Table
| Threat Level | Count | Description |
| :--- | :--- | :--- |
| 🔴 Critical Bug | [Estimate count & details] | Logic broken, action will fail |
| 🟡 Medium Vulnerability | [Estimate count & details] | Potential Script Injection via contexts |
| 🟢 Optimization | [Estimate count & details] | Redundant steps |

## 🔍 Detailed Breakdown of Issues
- **Step [Name]:** Description of the issue and remediation recommendations.

## 🛡️ Security Check
Security verdict on 'run:' blocks.

## 🏁 Final Conclusion
If there are no critical bugs, add the word "SUCCESS" at the very end.

---

# 🇷🇺 РУССКАЯ ВЕРСИЯ ОТЧЕТА (Russian Translation)

Переведи весь предыдущий аналитический отчет на русский язык, сохранив структуру разделов, таблицы и вердикт:

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода (Ветка: ${branchName})

## 📊 Сводная таблица критичности
| Уровень угрозы | Количество | Описание |
| :--- | :--- | :--- |
| 🔴 Критический баг | [Оценка и детали] | Логика сломана, экшен упадет |
| 🟡 Средняя уязвимость | [Оценка и детали] | Потенциальный Script Injection через контексты |
| 🟢 Оптимизация | [Оценка и детали] | Избыточные шаги |

## 🔍 Детальный разбор проблемных мест
- **Шаг [Название]:** Описание проблемы и рекомендации по исправлению.

## 🛡️ Безопасность (Security Check)
Вердикт безопасности по блокам 'run:'.

## 🏁 Итоговое заключение
SUCCESS (или описание статуса).

КОД ФАЙЛА ДЛЯ АНАЛИЗА:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  console.log("🤖 Отправляем запрос в Ollama (qwen2.5-coder:1.5b-instruct)...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300 * 1000);

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "qwen2.5-coder:1.5b-instruct", 
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 8192,
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

    console.log("\n====== [ВЕРДИКТ ЛОКАЛЬНОГО ИИ] ======");
    console.log(aiVerdict);
    console.log("=======================================\n");

    const reportPath = path.join(workspaceDir, "analyzing-ai.md");
    fs.writeFileSync(reportPath, aiVerdict, "utf-8");
    console.log("💾 Отчет успешно сохранен в файл analyzing-ai.md");

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("❌ Превышен лимит времени ожидания Ollama.");
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

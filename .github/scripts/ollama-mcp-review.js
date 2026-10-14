import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода...");

  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const targetFilePath = path.join(workspaceDir, "action.yml");
  let yamlCode = "";

  // Читаем файл через нативный fs напрямую и без лишних танцев с бубном
  try {
    yamlCode = fs.readFileSync(targetFilePath, "utf-8");
    console.log("✅ Файл action.yml успешно прочитан через fs!");
  } catch (fsError) {
    console.error("❌ Не удалось прочитать файл action.yml:", fsError);
    process.exit(1);
  }

  const branchName = process.env.GITHUB_REF_NAME || "динамическая ветка";

  // Формируем промпт для модели
  const prompt = `
Ты — ведущий ИИ-архитектор безопасности и главный инспектор качества кода GitHub Actions.
Перед тобой код Composite Action (файл action.yml). Проведи технический аудит.

Сформируй отчет строго в формате Markdown, используя следующие разделы:

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода (Ветка: ${branchName})

## 📊 Сводная таблица критичности
| Уровень угрозы | Количество | Описание |
| :--- | :--- | :--- |
| 🔴 Критический баг | [Заполни] | Логика сломана, экшен упадет |
| 🟡 Средняя уязвимость | [Заполни] | Потенциальный Script Injection через контексты |
| 🟢 Оптимизация | [Заполни] | Избыточные шаги |

## 🔍 Детальный разбор проблемных мест
- **Шаг [Название]:** Описание проблемы и как исправить.

## 🛡️ Безопасность (Security Check)
Вердикт безопасности по блокам 'run:'.

## 🏁 Итоговое заключение
Если критических багов нет, добавь в самый конец фразу "SUCCESS".

КОД ФАЙЛА ДЛЯ СКАНУИРОВАНИЯ:
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
          temperature: 0.2
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

  // Принудительно гасим процесс, чтобы Node.js не висел в фоне
  process.exit(0);
}

run().catch((err) => {
  console.error("💥 Критическая ошибка выполнения скрипта:", err);
  process.exit(1);
});

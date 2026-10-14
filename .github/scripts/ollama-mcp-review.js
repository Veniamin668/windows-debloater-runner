import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода с надежным MCP...");

  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();
  const targetFilePath = path.join(workspaceDir, "action.yml");
  let yamlCode = "";

  // 1. Пытаемся прочитать через MCP, но с гарантированным фоллбеком на fs, если транспорт тупит
  try {
    console.log("🔗 Подключение к Filesystem MCP серверу...");
    const transport = new StdioClientTransport({
      command: "mcp-server-filesystem",
      args: [workspaceDir],
      timeout: 180000
    });

    const mcpClient = new Client({ name: "ollama-mcp-bridge", version: "1.0.0" });
    await mcpClient.connect(transport);
    console.log("🟢 MCP сервер подключен. Запрос на чтение action.yml...");

    const fileContent = await mcpClient.callTool(
      "read_file", 
      { path: targetFilePath },
      { timeout: 180000 }
    );
    
    yamlCode = fileContent.content ? fileContent.content.text : JSON.stringify(fileContent);
    console.log("✅ Файл успешно прочитан через MCP инструмент!");
  } catch (mcpError) {
    console.warn("⚠️ MCP транспорт капризничает или отвалился по таймауту. Переходим на быстрое резервное чтение через fs...");
    try {
      yamlCode = fs.readFileSync(targetFilePath, "utf-8");
      console.log("✅ Файл action.yml успешно прочитан через резервный fs!");
    } catch (fsError) {
      console.error("❌ Не удалось прочитать файл action.yml даже через fs:", fsError);
      process.exit(1);
    }
  }

  const branchName = process.env.GITHUB_REF_NAME || "динамическая ветка";

  // 2. Формируем промпт для быстрой модели
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
}

run().catch((err) => {
  console.error("💥 Критическая ошибка выполнения скрипта:", err);
  process.exit(1);
});

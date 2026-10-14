import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";
import path from "path";

async function run() {
  console.log("🚀 Запуск ИИ-агента аналитики кода...");

  // Определяем рабочую директорию через GITHUB_WORKSPACE или process.cwd()
  const workspaceDir = process.env.GITHUB_WORKSPACE || process.cwd();

  // 1. Инициализируем транспорт до Filesystem MCP сервера
  const transport = new StdioClientTransport({
    command: "mcp-server-filesystem",
    args: [workspaceDir],
    timeout: 180000
  });

  const mcpClient = new Client({ name: "ollama-mcp-bridge", version: "1.0.0" });
  
  console.log("🔗 Подключение к Filesystem MCP серверу...");
  await mcpClient.connect(transport);
  console.log("🟢 MCP сервер успешно подключен и готов к чтению файлов.");

  // 2. Считываем файл action.yml через инструмент MCP с жестким таймаутом в 3 минуты (180000 мс)
  console.log("📂 Запрос на чтение файла action.yml через инструмент MCP...");
  let yamlCode = "";
  try {
    const targetFilePath = path.join(workspaceDir, "action.yml");
    
    // Передаем options с явным таймаутом третьим аргументом, чтобы перебить дефолтные 60 секунд SDK
    const fileContent = await mcpClient.callTool(
      "read_file", 
      { path: targetFilePath },
      { timeout: 180000 }
    );
    
    yamlCode = fileContent.content.text; 
    console.log("✅ Файл action.yml успешно прочитан и загружен в контекст.");
  } catch (error) {
    console.error("❌ MCP не смог прочитать файл action.yml. Проверьте, лежит ли он в корне репозитория.");
    console.error(error);
    process.exit(1);
  }

  // Получаем имя текущей бранчи из переменных окружения GitHub Actions для промпта
  const branchName = process.env.GITHUB_REF_NAME || "динамическая ветка";

  // 3. Формируем элитный промпт для Qwen 2.5 Coder
  const prompt = `
Ты — ведущий ИИ-архитектор безопасности и главный инспектор качества кода GitHub Actions.
Перед тобой код огромного Composite Action (файл action.yml). Проведи глубокий технический аудит.

Сформируй отчет строго в формате Markdown, используя следующие разделы:

# 🕵️‍♂️ Автоматический ИИ-Аудит Кода (Ветка: ${branchName})

## 📊 Сводная таблица критичности

| Уровень угрозы | Количество | Описание |
| :--- | :--- | :--- |
| 🔴 Критический баг | [Заполни] | Логика сломана, экшен гарантированно упадет или зависнет |
| 🟡 Средняя уязвимость | [Заполни] | Потенциальный Script Injection через контексты \$\{\{ \}\} или плохие bash-практики |
| 🟢 Оптимизация | [Заполни] | Избыточные шаги, можно ускорить или упростить |

## 🔍 Детальный разбор проблемных мест
Выведи списком конкретные куски кода. Формат:
- **Шаг [Название шага]:** Описание проблемы. *Почему это опасно?* Как исправить правильно. По возможности укажи примерные строки или блоки.

## 🛡️ Безопасность (Security Check)
Проведи проверку блоков 'run:'. Убедись, что пользовательский ввод из inputs не подставляется напрямую в bash без экранирования. Напиши вердикт безопасности.

## 🏁 Итоговое заключение
Если критических багов нет и код идеален, обязательно добавь в самый конец фразу "SUCCESS". В противном случае опиши общие рекомендации по рефакторингу.

КОД ФАЙЛА ДЛЯ СКАНУИРОВАНИЯ:
\`\`\`yaml
${yamlCode}
\`\`\`
`;

  console.log("🤖 Отправляем тяжелый запрос в локальную Ollama (qwen2.5-coder:7b-instruct-q8_0)...");
  console.log("⏳ Максимальное время ожидания ответа установлено на 5 минут...");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300 * 1000);

  // 4. Делаем запрос к исправленному локальному API Ollama
  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "qwen2.5-coder:7b-instruct-q8_0", 
        prompt: prompt,
        stream: false,
        options: {
          num_ctx: 16384,
          temperature: 0.2,
          top_p: 0.9
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

    // 5. Записываем отчет в файл аналитики прямо в корень репозитория через workspace
    const reportPath = path.join(workspaceDir, "analyzing-ai.md");
    fs.writeFileSync(reportPath, aiVerdict, "utf-8");
    console.log("💾 Отчет успешно сохранен в файл analyzing-ai.md");

    // 6. Проверяем, нашел ли ИИ критические ошибки
    if (!aiVerdict.includes("SUCCESS")) {
      console.log("⚠️ Локальный ИИ зафиксировал баги или уязвимости. Файл отчета отправляется в репозиторий.");
    } else {
      console.log("🎉 Поздравляем! ИИ не нашел критических проблем в этой сборке.");
    }

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("❌ Превышен лимит времени ожидания (5 минут). Ollama не успела обработать огромный файл на CPU.");
    } else {
      console.error("❌ Произошла ошибка при общении с API Ollama:");
      console.error(error);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("💥 Критическая ошибка выполнения скрипта:", err);
  process.exit(1);
});

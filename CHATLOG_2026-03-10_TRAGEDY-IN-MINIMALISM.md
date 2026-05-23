# Tragedy in Minimalism — история обновлений за 2026-03-10

## Что было сделано
- Проведена диагностика того, почему загруженные видео не проигрываются в desktop `.app`.
- Проверено, что проблема не в отсутствии файлов:
  - видео лежат в `/Users/deercries/Desktop/Tragedy-in-Minimalism/videos`
  - те же файлы присутствуют в `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/videos`
- Проверено, что desktop-приложение запускает player через локальный HTTP-сервер внутри Electron, а не через `file://`.
- Уточнено, что для `.app` наиболее вероятная причина проблем с воспроизведением связана с форматом / кодеком самих экспортов, а не с путями в проекте.

## Формат видео для проекта
- Зафиксированы требования к безопасному формату видео для проекта:
  - контейнер: `MP4`
  - видео: `H.264`
  - аудио: `AAC`
  - pixel format: `yuv420p`
  - color space: `Rec.709`
  - без HDR
  - без alpha
- Уточнено рабочее разрешение проекта для будущих экспортов:
  - `2464x1856`
- Подготовлены практические рекомендации по экспорту для Adobe Premiere под это разрешение.

## Шрифты в основной части проекта
- По запросу временно подключался шрифт `USSR Stencil` в основной части player.
- Затем `USSR Stencil` был заменён на `Buse` с компьютера пользователя.
- Шрифт `Buse` подключён локально в player через `@font-face`:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/fonts/BUSE.otf`
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/fonts/BUSE.otf`
- Визуальные изменения применены только к основной части проекта:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/style.css`
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/style.css`
- Нодовый редактор намеренно не изменялся:
  - `editor.css` не трогался
  - шрифт в editor mode не подключался

## Исправление применения шрифта к выборам
- Выяснено, что шрифт не применялся к кнопкам выбора, потому что `.choice-btn` не наследовал `font-family`.
- В основной player и в desktop-content добавлено наследование шрифта для кнопок выбора:
  - `font-family: inherit`
- Благодаря этому шрифт player теперь применяется и к окнам выбора.

## Desktop-часть и сборка
- Найдена и исправлена проблема синхронизации шрифтов в desktop-сборку:
  - `desktop-app/tools/sync-content.js` раньше копировал `videos/` и `audio/`, но не копировал `fonts/`
  - в sync добавлено копирование папки `fonts/`
- После этого:
  - пересинхронизирован `desktop-app/content`
  - многократно пересобрана актуальная `.app`
- Отдельно отмечено:
  - шаг сборки `.dmg` падал на `hdiutil`
  - сама `.app` при этом успешно пересобиралась

## Текущая рабочая сборка
- Актуальная desktop-сборка проекта находится в:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/dist/mac/Tragedy in Minimalism.app`

## Ключевые файлы, затронутые сегодня
- Основной player:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/style.css`
- Desktop player content:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/style.css`
- Синхронизация desktop-контента:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/tools/sync-content.js`
- Локальные шрифты player:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/fonts/BUSE.otf`
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/fonts/BUSE.otf`

## Текущее состояние
- Основная часть проекта использует шрифт `Buse`.
- Нодовый редактор остаётся на своём отдельном визуальном стиле без этого шрифта.
- Desktop `.app` пересобрана после исправления sync шрифтов.
- Требования к формату видео для дальнейших загрузок в проект зафиксированы.

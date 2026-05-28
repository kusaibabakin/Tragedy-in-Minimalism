# Tragedy in Minimalism — история обновлений за 2026-05-24

## Что было сделано
- Проект переведён на схему публикации `Cloudflare Pages + Cloudflare R2`.
- Публичная HTML-версия теперь собирается как `player-only` без editor UI.
- Desktop-версия и локальный editor сохранены как отдельный рабочий контур.

## Публикация player-only сайта
- Добавлен экспорт публичной версии в папку `site/`.
- Добавлен скрипт:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/tools/export-site.js`
- Экспорт собирает:
  - `index.html`
  - `app.js`
  - `style.css`
  - `story.json`
  - `audio/`
  - `fonts/`
- Локальная папка `videos/` больше не копируется в `site/`.

## Внешнее хранение видео
- Добавлен конфиг:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/site.config.json`
- В конфиг записан публичный R2 base URL:
  - `https://pub-4077e61cd3c3400ba4f8b9e50c320690.r2.dev/videos`
- Экспорт подставляет этот URL в `site/story.json` через `settings.videoBaseUrl`.

## Player / video loading
- Основной player обновлён так, чтобы при наличии `settings.videoBaseUrl` загружать видео не из локальной папки `videos/`, а по внешнему URL.
- Изменения внесены в:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/app.js`
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/desktop-app/content/app.js`

## Исправление заставки
- Найдена и исправлена проблема с фоновым activation-видео:
  - `zastavka.mp4` раньше была жёстко привязана к локальному пути `./videos/zastavka.mp4`
  - теперь activation backdrop тоже использует `videoBaseUrl`
- После этого public player и activation screen должны брать `zastavka.mp4` из R2.

## Cloudflare / инфраструктура
- Создан bucket в Cloudflare R2.
- Проверено, что прямые URL к видео из R2 открываются.
- Подготовлена инструкция:
  - `/Users/deercries/Desktop/Tragedy-in-Minimalism/CLOUDFLARE_SETUP.md`
- Публикация настроена через Cloudflare Pages.
- Репозиторий GitHub подключён к Pages.
- Первая публикация через Pages завершена успешно.

## Git / репозиторий
- Изначально push на GitHub ломался из-за тяжёлых видеофайлов в git-истории.
- Git-история была пересобрана с нуля без:
  - `videos/`
  - `desktop-app/content/videos/`
- `.gitignore` обновлён так, чтобы исключать видео из репозитория.
- После этого push на GitHub прошёл успешно.

## GitHub token / workflow
- Возникла ошибка из-за отсутствия `workflow` scope у старого GitHub token.
- Проблема была решена через новый token с правами:
  - `repo`
  - `workflow`
- После очистки старого credential и повторного push ветка `main` была опубликована в GitHub.

## Созданные и обновлённые служебные файлы
- `/Users/deercries/Desktop/Tragedy-in-Minimalism/PUBLISHING.md`
- `/Users/deercries/Desktop/Tragedy-in-Minimalism/CLOUDFLARE_SETUP.md`
- `/Users/deercries/Desktop/Tragedy-in-Minimalism/site.config.json`
- `/Users/deercries/Desktop/Tragedy-in-Minimalism/tools/export-site.js`
- `/Users/deercries/Desktop/Tragedy-in-Minimalism/.github/workflows/pages.yml`

## Текущий рабочий процесс
- Локальные правки делаются в основном проекте.
- Editor остаётся локальным и не публикуется как часть публичного сайта.
- После изменения player-кода или данных:
  - `node ./tools/export-site.js`
  - `git add .`
  - `git commit -m "Update public player"`
  - `git push`
- Если меняются ролики:
  - загрузить обновлённые файлы в Cloudflare R2
- Если меняется адрес R2 bucket:
  - обновить `site.config.json`
  - заново выполнить экспорт

## Примечания
- Публичный сайт работает через Cloudflare Pages.
- Видео обслуживаются из Cloudflare R2.
- Локальный desktop player и локальный editor продолжают использовать проектную структуру без отказа от desktop workflow.

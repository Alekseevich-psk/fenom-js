import { render } from './core/index';
const template = document.querySelector('body');
// === Запуск на странице ===
(function () {
    const container = document.querySelector('body');
    if (!container)
        return;
    // Сохраним только внутренний HTML, но не запускай скрипты
    const templateHTML = container.innerHTML;
    // Твои данные
    const context = {
        name: 'Анна',
        isAdmin: true
    };
    // Рендерим
    const html = render(templateHTML, context);
    // Вставляем обратно
    container.innerHTML = html;
})();

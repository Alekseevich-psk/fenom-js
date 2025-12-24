import { FenomJs, createAsyncLoader } from 'fenom-js'; // ← ESM: .js
import { join } from 'path';

const root = join(process.cwd(), 'src', 'templates');

// Создаём асинхронный загрузчик шаблонов
const loader = createAsyncLoader(root);

// Читаем шаблон (можно и через fs, но ради теста — вручную)
const template = `{extends "layout.tpl"}

{block "title"}Главная{/block}

{block "content"}
    <h1>Привет, {$name|capitalize}!</h1>
    <p>Статус: {$status|upper}</p>
    <p>Дата: {date($timestamp, 'd.m.Y')}</p>

    {if $users}
        <ul>
        {foreach $users as $user}
            <li>{$user.name} — {$user.email|lower}</li>
        {/foreach}
        </ul>
    {else}
        <p>Нет пользователей</p>
    {/if}

    {$rawHtml|raw}
{/block}
`;

// Контекст
const context = {
    name: 'анна',
    status: 'active',
    timestamp: Date.now() / 1000,
    users: [
        { name: 'Иван', email: 'IVAN@EXAMPLE.COM' },
        { name: 'Мария', email: 'MARIA@EXAMPLE.COM' }
    ],
    rawHtml: '<div style="color:green">Это <b>сырой HTML</b></div>'
};

// Асинхронная функция для запуска теста
async function testFenom() {
    try {
        const html = await FenomJs(template, context, {
            root,
            loader,
            minify: false
        });

        console.log('✅ Результат рендеринга:\n');
        console.log(html);
    } catch (err) {
        console.error('❌ Ошибка:', err);
    }
}

// Запуск
testFenom();


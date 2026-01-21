{extends 'file:layouts/base.tpl'}
{block "title"}Расширенная демонстрация Fenom!{/block}

{block "main"}

    <h1>🚀 Расширенная демонстрация возможностей Fenom</h1>

{ignore}
{set $name = "Анна"}
{set $age = 28}
{set $is_premium = true}
{set $price = 1350}
{set $discount = 0.15}
{set $count = 5}
{set $items = ['яблоко', 'банан', 'апельсин']}
{/ignore}

{* 1. Установка переменных *}
{set $name = "Анна"}
{set $age = 28}
{set $is_premium = true}
{set $price = 1350}
{set $discount = 0.15}
{set $count = 5}
{set $items = ['яблоко', 'банан', 'апельсин']}

{* 2. Математические выражения *}
<section>
    <h2>🧮 Математические выражения</h2>
    <ul>

        {set $test = $name ~ $name}
        {$test}

        {set $count = 5}
        <li>Удвоение: {$count * 2}</li>
        {ignore}
        {$count * 2}
        {/ignore}

        {set $count = 5}
        <li>Остаток от деления: {$count % 2}</li>
        {ignore}
        {$count % 2}
        {/ignore}

        {set $count = 5}
        <li>Инкремент: {$count++} ~ {$count}</li>
        {ignore}
        {$count++} ~ {$count}
        {/ignore}

        {set $count = 5}
        <li>Декремент: {$count--} ~ {$count}</li>
        {ignore}
        {$count--} ~ {$count}
        {/ignore}

        {set $count = 5}
        <li>Присваивание: {$count += 10}</li>
        {ignore}
        {$count += 10}
        {/ignore}

        {set $count = 5}
        <li>Сложение: {set $count = $count + $count} {$count}</li>
        {ignore}
        {set $count = $count + $count} {$count}
        {/ignore}

        {set $count = 5}
        <li>Вычитание: {set $count = $count - $count} {$count}</li>
        {ignore}
        {set $count = $count - $count} {$count}
        {/ignore}
    </ul>
</section>

{* 3. Тернарные и логические операторы *}
<section>
    <h2>✅ Условия и тернарные операторы</h2>
    <p>Статус: {$is_premium ? 'Премиум' : 'Обычный'}</p>
    <p>Возраст: {$age >= 18 ? 'Совершеннолетний' : 'Не достиг возраста'}</p>



    {set $price = 300}
    {if $price > 1000}
    <p>🎉 Условие выполнено</p>
    {elseif $price < 500}
        <p>💸 Дешево</p>
        {else}
        <p>🔧 Средняя цена</p>
        {/if}
</section>

{* 4. Циклы и итерации *}
<section>
    <h2>🔄 Циклы и итерации</h2>

    {foreach $items as $key => $item}
    <div class="item">
        <strong>{$key+1}. {$item}</strong>
    </div>
    {/foreach}

</section>

{* 5. Фильтры (встроенные и кастомные) *}
<section>
    {set $arrForTest = ['a','a','b','c','d','e']}
    {set $arrForTest2 = [4, 3, 2, 1]}
    {set $arrForTest3 = ['h','g']}

    <h2>🔧 Фильтры</h2>
    <ul>
        <li><strong>Регистр:</strong>
            {$name|upper} / {$name|lower} / {$name|capitalize} / {$name|ucfirst} / {$name|ucwords}
        </li>

        {* <li><strong>Дата:</strong> {time()|date:'d F Y в H:i:s'}</li> *}

        <li><strong>Длина:</strong> {$items|length} элементов</li>
        <li><strong>Соединение:</strong> {$arrForTest|join:', '}</li>
        <li><strong>Сортировка:</strong> {$arrForTest2|sort|join:', '}</li>
        <li><strong>Обратный порядок:</strong> {$arrForTest2|reverse}</li>
        <li><strong>Уникальные:</strong> {$arrForTest|unique|join:', '}</li>

        <li><strong>Срез:</strong> {$arrForTest2|slice:0:2}</li>

        <li><strong>Перемешать:</strong> {$arrForTest|shuffle|join:', '} (каждый раз по-новому)</li>

        {* <li><strong>Группировка (по 2):</strong>
            {$debugData.config.features|batch:2}
        </li> не работает! *}

        <li><strong>Объединение массивов:</strong>
            {$arrForTest3|merge:$arrForTest2|join:'; '}
        </li>
        <li><strong>Ключи объекта:</strong> {$arrForTest4|keys|join:', '}</li>
        <li><strong>JSON кодирование:</strong> {$items|json_encode}</li>
        <li><strong>Отладка (var_dump):</strong> {$items|var_dump}</li>
    </ul>
</section>

{* 6. Include *}
{include 'file:chunks/header.tpl' titleTest="Тестовый заголовок - Header" desc="Include"}

<a href="/about">about.html</a>
{/block}
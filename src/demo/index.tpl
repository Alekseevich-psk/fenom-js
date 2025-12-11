{extends 'file:layouts/base.tpl'}

{block "main"}

<div class="block">

    <div class="block__title">Include</div>
    <div class="block__fenom">
        {include 'file:chunks/header.tpl' titleTest='Header block' desc="+ params"}
    </div>

</div>


<div class="block">

    <div class="block__title">Игнор</div>
    <div class="block__fenom">
        {ignore}
        {set $block = 'ignore block'}
        <p>{$block}</p>
        {/ignore}
    </div>

</div>

<br>

<div class="block">

    <div class="block__title">Переменные</div>
    <div class="block__fenom">
        {set $user = 'test'}
        <h1>Привет, {$user}</h1>
    </div>

</div>

<div class="block">

    <div class="block__title">Математические выражения</div>
    <div class="block__fenom">
        {set $count = 1}
        <br>
        {set $count = $count + 1} → 2
        <br>
        {$count++} → 2
        <br>
        {$count} → 3
        <br>
        {$count += 10} → 13
        <br>
        {$count * 2} → 26
        <br>

        {set $count = 1}
        <p>До: {$count++}</p>
        <p>После: {$count}</p>
        <p>+=5: {$count += 5}</p>
        <p>Выражение: {$count + 10}</p>
    </div>

</div>


{* <div class="block">

    <div class="block__title"></div>
    <div class="block__fenom">

    </div>

</div> *}

<a href="/about.html">about.html</a>
{/block}
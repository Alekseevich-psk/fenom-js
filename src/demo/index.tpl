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
        {set $test = 'test'}
        <h1>Привет, {$test}</h1>
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

<div class="block">

    <div class="block__title">Тут коммент fenom</div>
    <div class="block__fenom">
        {* <div class="block">

            <div class="block__title"></div>
            <div class="block__fenom">

            </div>

        </div> *}
    </div>

</div>

<div class="block">

    <div class="block__title">if - else</div>
    <div class="block__fenom">
        {if $price >= 1300}
        {$price}
        {else}
        {$price}
        {/if}

        {if $price <= 1300}
            {$price}
            {/if}

            {if $price <=1300 && $price>=1000}
            {$price}
            {/if}

            {if $price >=1300 && $price<=1000}
                {$price}
                {/if}
                </div>

    </div>

    <div class="block">

        <div class="block__title">Foreach</div>
        <div class="block__fenom">

            {set $arr = ['test 1', 'test 2', 'test 3']}

            {if $arr|length > 2}
            {foreach $arr as $value}
            {$value}
            {/for}
            {/if}

            длина
            {$arr|length}

            <br>
            <ul>
                {foreach $user.friends as $item}
                <li>{$item.name}</li>
                {/foreach}
            </ul>


        </div>


        <a href="/about.html">about.html</a>
        {/block}
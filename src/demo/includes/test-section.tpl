{set $arr = [1, 2, 3, 4]}
{foreach $arr as $index => $value}

{foreach 1..3 as $n}
<p>Просто текст - {$n}</p>
{/foreach}

{if $index == 0}
<div class="text">
    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Minima culpa quisquam autem quam temporibus doloribus
        corrupti, ullam cum doloremque vero dolores saepe iste accusamus, eos officiis sit reiciendis. Dolor, quaerat!
    </p>
</div>
{else}
<p>test else</p>
{/if}

{/foreach}
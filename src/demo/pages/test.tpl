{extends 'file:layouts/base.tpl'}

{block 'main'}


{foreach 1..3 as $n}
<p>Просто текст - {$n}</p>
{/foreach}

{foreach $cat.list as $item}


<div class="wrapper">
    <div class="wrap-view">
        <h3>{$item.pagetitle}</h3><img src="img/picture.png" alt="" />
    </div>

    {if $item.avaible == '1'}
    <p class="catalog__exist">В наличии</p>
    {/if}

    <p class="i-desc">{$item.description}</p>
    <div class="wrap-item">
        <p class="price">{$item.price} </p>
    </div>
    <div class="align"><a class="btn-product" href="#">Подробнее </a></div>
</div>
{/foreach}
{/block}
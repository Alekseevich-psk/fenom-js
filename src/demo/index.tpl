{extends 'file:layouts/base.tpl'}

{block "main"}
{include 'file:chunks/header.tpl'}
{set $user = 'test'}
<h1>Привет, {$user}</h1>
{/block}
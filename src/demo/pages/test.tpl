{foreach $user.friends as $value}
{$value.name}
{/foreach}

{foreach $user.friends[0].list as $value}
{$value.title}
{/foreach}
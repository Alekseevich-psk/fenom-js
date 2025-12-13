function v(e, s) {
  const n = {
    type: "if",
    condition: e[s].condition,
    body: [],
    elseIfs: [],
    elseBody: []
  };
  let t = s + 1, c = 0;
  const l = [], u = [], o = [];
  let i = null, p = !1;
  for (; t < e.length; ) {
    const a = e[t];
    if (a.type === "if" && c++, a.type === "endif") {
      if (c === 0)
        break;
      c--;
    }
    if (c > 0) {
      !i && !p ? l.push(a) : i ? i.tokens.push(a) : p && o.push(a), t++;
      continue;
    }
    if (a.type === "elseif") {
      !i && !p ? (i = {
        condition: a.condition,
        tokens: []
      }, u.push(i)) : i ? i.tokens.push(a) : p && o.push(a), t++;
      continue;
    }
    if (a.type === "else") {
      p = !0, t++;
      continue;
    }
    if (a.type === "endif")
      break;
    !i && !p ? l.push(a) : i ? i.tokens.push(a) : p && o.push(a), t++;
  }
  return n.body = d(l), n.elseIfs = u.map((a) => ({
    condition: a.condition,
    body: d(a.tokens)
  })), n.elseBody = d(o), {
    node: n,
    nextIndex: t + 1
    // пропускаем {/if}
  };
}
function N(e, s) {
  const r = e[s], n = {
    type: "for",
    key: r.key || null,
    item: r.item,
    collection: r.collection,
    reverse: !!r.reverse,
    body: [],
    elseBody: []
  };
  let t = s + 1, c = 0, l = !1;
  for (; t < e.length; ) {
    const u = e[t];
    if (u.type === "for" && c++, u.type === "endfor") {
      if (c > 0) {
        c--, l ? n.elseBody.push(u) : n.body.push(u), t++;
        continue;
      }
      return {
        node: n,
        nextIndex: t + 1
      };
    }
    if (c > 0) {
      l ? n.elseBody.push(u) : n.body.push(u), t++;
      continue;
    }
    if (u.type === "foreachelse") {
      if (c === 0) {
        l = !0, t++;
        continue;
      }
      n.body.push(u), t++;
      continue;
    }
    if (["break", "continue"].includes(u.type)) {
      l ? n.elseBody.push(u) : n.body.push(u), t++;
      continue;
    }
    l ? n.elseBody.push(u) : n.body.push(u), t++;
  }
  throw new Error("Unclosed for loop: expected {/for}");
}
function T(e, s) {
  const n = {
    type: "switch",
    value: e[s].value,
    cases: [],
    defaultBody: []
  };
  let t = s + 1, c = 0, l = null, u = !1;
  for (; t < e.length; ) {
    const o = e[t];
    if (o.type === "switch" && c++, o.type === "endswitch") {
      if (c > 0) {
        c--, l && l.body.push(o), t++;
        continue;
      }
      return {
        node: n,
        nextIndex: t + 1
      };
    }
    if (c > 0) {
      l && l.body.push(o), t++;
      continue;
    }
    if (o.type === "case") {
      l = {
        value: o.value,
        body: []
      }, n.cases.push(l), t++;
      continue;
    }
    if (o.type === "default") {
      if (u)
        throw new Error("Duplicate {default} in switch");
      u = !0, l = null, t++;
      continue;
    }
    l ? l.body.push(o) : u ? n.defaultBody.push(o) : n.cases.length > 0 && n.cases[n.cases.length - 1].body.push(o), t++;
  }
  throw new Error("Unclosed switch: expected {/switch}");
}
function d(e) {
  const s = [];
  let r = 0;
  for (; r < e.length; ) {
    const n = e[r];
    if (n.type === "block_open") {
      const t = n.name;
      r++;
      const c = [];
      let l = 0;
      for (; r < e.length; ) {
        const o = e[r];
        if (o.type === "block_open" && l++, o.type === "block_close") {
          if (l === 0) break;
          l--;
        }
        c.push(o), r++;
      }
      const u = d(c);
      s.push({
        type: "block",
        name: t,
        body: u
      }), r++;
      continue;
    }
    if (n.type === "extends") {
      s.push({ ...n }), r++;
      continue;
    }
    if (n.type === "include") {
      s.push({ ...n }), r++;
      continue;
    }
    if (["set", "var", "add"].includes(n.type)) {
      s.push({ ...n }), r++;
      continue;
    }
    if (n.type === "if") {
      const { node: t, nextIndex: c } = v(e, r);
      s.push(t), r = c;
      continue;
    }
    if (n.type === "for" || n.type === "foreach") {
      const { node: t, nextIndex: c } = N(e, r);
      s.push(t), r = c;
      continue;
    }
    if (n.type === "switch") {
      const { node: t, nextIndex: c } = T(e, r);
      s.push(t), r = c;
      continue;
    }
    if (n.type === "output") {
      const t = n.value.match(/^\{\$(.+)\}$/);
      if (!t) {
        s.push({ type: "text", value: n.value }), r++;
        continue;
      }
      const l = t[1].trim().split("|"), u = l[0], o = l.slice(1);
      s.push({
        type: "output",
        name: `$${u}`,
        filters: o
      }), r++;
      continue;
    }
    s.push({ ...n }), r++;
  }
  return s;
}
const E = (e) => (e = e.replace(/(\$[a-zA-Z_]\w*(?:\.\w+)*)\s*[\?:!]\s*:/g, "$1 ? $1 : "), e.replace(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g, "context.$1")), w = (e) => (e = e.trim(), e === "true" ? "true" : e === "false" ? "false" : e === "null" ? "null" : e === "undefined" ? "undefined" : !isNaN(Number(e)) && !e.includes(" ") ? e : e.startsWith("[") && e.endsWith("]") || e.startsWith("{") && e.endsWith("}") ? e.replace(/\$(\w+)/g, "context.$1") : e.includes("$") ? e.replace(/\$(\w+)/g, "context.$1") : JSON.stringify(e));
function g(e) {
  const s = e.trim();
  if (s.includes("~"))
    return _(s);
  if (/^['"].*['"]$/.test(s) || /^\d+$/.test(s) || s === "true" || s === "false" || s === "null")
    return s;
  if (s.startsWith("$")) {
    const r = s.slice(1).split(".");
    return r.length > 1 ? `(${r.map((n, t) => "context." + r.slice(0, t + 1).join(".")).join(" != null ? ") + " != null ? context." + r.join(".") + ":null".repeat(r.length)})` : `context.${r[0]}`;
  }
  return `(${s})`;
}
function _(e) {
  const s = [];
  let r = "", n = !1, t = 0;
  for (let c of e)
    (c === '"' || c === "'") && t === 0 && (n = !n), c === "(" && !n && t++, c === ")" && !n && t--, c === "~" && !n && t === 0 ? r.trim() && (s.push(r.trim()), r = "") : r += c;
  return r.trim() && s.push(r.trim()), s.length === 0 ? '""' : s.length === 1 ? g(s[0]) : s.map((c) => g(c)).join(" + ");
}
function h(e, s, r) {
  return ((n, ...t) => {
    const c = typeof n, l = Array.isArray(n), u = c === "string", o = n && typeof n == "object" && !l;
    let i = !1;
    return s === "array" && (i = l), s === "string" && (i = u), s === "object" && (i = o), s === "number" && (i = !isNaN(Number(n))), !i && n !== void 0 && n !== null && console.warn(`[Fenom] filter '${e}' expects ${s}, got ${l ? "array" : u ? "string" : o ? "object" : c}`), r(n, ...t);
  });
}
function k(e) {
  return e.replace(/\$(\w+(?:\.\w+)*)(?:\|(\w+)(?::([^:\s}]+))?(?::([^:\s}]+))?)*/g, (s, r, n, t, c) => {
    `${r.replace(/\./g, "][")}`;
    const l = g(`$${r}`);
    if (!n) return l;
    const u = [];
    t && u.push(/^['"]/.test(t) ? t : g("$" + t)), c && u.push(/^['"]/.test(c) ? c : g("$" + c));
    const o = u.join(", ");
    return `filters["${n}"](${l}${o ? ", " + o : ""})`;
  });
}
function j(e) {
  return e.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").replace(/(<!--.*?-->)\s+/g, "$1").trim();
}
const O = [
  // 1. {set $var = {...} или [...]}
  {
    type: "set",
    regex: /^\{set\s+\$(\w+)\s*=\s*(\{[^}]*\}|\[[^}]*\])\}/,
    process(e) {
      const s = e[1], r = e[2];
      return { variable: s, value: r };
    }
  },
  // 2. {set $var = 'string'}
  {
    type: "set",
    regex: /^\{set\s+\$(\w+)\s*=\s*(['"])(.*?)\2\}/,
    process(e) {
      const s = e[1], r = e[3];
      return { variable: s, value: r };
    }
  },
  // 3. {set $var = true / 123 / $other}
  {
    type: "set",
    regex: /^\{set\s+\$(\w+)\s*=\s*([^}\s][^}]*)\}/,
    process: (e) => ({
      variable: e[1],
      value: e[2].trim()
      // может быть: 1, $a + 1, $count * 2
    })
  },
  // add, var — остаются
  {
    type: "add",
    regex: /^\{add\s+\$(\w+)\s*\+\+\}/,
    process(e) {
      return { variable: e[1] };
    }
  },
  {
    type: "var",
    regex: /^\{var\s+\$(\w+)\s*=\s*(['"])(.*?)\2\}/,
    process(e) {
      return { variable: e[1], value: e[3] };
    }
  }
], R = [
  {
    type: "if",
    regex: /^\{if\s+(.+?)\}/,
    process(e) {
      return { condition: e[1].trim() };
    }
  },
  {
    type: "elseif",
    regex: /^\{elseif\s+(.+?)\}/,
    process(e) {
      return { condition: e[1].trim() };
    }
  },
  {
    type: "else",
    regex: /^\{else\}/
  },
  {
    type: "endif",
    regex: /^\{\/if\}/
  }
], B = [
  // Поддержка: {for $arr as $item} и {foreach $arr as $item}
  {
    type: "for",
    regex: /^\{(for|foreach)\s*\$(\w+(?:\.\w+)?)\s+as\s*\$(\w+)(?:\s*\|\s*reverse)?\s*\}/,
    process: (e) => ({
      collection: `$${e[2]}`,
      // ✅ match[2] = 'arr'
      item: e[3],
      // ✅ match[3] = 'value'
      key: null,
      reverse: e[0].includes("| reverse")
    })
  },
  // {for $arr as $key => $item}, {foreach $arr as $key => $item}
  {
    type: "for",
    regex: /^\{(for|foreach)\s*\$(\w+(?:\.\w+)?)\s+as\s*\$(\w+)\s*=>\s*\$(\w+)(?:\s*\|\s*reverse)?\s*\}/,
    process: (e) => ({
      collection: `$${e[2]}`,
      // ✅
      key: e[3],
      item: e[4],
      reverse: e[0].includes("| reverse")
    })
  },
  // {/for}, {/foreach}
  {
    type: "endfor",
    regex: /^\{\/(?:for|foreach)\}/
  },
  {
    type: "break",
    regex: /^\{break\}/i
  },
  {
    type: "continue",
    regex: /^\{continue\}/i
  }
], I = [
  {
    type: "switch",
    regex: /^\{switch\s+(.+?)\}/,
    process(e) {
      return { value: e[1].trim() };
    }
  },
  {
    type: "case",
    regex: /^\{case\s+(.+?)\}/,
    process(e) {
      return { value: e[1].trim() };
    }
  },
  {
    type: "default",
    regex: /^\{default\}/
  },
  {
    type: "endswitch",
    regex: /^\{\/switch\}/
  }
], C = [
  {
    type: "cycle",
    regex: /^\{cycle\s+(.+?)\}/,
    process(e) {
      return { values: e[1] };
    }
  }
], P = [
  {
    type: "include",
    // Поддерживает: {include 'file:...' key="value" key='value' key=$var key=word}
    regex: /^\{include\s+['"]file:([^'"]+)['"](?:\s+((?:\s*\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s}]+))+))?\s*\}/,
    process: (e) => {
      const s = e[1], r = e[2], n = {};
      if (r) {
        const t = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
        let c;
        for (; (c = t.exec(r)) !== null; ) {
          const l = c[1], u = c[2] || c[3] || c[4] || "";
          n[l] = u;
        }
      }
      return { file: s, params: n };
    }
  }
], F = [
  // {extends 'file:...'}
  {
    type: "extends",
    regex: /^\{extends\s+['"]file:([^'"]+)['"]\s*\}/,
    process: (e) => ({ file: e[1] })
  },
  // {block "name"} → открывается
  {
    type: "block_open",
    regex: /^\{block\s+(['"])(.*?)\1\s*\}/,
    process(e) {
      return { name: e[2] };
    }
  },
  // {/block} → закрывается
  {
    type: "block_close",
    regex: /^\{\/block\}/
  },
  // {parent} — вставляет родительский контент блока
  {
    type: "parent",
    regex: /^\{parent\}/
  },
  // {paste "blockName"} — вставка другого блока (Fenom-фича)
  {
    type: "paste",
    regex: /^\{paste\s+(['"])(.*?)\1\}/,
    process(e) {
      return { name: e[2] };
    }
  },
  // {use 'file:...'} — импорт макросов
  {
    type: "use",
    regex: /^\{use\s+(['"])(.*?)\1\}/,
    process(e) {
      return { file: e[2] };
    }
  }
], L = [
  {
    type: "filter",
    regex: /^\{filter\s+(.+?)\}/,
    process(e) {
      return { filter: e[1].trim() };
    }
  },
  {
    type: "endfilter",
    regex: /^\{\/filter\}/
  },
  {
    type: "raw",
    regex: /^\{raw\}/
  },
  {
    type: "endraw",
    regex: /^\{\/raw\}/
  },
  {
    type: "autoescape",
    regex: /^\{autoescape\}/
  },
  {
    type: "endautoescape",
    regex: /^\{\/autoescape\}/
  }
], U = [
  {
    type: "macro",
    regex: /^\{macro\s+(\w+)(?:\s*\((.*?)\))?\}/,
    process(e) {
      const s = e[2] ? e[2].split(",").map((r) => r.trim()) : [];
      return { name: e[1], args: s };
    }
  },
  {
    type: "endmacro",
    regex: /^\{\/macro\}/
  },
  {
    type: "import",
    regex: /^\{import\s+(['"])(.*?)\1\s+as\s+(\w+)\}/,
    process(e) {
      return { file: e[2], alias: e[3] };
    }
  }
], W = [
  {
    type: "ignore_block",
    regex: /^\{ignore\}([\s\S]*?)\{\/ignore\}/,
    process: (e) => ({
      content: e[1]
      // содержимое между {ignore} и {/ignore}
    })
  }
], J = [
  {
    type: "unset",
    regex: /^\{unset\s+\$(\w+)\}/,
    process(e) {
      return { variable: e[1] };
    }
  },
  {
    type: "comment",
    regex: /^\{\*\s*([\s\S]*?)\s*\*\}/
    // не нужно process — мы просто пропустим этот блок
  }
], M = [
  // 1. {output name="title"}
  {
    type: "output",
    regex: /^\{output\s+name\s*=\s*(['"])(.*?)\1\s*\}/,
    process: (e) => ({
      name: e[2],
      filters: []
    })
  },
  // 2. {output "$title"} или {output $title}
  {
    type: "output",
    regex: /^\{output\s+(['"])(.*?)\1\s*\}/,
    process: (e) => ({
      name: e[2],
      filters: []
    })
  },
  {
    type: "output",
    regex: /^\{output\s+([^\s}]+)\s*\}/,
    process: (e) => ({
      name: e[1],
      filters: []
    })
  },
  // 3. Выражения: {output $user.age + 18}
  {
    type: "output",
    regex: /^\{output\s+(\$?[^}]+)\}/,
    process: (e) => ({
      name: e[1].trim(),
      filters: []
    })
  },
  // 🔥 4. ОСНОВНОЙ случай: {$var}, {$var|filter}, {$var|filter:"arg"}
  {
    type: "output",
    regex: /^\{\$(.+?)\}/,
    // ← нежадный — ловит всё внутри
    process: (e) => {
      const r = e[1].trim().split("|").map((c) => c.trim()), n = r[0], t = r.slice(1);
      return {
        name: `$${n}`,
        // → '$arr'
        filters: t
        // → ['length']
      };
    }
  },
  // Любое выражение в { ... }, даже без $
  {
    type: "output",
    regex: /^\{([^$].+?)\}/,
    process: (e) => ({
      name: e[1].trim(),
      // → '"Привет" ~ " " ~ "мир"'
      filters: []
    })
  }
], D = [
  {
    type: "operator",
    regex: /^\{\$(\w+)\s*(\+\+|--|\+=|-=|\*=|\/=|\%=)\s*([^}]+)?\}/,
    process: (e) => {
      const s = e[1], r = e[2], n = e[3]?.trim() || "1";
      return { variable: s, operator: r, value: n };
    }
  }
], V = [
  ...F,
  ...P,
  ...B,
  ...I,
  ...D,
  ...R,
  ...W,
  ...O,
  ...J,
  ...M,
  ...C,
  ...L,
  ...U
];
function x(e) {
  const s = [];
  let r = 0;
  for (; r < e.length; ) {
    let n = !1;
    if (e.slice(r).startsWith("{ignore}")) {
      let t = 1, c = r + 8;
      for (; c < e.length; )
        if (e.slice(c).startsWith("{ignore}"))
          t++, c += 8;
        else if (e.slice(c).startsWith("{/ignore}")) {
          if (t--, c += 9, t === 0) {
            const l = e.slice(r + 8, c - 9);
            s.push({ type: "text", value: l }), r = c, n = !0;
            break;
          }
        } else
          c++;
      n || (s.push({ type: "text", value: "{ignore}" }), r += 8);
      continue;
    }
    if (e[r] !== "{") {
      const t = e.indexOf("{", r);
      if (t === -1) {
        s.push({ type: "text", value: e.slice(r) });
        break;
      } else
        t > r && s.push({ type: "text", value: e.slice(r, t) }), r = t;
    }
    for (const t of V) {
      const l = e.slice(r).match(t.regex);
      if (l) {
        const u = {
          type: t.type,
          value: l[0]
          // ← добавляем оригинальный текст токена
        };
        if (t.type === "comment") {
          r += l[0].length, n = !0;
          break;
        }
        t.process && Object.assign(u, t.process(l)), s.push(u), r += l[0].length, n = !0;
        break;
      }
    }
    if (!n) {
      const t = e.slice(r, r + 30).replace(/\n/g, "↵");
      console.warn(`Skip unknown tag at ${r}: "${t}"`), r++;
    }
  }
  return s;
}
function z(e, s) {
  const r = {};
  let n = null;
  const t = [];
  for (const o of e) {
    if (o.type === "extends") {
      n = o.file;
      continue;
    }
    o.type === "block" && (r[o.name] = o.body);
  }
  const c = e.filter(
    (o) => o.type !== "extends" && o.type !== "block_open" && o.type !== "block_close"
  );
  function l(o) {
    if (!["extends", "block_open", "block_close"].includes(o.type) && !["endfor"].includes(o.type))
      switch (o.type) {
        case "operator": {
          const { variable: i, operator: p, value: a } = o, f = (y) => y.startsWith("$") ? `context.${y.slice(1)}` : isNaN(+y) ? `'${y}'` : +y;
          switch (p) {
            case "++":
              t.push(`context.${i} = (context.${i} || 0) + 1;`), t.push(`out += context.${i} - 1;`);
              break;
            case "--":
              t.push(`context.${i} = (context.${i} || 0) - 1;`), t.push(`out += context.${i} + 1;`);
              break;
            case "+=":
              t.push(`context.${i} = (context.${i} || 0) + ${f(a)};`), t.push(`out += context.${i};`);
              break;
            case "-=":
              t.push(`context.${i} = (context.${i} || 0) - ${f(a)};`), t.push(`out += context.${i};`);
              break;
            case "*=":
              t.push(`context.${i} = (context.${i} || 0) * ${f(a)};`), t.push(`out += context.${i};`);
              break;
            case "/=":
              t.push(`context.${i} = (context.${i} || 0) / ${f(a)};`), t.push(`out += context.${i};`);
              break;
            case "%=":
              t.push(`context.${i} = (context.${i} || 0) % ${f(a)};`), t.push(`out += context.${i};`);
              break;
          }
          break;
        }
        case "ignore_block":
          t.push(`out += ${JSON.stringify(o.content)};`);
          break;
        case "include": {
          try {
            const i = s(o.file), p = x(i), a = d(p);
            if (o.params)
              for (const [f, y] of Object.entries(o.params))
                if (typeof y == "string")
                  if (y.startsWith("$")) {
                    const b = y.slice(1);
                    t.push(`context.${f} = context.${b};`);
                  } else
                    t.push(`context.${f} = ${JSON.stringify(y)};`);
                else
                  t.push(`context.${f} = ${JSON.stringify(y)};`);
            a.forEach(l);
          } catch {
            t.push(`out += '[Include error: ${o.file}]';`);
          }
          break;
        }
        case "text":
          t.push(`out += ${JSON.stringify(o.value)};`);
          break;
        case "output": {
          const i = g(o.name);
          let p = i;
          for (const a of o.filters) {
            const f = a.split(":").map(($) => $.trim()), y = f[0], b = f.slice(1).map(($) => {
              if (/^['"].*['"]$/.test($))
                return $;
              const S = $.startsWith("$") ? $ : "$" + $;
              return g(S);
            }), A = b.length > 0 ? ", " + b.join(", ") : "";
            p = `filters["${y}"](${p}${A})`;
          }
          if (o.filters.length === 0) {
            const a = `(typeof ${i} === 'object' || ${i} === null ? '' : ${i})`;
            t.push(`out += ${a};`);
          } else
            t.push(`out += ${p};`);
          break;
        }
        case "set":
          t.push(`context.${o.variable} = ${w(o.value)};`);
          break;
        case "var":
          t.push(`if (context.${o.variable} === undefined) context.${o.variable} = ${w(o.value)};`);
          break;
        case "add":
          t.push(`context.${o.variable} = (context.${o.variable} || 0) + 1;`);
          break;
        case "if": {
          const i = k(o.condition);
          t.push(`if (${i}) {`), o.body.forEach(l), t.push("}"), o.elseIfs.forEach((p) => {
            const a = k(p.condition);
            t.push(`else if (${a}) {`), p.body.forEach(l), t.push("}");
          }), o.elseBody.length > 0 && (t.push("else {"), o.elseBody.forEach(l), t.push("}"));
          break;
        }
        case "for": {
          const i = g(o.collection), p = `context.${o.item}`, a = o.key ? `context.${o.key}` : null, f = `i_${o.item}`;
          t.push(`if (${i} && Array.isArray(${i}) && ${i}.length > 0) {`), o.reverse ? t.push(`for (let ${f} = ${i}.length - 1; ${f} >= 0; ${f}--) {`) : t.push(`for (let ${f} = 0; ${f} < ${i}.length; ${f}++) {`), a && t.push(`${a} = ${f};`), t.push(`${p} = ${i}[${f}];`), o.body.forEach(l), t.push("}"), t.push("}"), o.elseBody && o.elseBody.length > 0 && (t.push("else {"), o.elseBody.forEach(l), t.push("}"));
          break;
        }
        case "switch":
          t.push(`switch (${E(o.value)}) {`), o.cases.forEach((i) => {
            t.push(`case ${i.value}: {`), i.body.forEach(l), t.push("break; }");
          }), o.defaultBody && o.defaultBody.length > 0 && (t.push("default: {"), o.defaultBody.forEach(l), t.push("break; }")), t.push("}");
          break;
        case "block": {
          const i = r[o.name] || o.body;
          Array.isArray(i) ? i.forEach(l) : console.warn(`Block "${o.name}" has no body and no override`);
          break;
        }
        default:
          console.warn(`Unknown node type: ${o.type}`);
      }
  }
  if (n && e.some((o, i) => o.type === "extends" && i !== 0) && console.warn("{extends} должен быть первым тегом в шаблоне"), n) {
    const o = s(n), i = x(o);
    d(i).forEach(l);
  } else
    c.forEach(l);
  const u = `
        let out = '';
        ${t.join(`
`)}
        return out;
    `;
  return new Function("context", "filters", u);
}
const m = {
  // ——— Строковые фильтры ————————————————————————
  /**
   * Преобразует строку в верхний регистр
   */
  upper: (e) => String(e).toUpperCase(),
  /**
   * Преобразует строку в нижний регистр
   */
  lower: (e) => String(e).toLowerCase(),
  /**
   * Делает первую букву строки заглавной, остальные — строчными
   * 'аННА' → 'Анна'
   */
  capitalize: (e) => {
    const s = String(e).trim();
    return s.length === 0 ? "" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  },
  /**
   * Аналог capitalize (для совместимости)
   */
  ucfirst: (e) => m.capitalize(e),
  /**
   * Делает первую букву каждого слова заглавной
   * 'hello world' → 'Hello World'
   */
  ucwords: (e) => String(e).trim().replace(/\b\w/g, (r) => r.toUpperCase()),
  /**
   * Делает первую букву строки строчной
   * 'Hello' → 'hello'
   */
  lcfirst: (e) => {
    const s = String(e).trim();
    return s.length === 0 ? "" : s.charAt(0).toLowerCase() + s.slice(1);
  },
  /**
   * Удаляет пробелы с краёв строки
   */
  trim: (e) => String(e).trim(),
  /**
   * Удаляет пробелы слева
   */
  ltrim: (e) => String(e).replace(/^\s+/, ""),
  /**
   * Удаляет пробелы справа
   */
  rtrim: (e) => String(e).replace(/\s+$/, ""),
  /**
   * Преобразует \n → <br>
   */
  nl2br: (e) => String(e).replace(/\n/g, "<br>"),
  /**
   * Заменяет подстроку
   * {$str|replace:'old':'new'}
   */
  replace: (e, s, r) => String(e).split(String(s)).join(String(r)),
  /**
   * Обрезает строку
   * {$str|substr:0:5}
   */
  substr: h("substr", "string", (e, s, r) => {
    const n = String(e);
    return r === void 0 ? n.slice(s) : n.slice(s, s + r);
  }),
  /**
   * Кодирует строку в URL
   */
  urlencode: (e) => encodeURIComponent(String(e)),
  /**
   * Декодирует URL
   */
  urldecode: (e) => decodeURIComponent(String(e)),
  /**
   * Экранирует HTML-символы
   */
  escape: h("escape", "string", (e) => String(e).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")),
  /**
   * Синоним escape
   */
  e: (e) => m.escape(e),
  // ——— Работа с массивами ——————————————————————
  /**
   * Первый элемент массива/объекта
   */
  first: h("first", "array", (e) => Array.isArray(e) ? e[0] : e && typeof e == "object" ? Object.values(e)[0] : ""),
  /**
   * Последний элемент массива/объекта
   */
  last: h("last", "array", (e) => {
    if (Array.isArray(e)) return e[e.length - 1];
    if (e && typeof e == "object") {
      const s = Object.values(e);
      return s[s.length - 1];
    }
    return "";
  }),
  /**
   * Объединяет массив в строку
   * {$arr|join:', '}
   */
  join: h("join", "array", (e, s = ",") => Array.isArray(e) ? e.join(s) : e && typeof e == "object" ? Object.values(e).join(s) : String(e)),
  /**
   * Переворачивает массив или строку
   */
  reverse: h("reverse", "array", (e) => Array.isArray(e) ? [...e].reverse() : typeof e == "string" ? e.split("").reverse().join("") : e),
  /**
   * Сортирует массив по значениям
   */
  sort: h("sort", "array", (e) => Array.isArray(e) ? [...e].sort() : e),
  /**
   * Сортирует массив по ключам
   */
  ksort: h("ksort", "object", (e) => {
    if (e && typeof e == "object") {
      const s = {};
      return Object.keys(e).sort().forEach((r) => {
        s[r] = e[r];
      }), s;
    }
    return e;
  }),
  /**
   * Возвращает только уникальные значения
   */
  unique: h("unique", "array", (e) => Array.isArray(e) ? [...new Set(e)] : e),
  /**
   * Перемешивает массив
   */
  shuffle: h("shuffle", "array", (e) => {
    if (!Array.isArray(e)) return e;
    const s = [...e];
    for (let r = s.length - 1; r > 0; r--) {
      const n = Math.floor(Math.random() * (r + 1));
      [s[r], s[n]] = [s[n], s[r]];
    }
    return s;
  }),
  /**
   * Возвращает срез массива/строки
   * {$arr|slice:0:2}
   */
  slice: (e, s, r) => Array.isArray(e) || typeof e == "string" ? r === void 0 ? e.slice(s) : e.slice(s, s + r) : e,
  /**
   * Объединяет два массива
   * {$arr1|merge:$arr2}
   */
  merge: (e, s) => Array.isArray(e) && Array.isArray(s) ? [...e, ...s] : e,
  /**
   * Разбивает массив на группы
   * {$items|batch:3}
   */
  batch: (e, s) => {
    if (!Array.isArray(e)) return e;
    const r = [];
    for (let n = 0; n < e.length; n += s)
      r.push(e.slice(n, n + s));
    return r;
  },
  /**
   * Возвращает ключи массива/объекта
   */
  keys: (e) => e && typeof e == "object" ? Object.keys(e) : [],
  /**
   * Возвращает значения массива/объекта
   */
  values: (e) => e && typeof e == "object" ? Object.values(e) : [],
  /**
   * Длина строки или количество элементов
   */
  length: (e) => Array.isArray(e) ? e.length : e && typeof e == "object" ? Object.keys(e).length : String(e).length,
  // ——— Форматирование и числа ——————————————————
  /**
   * Форматирует число
   * {$price|number_format:2:'.':','}
   */
  number_format: (e, s = 0, r = ".", n = ",") => {
    const t = Number(e);
    return isNaN(t) ? "" : t.toLocaleString("en-US", {
      minimumFractionDigits: s,
      maximumFractionDigits: s,
      useGrouping: !0
    }).replace(/,/g, n).replace(/\./g, r);
  },
  /**
   * Абсолютное значение
   */
  abs: (e) => Math.abs(Number(e) || 0),
  /**
   * Округляет число
   */
  round: (e, s = 0) => {
    const r = 10 ** s;
    return Math.round((Number(e) || 0) * r) / r;
  },
  // ——— JSON ————————————————————————————————
  /**
   * Кодирует в JSON
   */
  json_encode: (e) => JSON.stringify(e),
  /**
   * Декодирует из JSON
   */
  json_decode: (e) => {
    try {
      return JSON.parse(String(e));
    } catch {
      return null;
    }
  },
  // ——— Дата ————————————————————————————————
  /**
   * Форматирует timestamp
   * Формат: d.m.Y H:i:s
   */
  date: (e, s = "d.m.Y") => {
    const r = Number(e), n = new Date(isNaN(r) ? e : r * 1e3);
    if (isNaN(n.getTime()))
      return console.warn(`[Fenom] filter 'date' received invalid timestamp: ${e}`), "";
    const t = (c) => c.toString().padStart(2, "0");
    return s.replace(/d/g, t(n.getDate())).replace(/m/g, t(n.getMonth() + 1)).replace(/Y/g, n.getFullYear().toString()).replace(/H/g, t(n.getHours())).replace(/i/g, t(n.getMinutes())).replace(/s/g, t(n.getSeconds()));
  },
  // ——— Прочее ——————————————————————————————
  /**
   * Возвращает значение по умолчанию, если пусто
   */
  default: (e, s) => e == null || e === "" || typeof e == "object" && Object.keys(e).length === 0 ? s : e,
  /**
   * Вывод без изменений
   */
  raw: (e) => e,
  /**
   * Отладка: вывод структуры
   */
  var_dump: (e) => `<pre>${JSON.stringify(e, null, 2)}</pre>`,
  /**
   * Отладка: красивый вывод
   */
  print_r: (e) => `<pre>${e instanceof Object ? JSON.stringify(e, null, 2) : String(e)}</pre>`
};
function H(e, s, r) {
  const { root: n, loader: t, minify: c } = r || {}, l = t || (() => n);
  try {
    const u = x(e), o = d(u), p = z(o, l)(s, m);
    return c ? j(p) : p;
  } catch (u) {
    return console.error("Template error:", u), `<span style="color:red">[Ошибка шаблона: ${u.message}]</span>`;
  }
}
export {
  H as FenomJs
};

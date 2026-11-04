# Traduções

Cada arquivo (`en.js`, `pt-BR.js`, `es.js`) exporta um objeto com **todas** as mensagens do idioma. As chaves são as mesmas em todos os arquivos; apenas os valores mudam. O inglês é o idioma de referência e o fallback para uma chave ausente.

## Alterar ou adicionar um texto

1. Escolha uma chave estável por finalidade, como `save.available` ou `inspection.enemyStats`. Não use a frase em inglês como chave.
2. Adicione a chave a todos os arquivos de idioma. Preserve os mesmos parâmetros entre idiomas.
3. Use a chave no componente:

```js
import { t } from './i18n.js';

label.textContent = t('realm.turn', { turn: '012' });
// en: "TURN {turn}"
// pt-BR: "TURNO {turn}"
```

No HTML estático, marque um elemento que contenha somente o texto a traduzir:

```html
<button data-i18n="nav.theRealm"></button>
<input data-i18n-placeholder="atlas.searchASkillSchoolOrEffect">
<button data-i18n-aria-label="common.close"></button>
<button data-i18n-tooltip="nav.returnToTheRealmT"></button>
```

`translatePage()` aplica apenas as chaves declaradas, sem procurar palavras ou substituir trechos da página. Os componentes dinâmicos são renderizados novamente no evento `localechange`. Use `textContent` para texto; ao inserir uma tradução em `innerHTML`, escape o resultado, como faz o helper `h()` de `src/app.js`.

## Adicionar um idioma

1. Copie `en.js` para um arquivo com a identificação do idioma, por exemplo `fr.js`.
2. Traduza os valores, mantendo as chaves e os parâmetros `{nome}`. Cada mensagem pode reorganizar seus parâmetros livremente.
3. Importe o arquivo em `src/i18n.js` e adicione uma entrada ao `registry`, com `label` e `messages`. O menu será atualizado a partir desse registro.
4. Execute `npm test` e `npm run build`.

Os testes verificam a igualdade das chaves e parâmetros entre os idiomas, além das referências do HTML e dos catálogos.

## Catálogos e histórico

As famílias `schools`, `paths`, `spells`, `components`, `equipment` e `artifacts` contêm os textos do jogo. `src/game-text.js` monta as descrições do atlas com mensagens parametrizadas, evitando repetir as 2.304 descrições em cada idioma. `src/text-keys.js` relaciona os identificadores existentes dos catálogos às chaves; traduções não alteram identificadores de partidas salvas.

Eventos do histórico são salvos como `{ key, params, tone, turn }`. Um parâmetro que referencia outro texto usa `{ key, params }`, por exemplo:

```js
{
  key: 'log.cast.other',
  params: { spell: { key: 'spells.0-0.name' }, count: 3 }
}
```

Assim, eventos antigos da partida também acompanham o idioma selecionado. `src/log-migration.js` converte os eventos das versões que salvavam frases em inglês; ele não traduz componentes da interface.

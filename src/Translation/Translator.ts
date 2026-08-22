const GEMINI_API_KEY = "0";

const TRANSLATION_CACHE_KEY =
  "bitburner-ptbr-translations";

type TranslationCache = Record<string, string>;

function loadCache(): TranslationCache {
  try {
    const saved =
      localStorage.getItem(
        TRANSLATION_CACHE_KEY,
      );

    if (!saved) return {};

    return JSON.parse(
      saved,
    ) as TranslationCache;
  } catch {
    return {};
  }
}

function saveCache(
  cache: TranslationCache,
): void {
  localStorage.setItem(
    TRANSLATION_CACHE_KEY,
    JSON.stringify(cache),
  );
}

const translationCache =
  loadCache();

/*
 * ============================================================
 * CACHE
 * ============================================================
 */

function applyCachedTranslation(
  element: HTMLElement,
): boolean {
  const originalHtml =
    element.outerHTML;

  const translatedHtml =
    translationCache[originalHtml];

  if (!translatedHtml) {
    return false;
  }

  const container =
    document.createElement("div");

  container.innerHTML =
    translatedHtml;

  const translatedElement =
    container.firstElementChild;

  if (!translatedElement) {
    return false;
  }

  /*
   * Mantém o elemento original.
   *
   * Isso é importante porque substituir
   * element.outerHTML poderia remover
   * referências usadas pelo React.
   */
  element.innerHTML =
    translatedElement.innerHTML;

  console.log(
    "[PT-BR] Tradução aplicada do cache:",
    element.tagName,
  );

  return true;
}

/*
 * ============================================================
 * OBSERVER DO CACHE
 *
 * Tudo que aparecer na tela:
 *
 * Se estiver no cache -> traduz automaticamente.
 * Se NÃO estiver -> não faz nada.
 * ============================================================
 */

function startCacheObserver(): void {
  const observer =
    new MutationObserver(
      (mutations) => {
        for (
          const mutation
          of mutations
        ) {
          for (
            const node
            of mutation.addedNodes
          ) {
            if (
              node.nodeType !==
              Node.ELEMENT_NODE
            ) {
              continue;
            }

            const addedElement =
              node as HTMLElement;

            /*
             * Primeiro tenta o próprio
             * elemento adicionado.
             */
            applyCachedTranslation(
              addedElement,
            );

            /*
             * Depois verifica todos os
             * elementos dentro dele.
             */
            const elements =
              addedElement.querySelectorAll(
                "*",
              );

            for (
              const element
              of elements
            ) {
              applyCachedTranslation(
                element as HTMLElement,
              );
            }
          }
        }
      },
    );

  observer.observe(
    document.body,
    {
      childList: true,
      subtree: true,
    },
  );

  /*
   * Também verifica tudo que já existe
   * quando o tradutor é iniciado.
   */
  for (
    const element
    of document.querySelectorAll(
      "*",
    )
  ) {
    applyCachedTranslation(
      element as HTMLElement,
    );
  }

  console.log(
    "[PT-BR] Observer do cache iniciado.",
  );
}

/*
 * ============================================================
 * GEMINI
 * ============================================================
 */

async function translateHtml(
  html: string,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY não configurada.",
    );
  }

  const prompt = `
Você está ajudando a traduzir o jogo Bitburner para português brasileiro.

Receberá um trecho de HTML.

REGRAS:

1. Preserve EXATAMENTE todas as tags HTML.
2. Preserve todos os atributos, classes e estrutura.
3. Traduza SOMENTE os textos visíveis entre as tags.
4. Não traduza código, nomes de arquivos, comandos, variáveis ou termos técnicos que precisam permanecer em inglês.
5. Preserve quebras de linha como <br>.
6. Não adicione explicações.
7. Não coloque o resultado dentro de blocos de código.
8. Retorne SOMENTE o HTML traduzido.

HTML:

${html}
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        "x-goog-api-key":
          GEMINI_API_KEY,
      },

      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],

        generationConfig: {
          temperature: 0.1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Gemini HTTP ${response.status}: ${errorText}`,
    );
  }

  const data: unknown =
    await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("candidates" in data)
  ) {
    throw new Error(
      "Resposta inválida do Gemini.",
    );
  }

  const candidates = (
    data as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    }
  ).candidates;

  const result =
    candidates?.[0]?.content
      ?.parts?.[0]?.text;

  if (!result) {
    throw new Error(
      "Gemini não retornou uma tradução.",
    );
  }

  return result
    .trim()
    .replace(
      /^```html\s*/i,
      "",
    )
    .replace(
      /^```\s*/i,
      "",
    )
    .replace(
      /```\s*$/i,
      "",
    )
    .trim();
}

/*
 * ============================================================
 * TRADUTOR MANUAL
 *
 * Botão direito:
 *
 * Seleciona texto
 *       ↓
 * Abre opção "Traduzir para PT-BR"
 *       ↓
 * Cache?
 *   SIM       NÃO
 *    ↓         ↓
 * Aplica     Gemini
 *              ↓
 *           Salva
 * ============================================================
 */

export function startTranslator(): void {
  /*
   * Inicia o sistema automático.
   *
   * IMPORTANTE:
   *
   * Apenas traduções que já existem
   * no cache serão aplicadas.
   *
   * Nada é enviado automaticamente
   * para o Gemini.
   */
  startCacheObserver();

  document.addEventListener(
    "contextmenu",
    (event) => {
      const selection =
        window.getSelection();

      const text =
        selection?.toString().trim();

      if (!selection || !text) {
        return;
      }

      event.preventDefault();

      const range =
        selection.getRangeAt(0);

      const ancestor =
        range.commonAncestorContainer;

      const element =
        ancestor.nodeType ===
        Node.ELEMENT_NODE
          ? (
              ancestor as HTMLElement
            )
          : ancestor.parentElement;

      if (!element) {
        return;
      }

      const menu =
        document.createElement("div");

      menu.textContent =
        "Traduzir para PT-BR";

      menu.style.position =
        "fixed";

      menu.style.left =
        `${event.clientX}px`;

      menu.style.top =
        `${event.clientY}px`;

      menu.style.padding =
        "8px 12px";

      menu.style.background =
        "#222";

      menu.style.color =
        "#fff";

      menu.style.border =
        "1px solid #666";

      menu.style.borderRadius =
        "4px";

      menu.style.cursor =
        "pointer";

      menu.style.zIndex =
        "999999";

      menu.addEventListener(
        "click",
        (menuEvent) => {
          /*
           * Impede o clique de fechar
           * o próprio menu imediatamente.
           */
          menuEvent.stopPropagation();

          const html =
            element.outerHTML;

          /*
           * Primeiro tenta o cache.
           */
          if (
            applyCachedTranslation(
              element,
            )
          ) {
            console.log(
              "[PT-BR] Tradução carregada do cache.",
            );

            menu.textContent =
              "Traduzido do cache!";

            setTimeout(() => {
              menu.remove();
            }, 1000);

            return;
          }

          /*
           * Não está no cache.
           *
           * Então envia manualmente
           * para o Gemini.
           */
          console.log(
            "[PT-BR] HTML enviado para Gemini:",
            html,
          );

          menu.textContent =
            "Traduzindo...";

          translateHtml(html)
            .then(
              (
                translatedHtml,
              ) => {
                console.log(
                  "[PT-BR] HTML traduzido:",
                  translatedHtml,
                );

                const translatedContainer =
                  document.createElement(
                    "div",
                  );

                translatedContainer.innerHTML =
                  translatedHtml;

                const translatedElement =
                  translatedContainer.firstElementChild;

                if (
                  translatedElement
                ) {
                  /*
                   * Aplica somente
                   * o conteúdo interno.
                   */
                  element.innerHTML =
                    translatedElement.innerHTML;

                  /*
                   * Salva:
                   *
                   * HTML original
                   *       ↓
                   * HTML traduzido
                   */
                  translationCache[
                    html
                  ] =
                    translatedHtml;

                  saveCache(
                    translationCache,
                  );

                  console.log(
                    "[PT-BR] Tradução salva no cache.",
                  );
                }

                menu.textContent =
                  "Traduzido!";

                setTimeout(() => {
                  menu.remove();
                }, 1000);
              },
            )
            .catch(
              (
                error: unknown,
              ) => {
                console.error(
                  "[PT-BR] Erro ao traduzir:",
                  error,
                );

                menu.textContent =
                  "Erro ao traduzir";

                setTimeout(() => {
                  menu.remove();
                }, 2000);
              },
            );
        },
      );

      document.body.appendChild(
        menu,
      );

      const closeMenu =
        (): void => {
          menu.remove();

          document.removeEventListener(
            "click",
            closeMenu,
          );
        };

      setTimeout(() => {
        document.addEventListener(
          "click",
          closeMenu,
        );
      }, 0);
    },
  );

  console.log(
    "[PT-BR] Sistema de tradução iniciado.",
  );
}
const GEMINI_API_KEY = "SUA_CHAVE_REAL_AQUI";

async function translateHtml(html: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  const prompt = `
Você está ajudando a traduzir o jogo Bitburner para português brasileiro.

Receberá um trecho de HTML.

REGRAS:

1. Preserve EXATAMENTE todas as tags HTML.
2. Preserve atributos, classes e estrutura.
3. Traduza SOMENTE os textos visíveis entre as tags.
4. Não traduza código, nomes de arquivos, comandos ou variáveis.
5. Não adicione explicações.
6. Retorne SOMENTE o HTML traduzido.

HTML:

${html}
`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",    
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
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
    const errorText = await response.text();

    throw new Error(
      `Gemini HTTP ${response.status}: ${errorText}`,
    );
  }

  const data: unknown = await response.json();

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
    candidates?.[0]?.content?.parts?.[0]?.text;

  if (!result) {
    throw new Error(
      "Gemini não retornou uma tradução.",
    );
  }

  return result
    .trim()
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export function startTranslator(): void {
  document.addEventListener(
    "contextmenu",
    (event) => {
      const selection =
        window.getSelection();

      const text =
        selection?.toString().trim();

      if (!selection || !text) return;

      event.preventDefault();

      const range =
        selection.getRangeAt(0);

      const container =
        range.commonAncestorContainer;

      const element =
        container.nodeType ===
        Node.ELEMENT_NODE
          ? container as HTMLElement
          : container.parentElement;

      if (!element) return;

      const menu =
        document.createElement("div");

      menu.textContent =
        "Traduzir para PT-BR";

      menu.style.position = "fixed";
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
        () => {
          const html =
            element.outerHTML;

          console.log(
            "[PT-BR] HTML enviado para Gemini:",
            html,
          );

          menu.textContent =
            "Traduzindo...";

          translateHtml(html)
            .then((translatedHtml) => {
              console.log(
                "[PT-BR] HTML traduzido:",
                translatedHtml,
              );

              menu.textContent =
                "Traduzido!";

              setTimeout(() => {
                menu.remove();
              }, 1000);
            })
            .catch((error: unknown) => {
              console.error(
                "[PT-BR] Erro ao traduzir:",
                error,
              );

              menu.textContent =
                "Erro ao traduzir";

              setTimeout(() => {
                menu.remove();
              }, 2000);
            });
        },
      );

      document.body.appendChild(menu);

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
    "[PT-BR] Sistema de tradução iniciado",
  );
}
export function startTranslator(): void {
  document.addEventListener("contextmenu", (event) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!selection || !text || selection.rangeCount === 0) return;

    event.preventDefault();

    const range = selection.getRangeAt(0);

    const menu = document.createElement("div");

    menu.textContent = "Traduzir para PT-BR";

    menu.style.position = "fixed";
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.style.padding = "8px 12px";
    menu.style.background = "#222";
    menu.style.color = "#fff";
    menu.style.border = "1px solid #666";
    menu.style.borderRadius = "4px";
    menu.style.cursor = "pointer";
    menu.style.zIndex = "999999";

    menu.addEventListener("click", () => {
      console.log("[PT-BR] Texto original:", text);

      const translatedText =
        `[TRADUZIDO] ${text}`;

      range.deleteContents();

      const translatedNode =
        document.createTextNode(translatedText);

      range.insertNode(translatedNode);

      selection.removeAllRanges();

      menu.remove();
    });

    document.body.appendChild(menu);

    const closeMenu = (): void => {
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
  });

  console.log("[PT-BR] Sistema de tradução iniciado");
}
window.addEventListener("load", () => {
    const splash = document.querySelector(".splash");
    const content = document.querySelector(".content");

    setTimeout(() => {
      splash.classList.add("hidden");
      content.classList.add("visible");
    }, 3000); // 3 segundos
  });
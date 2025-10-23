window.addEventListener("load", () => {
    const splash = document.querySelector(".splash");
    const content = document.querySelector(".content");

    setTimeout(() => {
      splash.classList.add("hidden");
      content.classList.add("visible");
    }, 3000); // 3 segundos
  });


  const listaContainer = document.getElementById('pokemon-lista');
  const mensagem = document.getElementById('mensagem');
  const btnPesquisar = document.getElementById('btn-pesquisar');
  const inputPesquisar = document.getElementById('input-pesquisar');
  const btnFavoritos = document.getElementById('btn-favoritos');
  const btnAnterior = document.getElementById('btn-anterior');
  const btnProximo = document.getElementById('btn-proximo');
  const modal = document.getElementById('modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const modalImg = document.getElementById('modal-img');
  const modalNome = document.getElementById('modal-nome');
  const modalInfo = document.getElementById('modal-info');

  let favoritos = JSON.parse(localStorage.getItem('favoritos')) || [];
  let listaFantasma = [];
  let listaFavoritos = [];
  let paginaAtual = 0;
  const limitePorPagina = 12;
  let pokemonAtualId = 1;
  let modoAtual = "fantasma"; // 'fantasma' | 'favoritos' | 'busca'

  // ==================== FUNÇÕES ====================

  async function carregarPokemonsFantasma() {
    modoAtual = "fantasma";
    mostrarMensagem("Carregando Pokémon fantasma...");
    try {
      const response = await fetch("https://pokeapi.co/api/v2/type/ghost");
      const data = await response.json();
      listaFantasma = await Promise.all(
        data.pokemon.map(async (p) => {
          const res = await fetch(p.pokemon.url);
          return await res.json();
        })
      );
      mostrarPagina(0);
      mostrarMensagem("");
    } catch (error) {
      mostrarMensagem("Erro ao carregar Pokémon.");
    }
  }

  function mostrarPagina(pagina) {
    let lista =
      modoAtual === "fantasma"
        ? listaFantasma
        : modoAtual === "favoritos"
        ? listaFavoritos
        : modoAtual === "busca"
        ? listaBusca
        : [];

    const inicio = pagina * limitePorPagina;
    const fim = inicio + limitePorPagina;
    const pokemonsPagina = lista.slice(inicio, fim);
    renderizarLista(pokemonsPagina);
    paginaAtual = pagina;

    btnAnterior.disabled = paginaAtual === 0;
    btnProximo.disabled = fim >= lista.length;
  }

  function renderizarLista(lista) {
    listaContainer.innerHTML = "";
    if (lista.length === 0) {
      listaContainer.innerHTML = "<p>Nenhum Pokémon encontrado.</p>";
      return;
    }
    lista.forEach((pokemon) => {
      const card = document.createElement("div");
      card.classList.add("pokemon-card");
      card.dataset.id = pokemon.id;
      card.innerHTML = `
        <button class="favorite-btn ${
          favoritos.includes(pokemon.id) ? "favorited" : ""
        }" data-id="${pokemon.id}">★</button>
        <img src="${
          pokemon.sprites.other.dream_world.front_default ||
          pokemon.sprites.front_default
        }" alt="${pokemon.name}" />
        <h3>${pokemon.name}</h3>
        <p>#${pokemon.id}</p>
        <p>Tipo: ${pokemon.types.map((t) => t.type.name).join(", ")}</p>
      `;
      listaContainer.appendChild(card);
    });

    document.querySelectorAll(".favorite-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorito(parseInt(btn.dataset.id));
      });
    });

    document.querySelectorAll(".pokemon-card").forEach((card) => {
      card.addEventListener("click", () =>
        mostrarDetalhes(parseInt(card.dataset.id))
      );
    });

    if (lista.length > 0) pokemonAtualId = lista[0].id;
  }

  function mostrarMensagem(texto) {
    mensagem.textContent = texto;
  }

  // Lista para armazenar resultado de busca (pode ser só 1, mas pra facilitar navegação)
  let listaBusca = [];

  async function buscarPokemon(idOuNome) {
    modoAtual = "busca";
    mostrarMensagem("Buscando...");
    try {
      const res = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${idOuNome.toString().toLowerCase()}`
      );
      if (!res.ok) throw new Error();
      const pokemon = await res.json();
      listaBusca = [pokemon];
      pokemonAtualId = pokemon.id;
      mostrarPagina(0);
      mostrarMensagem("");
      atualizarBotoesBusca(pokemonAtualId);
    } catch {
      mostrarMensagem("Pokémon não encontrado.");
      setTimeout(() => {
        mostrarMensagem("");
        carregarPokemonsFantasma();
      }, 3000);
    }
  }

  function atualizarBotoesBusca(id) {
    btnAnterior.disabled = id <= 1;
    btnProximo.disabled = id >= 1025; // limite do pokedex oficial atual
  }

  async function navegar(offset) {
    if (modoAtual === "busca") {
      const novoId = pokemonAtualId + offset;
      if (novoId >= 1 && novoId <= 1025) {
        await buscarPokemon(novoId);
      }
    } else {
      const lista =
        modoAtual === "fantasma"
          ? listaFantasma
          : modoAtual === "favoritos"
          ? listaFavoritos
          : [];
      const maxPaginas = Math.ceil(lista.length / limitePorPagina);
      const novaPagina = paginaAtual + offset;
      if (novaPagina >= 0 && novaPagina < maxPaginas) mostrarPagina(novaPagina);
    }
  }

  async function carregarFavoritos() {
    modoAtual = "favoritos";
    if (favoritos.length === 0) {
      listaContainer.innerHTML = "<p>Nenhum favorito salvo.</p>";
      btnAnterior.disabled = true;
      btnProximo.disabled = true;
      return;
    }
    listaFavoritos = await Promise.all(
      favoritos.map(async (id) => {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        return await res.json();
      })
    );
    mostrarPagina(0);
  }

  function toggleFavorito(id) {
    if (favoritos.includes(id)) {
      favoritos = favoritos.filter((f) => f !== id);
    } else {
      favoritos.push(id);
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    if (modoAtual === "favoritos") carregarFavoritos();
    else if (modoAtual === "busca") buscarPokemon(pokemonAtualId);
    else mostrarPagina(paginaAtual);
  }

  async function mostrarDetalhes(id) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const pokemon = await res.json();
    pokemonAtualId = pokemon.id;
    modalImg.src =
      pokemon.sprites.other.dream_world.front_default || pokemon.sprites.front_default;
    modalNome.textContent = `${pokemon.name} (#${pokemon.id})`;
    modalInfo.textContent = `Tipo: ${pokemon.types
      .map((t) => t.type.name)
      .join(", ")} | Altura: ${(pokemon.height / 10).toFixed(1)}m | Peso: ${(
      pokemon.weight / 10
    ).toFixed(1)}kg`;
    modal.style.display = "flex";
  }

  closeModalBtn.addEventListener("click", () => (modal.style.display = "none"));
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  btnPesquisar.addEventListener("click", () =>
    buscarPokemon(inputPesquisar.value.trim().toLowerCase())
  );
  inputPesquisar.addEventListener("keypress", (e) => {
    if (e.key === "Enter")
      buscarPokemon(inputPesquisar.value.trim().toLowerCase());
  });
  btnFavoritos.addEventListener("click", carregarFavoritos);
  btnAnterior.addEventListener("click", () => navegar(-1));
  btnProximo.addEventListener("click", () => navegar(1));

  carregarPokemonsFantasma();
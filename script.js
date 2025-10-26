// Abertura
window.addEventListener("load", () => {
  const splash = document.querySelector(".splash");
  const content = document.querySelector(".content");

  setTimeout(() => {
    splash.classList.add("hidden");
    content.classList.add("visible");
  }, 3000); // 3 segundos
});

// ELEMENTOS DOM
const listaContainer = document.getElementById("pokemon-lista");
const mensagem = document.getElementById("mensagem");
const btnPesquisar = document.getElementById("btn-pesquisar");
const inputPesquisar = document.getElementById("input-pesquisar");
const btnFavoritos = document.getElementById("btn-favoritos");
const btnAnterior = document.getElementById("btn-anterior");
const btnProximo = document.getElementById("btn-proximo");
const modal = document.getElementById("modal");
const closeModalBtn = document.querySelector(".close-modal");
const modalImg = document.getElementById("modal-img");
const modalNome = document.getElementById("modal-nome");
const modalInfo = document.getElementById("modal-info");
const btnPrincipal = document.getElementById("btn-principal");

// VARIÁVEIS 
let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];
let listaFantasma = [];
let listaFavoritos = [];
let listaBusca = [];
let paginaAtual = 0;
const limitePorPagina = 12;
let pokemonAtualId = 1;
let modoAtual = "fantasma";



// Fallback de imagem
const PLACEHOLDER_IMG = '/img/erro-imagem.png'; 

// FUNÇÕES UTILITÁRIAS 
function mostrarMensagem(texto) {
  mensagem.textContent = texto;
}

function tratarErroAPI(erro) {
  console.error("Erro na API:", erro);
  mostrarMensagem("🚨 A PokéAPI parece estar indisponível no momento. Tente novamente mais tarde!");
  btnAnterior.disabled = true;
  btnProximo.disabled = true;
  btnPesquisar.disabled = true;
}

function obterImagemPokemon(pokemon) {
  let url = null;

  if (pokemon.id < 10000) {
    const idFormatado = String(pokemon.id).padStart(3, "0");
    url = `https://assets.pokemon.com/assets/cms2/img/pokedex/full/${idFormatado}.png`;
  }

  if (!url) url = pokemon.sprites.front_default;
  if (!url) url = PLACEHOLDER_IMG;

  return url;
}

// FUNÇÃO DE FETCH COM RETRY 
async function obterPokemon(idOuNome, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOuNome}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 404) throw new Error("Pokémon não encontrado.");
        throw new Error(`Erro ${res.status}: Problema do servidor. Tentando novamente...`);
      }

      return await res.json();
    } catch (error) {
      if (error.name === "AbortError" || error.message.includes("Failed to fetch")) {
        error.message = "Requisição excedeu o tempo limite (10s) ou falha de rede. Tentando novamente...";
      }

      if (i === retries - 1 || error.message.includes("Pokémon não encontrado")) throw error;
      
      console.warn(`Tentativa ${i + 1} falhou para ${idOuNome}. ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

//  ATUALIZAÇÃO DE BOTÕES 
function atualizarBotoes(lista, pagina, limite) {
  const maxPaginas = Math.ceil(lista.length / limite);
  btnAnterior.disabled = pagina === 0;
  btnProximo.disabled = pagina >= maxPaginas - 1;
}

function atualizarBotoesBusca(id) {
  btnAnterior.disabled = id <= 1;
  btnProximo.disabled = id >= 1025;
}

// RENDERIZAÇÃO 
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

    const urlImagem = obterImagemPokemon(pokemon);
    const favoritado = favoritos.includes(pokemon.id) ? "favorited" : "";

    card.innerHTML = `
      <button class="favorite-btn ${favoritado}" data-id="${pokemon.id}">★</button>
      <img src="${urlImagem}" alt="${pokemon.name}" loading="lazy" />
      <h3>${pokemon.name}</h3>
      <p>#${pokemon.id}</p>
      <p>Tipo: ${pokemon.types.map((t) => t.type.name).join(", ")}</p>
    `;
    listaContainer.appendChild(card);
  });

  document.querySelectorAll(".favorite-btn").forEach((btn) =>
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorito(parseInt(btn.dataset.id));
    })
  );

  document.querySelectorAll(".pokemon-card").forEach((card) =>
    card.addEventListener("click", () => mostrarDetalhes(parseInt(card.dataset.id)))
  );

  if (lista.length > 0) pokemonAtualId = lista[0].id;
}

// MOSTRAR PÁGINA 
async function mostrarPagina(pagina) {
  let listaBase = [];
  let listaParaRenderizar = [];

  if (modoAtual === "fantasma") {
    listaBase = listaFantasma;
    const inicio = pagina * limitePorPagina;
    const fim = inicio + limitePorPagina;
    const referenciasPagina = listaBase.slice(inicio, fim);

    mostrarMensagem(`Carregando Pokémon da página ${pagina + 1}...`);
    listaParaRenderizar = await Promise.all(referenciasPagina.map((ref) => obterPokemon(ref.name)));

  } else if (modoAtual === "favoritos") {
    listaBase = listaFavoritos;
    const inicio = pagina * limitePorPagina;
    const fim = inicio + limitePorPagina;
    listaParaRenderizar = listaBase.slice(inicio, fim);

  } else if (modoAtual === "busca") {
    listaBase = listaBusca;
    listaParaRenderizar = listaBase;
  }

  renderizarLista(listaParaRenderizar);
  paginaAtual = pagina;
  atualizarBotoes(listaBase, paginaAtual, limitePorPagina);
}

// CARREGAMENTO PRINCIPAL 
async function carregarPokemons(tipo) {
  if (tipo !== modoAtual) paginaAtual = 0;
  modoAtual = tipo;
  btnPesquisar.disabled = false;

  try {
    if (tipo === "fantasma" && listaFantasma.length === 0) {
      mostrarMensagem(`Carregando Pokémon ${tipo}...`);
      const res = await fetch("https://pokeapi.co/api/v2/type/ghost");
      if (!res.ok) throw new Error("Erro ao obter lista de tipo.");
      const data = await res.json();
      listaFantasma = data.pokemon.map((p) => p.pokemon);

    } else if (tipo === "favoritos") {
      if (favoritos.length === 0) {
        listaContainer.innerHTML = "<p>Você ainda não marcou nenhum Pokémon como favorito!</p>";
        btnAnterior.disabled = true;
        btnProximo.disabled = true;
        mostrarMensagem(""); 
        return;
      }
      mostrarMensagem(`Carregando Pokémon ${tipo}...`);
      listaFavoritos = await Promise.all(favoritos.map((id) => obterPokemon(id)));
    }

    mostrarPagina(paginaAtual);
    mostrarMensagem("");
  } catch (erro) {
    tratarErroAPI(erro);
  }
}

// BUSCA 
async function buscarPokemon(idOuNome) {
  const query = idOuNome.toString().trim().toLowerCase();
  if (!query) {
    mostrarMensagem("Campo de busca vazio. Pokémon não encontrado.");
    setTimeout(() => {
      mostrarMensagem("");
      carregarPokemons("fantasma");
    }, 3000);
    return;
  }

  modoAtual = "busca";
  mostrarMensagem("Buscando...");

  try {
    const pokemon = await obterPokemon(query);
    listaBusca = [pokemon];
    pokemonAtualId = pokemon.id;
    mostrarPagina(0);
    atualizarBotoesBusca(pokemonAtualId);
    mostrarMensagem("");
  } catch (erro) {
    mostrarMensagem("Pokémon não encontrado.");
    setTimeout(() => {
      mostrarMensagem("");
      carregarPokemons("fantasma");
    }, 3000);
  }
}

// FAVORITOS
function toggleFavorito(id) {
  if (favoritos.includes(id)) favoritos = favoritos.filter((f) => f !== id);
  else favoritos.push(id);

  localStorage.setItem("favoritos", JSON.stringify(favoritos));

  if (modoAtual === "favoritos") carregarPokemons("favoritos");
  else if (modoAtual === "busca") buscarPokemon(pokemonAtualId);
  else mostrarPagina(paginaAtual);
}

//DETALHES
async function mostrarDetalhes(id) {
  try {
    const pokemon = await obterPokemon(id);
    pokemonAtualId = pokemon.id;

    const urlImagemModal = obterImagemPokemon(pokemon);
    modalImg.src = urlImagemModal;
    modalNome.textContent = `${pokemon.name} (#${pokemon.id})`;
    modalInfo.textContent = `Tipo: ${pokemon.types.map((t) => t.type.name).join(", ")} | Altura: ${(pokemon.height/10).toFixed(1)}m | Peso: ${(pokemon.weight/10).toFixed(1)}kg`;
    modal.style.display = "flex";
  } catch (erro) {
    mostrarMensagem("Erro ao carregar detalhes.");
  }
}

// NAVEGAÇÃO 
async function navegar(offset) {
  if (modoAtual === "busca") {
    const novoId = pokemonAtualId + offset;
    if (novoId >= 1 && novoId <= 1025) await buscarPokemon(novoId);
  } else {
    const lista = modoAtual === "fantasma" ? listaFantasma : listaFavoritos;
    const maxPaginas = Math.ceil(lista.length / limitePorPagina);
    const novaPagina = paginaAtual + offset;
    if (novaPagina >= 0 && novaPagina < maxPaginas) mostrarPagina(novaPagina);
  }
}

// EVENTOS 
closeModalBtn.addEventListener("click", () => (modal.style.display = "none"));
window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

btnPesquisar.addEventListener("click", () => {
  buscarPokemon(inputPesquisar.value);
  inputPesquisar.value = ""; 
});

inputPesquisar.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    buscarPokemon(inputPesquisar.value);
    inputPesquisar.value = ""; 
  }
});

btnFavoritos.addEventListener("click", () => { paginaAtual = 0; carregarPokemons("favoritos"); });
btnAnterior.addEventListener("click", () => navegar(-1));
btnProximo.addEventListener("click", () => navegar(1));

btnPrincipal.addEventListener("click", () => {
  paginaAtual = 0; 
  carregarPokemons("fantasma");
});

// INICIALIZAÇÃO
carregarPokemons("fantasma");

//----- Simula mi clase maestra -----------
const PokemonTeamManager = {
  //  Obtener equipo desde mi local storage
  getEquipoPokemon: () => {
    return JSON.parse(localStorage.getItem("teamPokemon")) || [];
  },

  // Guardar Equipo pokemon en mi local storage
  setEquipoPokemon: (pokemones) => {
    localStorage.setItem("teamPokemon", JSON.stringify(pokemones));
  },

  //elimino un pokemon de mi equipo.
  eliminarPokemon: (pokemonId) => {
    const teamPokemon = PokemonTeamManager.getEquipoPokemon();
    const teamPokemonesFiltrados = teamPokemon.filter((p) => p.id != pokemonId);
    if (teamPokemon.length === teamPokemonesFiltrados.length) {
      throw new Error("pokemon no encontrado");
    }

    PokemonTeamManager.setEquipoPokemon(teamPokemonesFiltrados);
    return true;
  },
  //  Vaciar equipo
  vaciarTeamPokemon: () => {
    PokemonTeamManager.setEquipoPokemon([]);
  },
};

const CONFIG = {
  POKEAPI_BASE_URL: "https://pokeapi.co/api/v2", // cuenta con 1302 pokemones
  TOTAL_POKEMON: 151, // primera generacion
  POKEMON_PER_PAGE: 20,
  MAX_TEAM_SIZE: 6, //mi team pokemon solo puede tener 6 pokemones activos.
};

const LoadingManager = {
  show(container, message = "Cargando...") {
    container.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
  },

  hide(container) {
    const loading = container.querySelector(".loading-container");
    if (loading) loading.remove();
  },
};

const ErrorMapper = {
  errorMap: {
    "Pokemon fuera de generación 1":
      "Solo se admite Pokémon de la primera generación (1-151)",
    "Cannot read properties of undefined (reading 'map')":
      "Has ingresado un dato no valido, recuerda que solo se admite Pokémon de la primera generación (1-151)",
    "HTTP 400":
      "Consulta inválida. Verifica el nombre o ID del Pokémon ingresado",
    "HTTP 404":
      "Pokémon no encontrado. Verifica el nombre o ID del Pokémon ingresado",
    "HTTP 500": "Error del servidor. Intenta más tarde",
  },
  getErrorMessage(error) {
    for (const [key, message] of Object.entries(this.errorMap)) {
      if (error.message.includes(key) || `HTTP ${error.status}` === key) {
        return message;
      }
    }

    return "Ha ocurrido un error inesperado";
  },
};

let currentPage = 1;
const totalPages = Math.ceil(CONFIG.TOTAL_POKEMON / CONFIG.POKEMON_PER_PAGE);

//referencias de mi DOM
const pokemonInput = document.getElementById("pokemonInput");
const pokemonDataDiv = document.getElementById("pokemon-data-container");
const pokemonTeamDiv = document.getElementById("pokemon-team-container");
const pokemonListDiv = document.getElementById("pokemon-list-container");
const pokemonListType = document.getElementById("pokemon-type-list");
const evolutionDataDiv = document.getElementById("evolutionData");

const getRandomPokemonId = () => {
  return Math.floor(Math.random() * 151) + 1; // Primeros 151 Pokémon - primera generacion
};

const getEvolutionChain = async () => {
  const pokemonName = pokemonInput.value.trim().toLowerCase();

  if (!pokemonName) {
    Swal.fire({
      title: "Busca primero",
      text: "Primero busca un Pokémon para ver su cadena de evolucion",
      icon: "info",
    });
    return;
  }

  try {
    LoadingManager.show(evolutionDataDiv, "Obteniendo cadena evolutiva...");
    const speciesResponse = await fetch(
      `${CONFIG.POKEAPI_BASE_URL}/pokemon-species/${pokemonName}`
    );
    if (!speciesResponse.ok) {
      throw new Error("No se pudo obtener la información de la especie");
    }

    const speciesData = await speciesResponse.json();

    // Obtener cadena de evoluciones - esto es por que el endpoint evolution-chain tiene un id diferente al id del pokemon.
    const evolutionResponse = await fetch(speciesData.evolution_chain.url);
    const evolutionData = await evolutionResponse.json();

    await displayEvolutionChain(evolutionData.chain);
    LoadingManager.hide(evolutionDataDiv);
  } catch (error) {
    LoadingManager.hide(evolutionDataDiv);
    Swal.fire({
      title: "Error en evoluciones",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
  }
};

const displayEvolutionChain = async (chain) => {
  const evolutionChain = [];
  let current = chain;

  while (current) {
    try {
      const pokemonResponse = await fetch(
        `${CONFIG.POKEAPI_BASE_URL}/pokemon/${current.species.name}`
      );
      const pokemonData = await pokemonResponse.json();
      evolutionChain.push(pokemonData);
    } catch (error) {
      Swal.fire({
        title: "Error en evoluciones",
        text: ErrorMapper.getErrorMessage(error),
        icon: "error",
      });
    }
    current =
      current.evolves_to && current.evolves_to.length > 0
        ? current.evolves_to[0]
        : null;
  }

  if (evolutionChain.length === 0) {
    Swal.fire({
      title: "Error en evoluciones",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
    return;
  }

  const evolutionHTML = evolutionChain
    .map(
      (pokemon, index) => `
        <div class="evolution-pokemon" data-pokemon="${pokemon.name}">
            <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
            <h4>${pokemon.name}</h4>
            <p>#${pokemon.id}</p>
        </div>
        ${
          index < evolutionChain.length - 1
            ? '<div class="evolution-arrow">→</div>'
            : ""
        }
    `
    )
    .join("");

  evolutionDataDiv.innerHTML = `
        <div class="evolution-chain">
            ${evolutionHTML}
        </div>
    `;
};

const getRandomPokemon = async () => {
  try {
    const randomId = getRandomPokemonId();
    pokemonInput.value = randomId;
    await getSearchPokemon();
  } catch (error) {
    Swal.fire({
      title: "Error",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
  }
};

const getSearchPokemon = async () => {
  clearResults();

  LoadingManager.show(pokemonDataDiv, "Buscando Pokémon...");

  const query = pokemonInput.value.trim().toLowerCase();

  if (query < 1 || query > CONFIG.TOTAL_POKEMON) {
    LoadingManager.hide(pokemonDataDiv);
    Swal.fire({
      title: "Pokémon no válido",
      text: "Por favor, ingresa un Pokémon de la primera generación (1 - 151)",
      icon: "warning",
    });
    return;
  }
  if (!query) {
    Swal.fire({
      title: "Campo vacío",
      text: "Por favor ingresa un nombre o ID válido",
      icon: "info",
    });
    return;
  }

  try {
    const pokemonUrl = `${CONFIG.POKEAPI_BASE_URL}/pokemon/${query}`;
    const getPokemon = await fetch(pokemonUrl);

    // Verificar si la respuesta es exitosa
    if (!getPokemon.ok) {
      const error = new Error(`HTTP ${getPokemon.status}`);
      error.status = getPokemon.status;
      throw error;
    }

    const pokemon = await getPokemon.json();
    LoadingManager.hide(pokemonDataDiv);
    if (pokemon.id > CONFIG.TOTAL_POKEMON) {
      throw new Error("Pokemon fuera de generación 1");
    }
    displayDataPokemon(pokemon);
  } catch (error) {
    LoadingManager.hide(pokemonDataDiv);
    Swal.fire({
      title: "Error",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
  }
};

const getPokemonList = async (page = 1) => {
  LoadingManager.show(pokemonListDiv, `Cargando página ${page}...`);
  try {
    // Calculamos el offset basado en la página
    const offset = (page - 1) * CONFIG.POKEMON_PER_PAGE;

    // Aseguramos de no excedernos  de los 151 pokémon
    const limit = Math.min(
      CONFIG.POKEMON_PER_PAGE,
      CONFIG.TOTAL_POKEMON - offset
    );

    const getList = await fetch(
      `${CONFIG.POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`
    );
    const pokemonList = await getList.json();

    const pokemonDetails = await Promise.all(
      pokemonList.results.map(async (pokemon) => {
        const pokemonResponse = await fetch(pokemon.url);
        return pokemonResponse.json();
      })
    );

    displayPokemonList(pokemonDetails);
    updatePaginationControls();
  } catch (error) {
    Swal.fire({
      title: "Error",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
  }
};

const getSearchType = async (type) => {
  try {
    LoadingManager.show(pokemonListDiv, "Buscando Pokémon por tipo...");
    const getList = await fetch(`${CONFIG.POKEAPI_BASE_URL}/type/${type}`);
    const pokemonList = await getList.json();

    // Filtrar por solo primera generacion (IDs 1-151)
    const gen1Pokemon = pokemonList.pokemon.filter((p) => {
      const pokemonId = parseInt(p.pokemon.url.split("/").slice(-2, -1)[0]);
      return pokemonId >= 1 && pokemonId <= 151;
    });

    const pokemonDetails = await Promise.all(
      gen1Pokemon.map(async (pokemon) => {
        const pokemonResponse = await fetch(pokemon.pokemon.url);
        return pokemonResponse.json();
      })
    );

    displayPokemonList(pokemonDetails, false);
    LoadingManager.hide(pokemonListDiv);
    return gen1Pokemon;
  } catch (error) {
    LoadingManager.hide(pokemonListDiv);
    Swal.fire({
      title: "Error",
      text: ErrorMapper.getErrorMessage(error),
      icon: "error",
    });
  }
};

const guardarEquipo = async () => {
  const team = PokemonTeamManager.getEquipoPokemon();

  let textoEquipo = `🎮 MI EQUIPO POKEMON 🎮\n`;
  textoEquipo += `📅 ${new Date().toLocaleDateString()}\n`;
  textoEquipo += `👥 ${team.length}/6 Pokemon\n\n`;

  team.forEach((pokemon, index) => {
    textoEquipo += `${index + 1}️⃣ ${pokemon.name.toUpperCase()} (#${
      pokemon.id
    })\n`;
    textoEquipo += `🏷️ ${pokemon.types.join(", ")}\n`;
    const totalStats = pokemon.statsArray.reduce(
      (sum, stat) => sum + stat.value,
      0
    );
    const statMasAlto = pokemon.statsArray.reduce((max, current) =>
      current.value > max.value ? current : max
    );

    const statMasBajo = pokemon.statsArray.reduce((min, current) =>
      current.value < min.value ? current : min
    );

    textoEquipo += `📊 BST - Base Stat Total: ${totalStats} | Mejor: ${statMasAlto.name} (${statMasAlto.value}) | Peor: ${statMasBajo.name} (${statMasBajo.value})\n\n`;
  });

  try {
    await navigator.clipboard.writeText(textoEquipo);
    Swal.fire({
      title: "Equipo copiado",
      text: "El equipo se copió al portapapeles correctamente",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    const dataBlob = new Blob([textoEquipo], { type: "text/plain" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(dataBlob);
    enlace.download = `equipo-pokemon.txt`;
    enlace.click();
    Swal.fire({
      title: "Archivo creado",
      text: "No se pudo copiar al portapapeles, se descargó como archivo",
      icon: "info",
    });
  }
};

function displayPokemonList(pokemonList, showPagination = true) {
  clearResults();
  if (showPagination) {
    paginationControls();
  }

  const pokemonItems = pokemonList
    .map(
      (pokemon, index) => `
              <div class="pokemon-list-item"  data-name="${
                pokemon.name
              }" style="animation-delay: ${index * 0.1}s">
              <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}">
              <h3>${pokemon.name}</h3>
              <p>#${pokemon.id}</p>
              <div class="types">
                  ${pokemon.types
                    .map(
                      (type) =>
                        `<span class="type ${type.type.name}">${type.type.name}</span>`
                    )
                    .join(" ")}
              </div>
          </div>
          `
    )
    .join("");
  pokemonListDiv.innerHTML = pokemonItems;
}

function displayDataPokemon(pokemon) {
  let displayPokemon = "";
  const types = pokemon.types
    .map(
      (type) => `<span class="type ${type.type.name}">${type.type.name}</span>`
    )
    .join("");
  const stats = pokemon.stats
    .map((stat) => {
      const percentage = Math.min((stat.base_stat / 255) * 100, 100);
      return `
              <div class="stat">
                  <div class="stat-name">${stat.stat.name}</div>
                  <div class="stat-bar">
                      <div class="stat-fill" style="width: ${percentage}%"></div>
                  </div>
                  <div class="stat-value">${stat.base_stat}/255</div>
              </div>
          `;
    })
    .join("");

  displayPokemon = `
  <div class="pokemon-card">
    <div class="pokemon-header">
      <div class="pokemon-image">
        <img id="pokemon-image" src="${
          pokemon.sprites.front_default
        }" alt="Imagen del Pokémon" width="200" />
      </div>
      <div class="pokemon-info">
        <div class="pokemon-id">#${pokemon.id}</div>
        <button id="btn-add_team">Agregar a mi equipo</button>
        <button id="btn-evolution">Evoluciones</button>
        <h2 id="pokemon-name">${pokemon.name}</h2>
        <div class="types">${types}</div>
        <div class="pokemon-stats">
        <p><strong>Altura:</strong> ${pokemon.height / 10} m</p>
        <p><strong>Peso:</strong> ${pokemon.weight / 10} kg</p>
        <p><strong>Experiencia base al derrotarlo:</strong> ${
          pokemon.base_experience
        }</p> </div>
      </div>
    </div>
    <div class="stats">${stats}</div>
  </div>
      `;
  pokemonDataDiv.innerHTML = displayPokemon;

  const buttonAddTeam = document.getElementById("btn-add_team");
  buttonAddTeam.addEventListener("click", () => {
    addTeamPokemon(pokemon);
  });

  const buttonChainEvolution = document.getElementById("btn-evolution");
  buttonChainEvolution.addEventListener("click", () => {
    getEvolutionChain(pokemon.name);
  });
}

function displayTeamPokemon() {
  clearResults();
  const teamPokemon = PokemonTeamManager.getEquipoPokemon();

  if (teamPokemon.length === 0) {
    const emptyMessage = ` 
    <div class="pokemon-team">Tu equipo pokemon esta vacio, carga algunos</div>
     `;
    pokemonTeamDiv.innerHTML = emptyMessage;
    return;
  }

  const buttonsHTML = `
    <div class ="team-buttons-container">
      <button id="btn-export-team" class="team-btn">📤 Exportar Equipo</button>
      <button id="btn-clear-team" class="team-btn">🗑️ Vaciar Equipo</button>
    </div>
    `;

  let todosLosPokemones = "";

  teamPokemon.forEach((p) => {
    const types = p.types
      .map((t) => `<span class="type ${t}">${t}</span>`)
      .join("");

    const stats = p.statsArray
      .map((st) => {
        const percentage = Math.min((st.value / 255) * 100, 100);
        return `
            <div class="stat">
              <div class="stat-name">${st.name}</div>
              <div class="stat-bar">
                <div class="stat-fill" style="width: ${percentage}%"></div>
              </div>
              <div class="stat-value">${st.value}/255</div>
            </div>
          `;
      })
      .join("");

    todosLosPokemones += `
    <div class="pokemon-team">
      <div class="pokemon-list-item">
        <img src="${p.sprite}" alt="${p.name}" width="80">
        <h3 id="pokemon-name">${p.name}</h3>
        <p>#${p.id}</p> 
        <div class="types">${types}</div>
        <button class="btn-delete_pokemon" data-id="${p.id}">Eliminar de mi equipo</button>
      </div>
      <div class="pokemon-list-item">
        <h4>Stats</h4>
        <div class="stats">${stats}</div>
      </div>
    </div>
    `;
  });

  pokemonTeamDiv.innerHTML = buttonsHTML + todosLosPokemones;

  const exportBtn = document.getElementById("btn-export-team");
  const clearBtn = document.getElementById("btn-clear-team");

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      guardarEquipo();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", async () => {
      const team = PokemonTeamManager.getEquipoPokemon();
      const result = await Swal.fire({
        title: "¿Vaciar equipo completo?",
        text: `Se eliminarán ${team.length} Pokémon. Esta acción no se puede deshacer.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#6c757d",
        confirmButtonText: "Sí, vaciar equipo",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
      });

      if (result.isConfirmed) {
        PokemonTeamManager.vaciarTeamPokemon();
        displayTeamPokemon();

        Swal.fire({
          title: "Equipo vaciado",
          text: `Se eliminaron ${team.length} Pokémon del equipo`,
          icon: "success",
          confirmButtonColor: "#28a745",
        });
      }
    });
  }
}

function clearResults() {
  pokemonDataDiv.innerHTML = "";
  pokemonTeamDiv.innerHTML = "";
  pokemonListDiv.innerHTML = "";
  pokemonListType.innerHTML = "";
  evolutionDataDiv.innerHTML = "";

  const paginationContainer = document.getElementById("pagination-container");
  if (paginationContainer) {
    paginationContainer.remove();
  }
}

const selectPokemon = (name) => {
  if (!name || typeof name !== "string" || name.trim() === "") {
    Swal.fire({
      title: "Error",
      text: "Nombre de Pokémon inválido",
      icon: "error",
    });
    return;
  }
  pokemonInput.value = name.trim().toLowerCase();
  getSearchPokemon();
};

const addTeamPokemon = (pokemonObj) => {
  const pokemonGuardado = {
    id: pokemonObj.id,
    name: pokemonObj.name,
    sprite: pokemonObj.sprites.front_default,
    types: pokemonObj.types.map((t) => t.type.name),
    statsArray: pokemonObj.stats.map((s) => ({
      name: s.stat.name,
      value: s.base_stat,
    })),
  };

  const team = PokemonTeamManager.getEquipoPokemon(); // [] si está vacío

  if (team.some((p) => p.id === pokemonGuardado.id)) {
    Swal.fire({
      title: "Pokémon duplicado",
      text: `${pokemonGuardado.name} ya está en tu equipo`,
      icon: "info",
    });
    return;
  }

  if (team.length >= CONFIG.MAX_TEAM_SIZE) {
    Swal.fire({
      title: "Equipo completo",
      text: "Tu equipo ya tiene 6 pokemones",
      icon: "warning",
    });
    return;
  }
  team.push(pokemonGuardado);

  PokemonTeamManager.setEquipoPokemon(team);

  Swal.fire({
    title: "Pokémon agregado",
    text: `${pokemonGuardado.name} se ha añadido a tu equipo`,
    icon: "success",
    timer: 2000,
    showConfirmButton: false,
  });
};

function getButtonType() {
  clearResults();
  displayButtonType = `
    <div class="type-selector">
      <button class="type normal" data-type="normal">Normal</button>
      <button class="type fire" data-type="fire">Fuego</button>
      <button class="type water" data-type="water">Agua</button>
      <button class="type electric" data-type="electric">Eléctrico</button>
      <button class="type grass" data-type="grass">Planta</button>
      <button class="type ice" data-type="ice">Hielo</button>
      <button class="type fighting" data-type="fighting">Lucha</button>
      <button class="type poison" data-type="poison">Veneno</button>
      <button class="type ground" data-type="ground">Tierra</button>
      <button class="type flying" data-type="flying">Volador</button>
      <button class="type psychic" data-type="psychic">Psíquico</button>
      <button class="type bug" data-type="bug">Bicho</button>
      <button class="type rock" data-type="rock">Roca</button>
      <button class="type ghost" data-type="ghost">Fantasma</button>
      <button class="type dragon" data-type="dragon">Dragón</button>
    </div>`;

  pokemonListType.innerHTML = displayButtonType;
}

//======= controles de pagina ========

function paginationControls() {
  let paginationContainer = document.getElementById("pagination-container");

  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.className = "pagination-container";

    document.querySelector(".container").appendChild(paginationContainer);
  }
  paginationContainer.innerHTML = `
                <div class="pagination">
                    <button id="prev-btn" class="pagination-btn">← Anterior</button>
                    <div class="page-info">
                        <span>Página <span id="current-page">${currentPage}</span> de ${totalPages}</span>
                    </div>
                    <button id="next-btn" class="pagination-btn">Siguiente →</button>
                </div>
                <div class="page-numbers">
                    ${generatePageNumbers()}
                </div>
            `;
}

// Generar números de página
function generatePageNumbers() {
  let pageNumbers = "";
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers += `
                    <button class="page-number ${
                      i === currentPage ? "active" : ""
                    }" data-page="${i}">
                        ${i}
                    </button>
                `;
  }

  return pageNumbers;
}

// Actualizar controles de paginación
function updatePaginationControls() {
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const currentPageSpan = document.getElementById("current-page");

  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  if (currentPageSpan) currentPageSpan.textContent = currentPage;

  // Actualizar números de página
  const pageNumbersContainer = document.querySelector(".page-numbers");
  if (pageNumbersContainer) {
    pageNumbersContainer.innerHTML = generatePageNumbers();
  }
}

// Funciones de navegación
function goToPage(page) {
  if (page >= 1 && page <= totalPages && page !== currentPage) {
    currentPage = page;
    getPokemonList(currentPage);
    // Scroll al top para mejor UX
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goToNextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    getPokemonList(currentPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function goToPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    getPokemonList(currentPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// ----------- listener delegados.-----------

pokemonTeamDiv.addEventListener("click", async (e) => {
  if (e.target.matches(".btn-delete_pokemon")) {
    const id = e.target.dataset.id;
    const team = PokemonTeamManager.getEquipoPokemon();
    const p = team.find((item) => item.id === Number(id));

    const result = await Swal.fire({
      title: `¿Eliminar a ${p.name}?`,
      text: "Deberas volver a agregar este Pokémon al equipo, en caso de volver a quererlo",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Mantener",
    });

    if (result.isConfirmed) {
      try {
        PokemonTeamManager.eliminarPokemon(p.id);
        displayTeamPokemon();

        Swal.fire({
          title: "Eliminado",
          text: `${p.name} fue removido del equipo`,
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: error.message,
          icon: "error",
        });
      }
    }
  }
});

pokemonListDiv.addEventListener("click", (e) => {
  if (e.target.matches(".pokemon-list-item")) {
    const pokemonName = e.target.dataset.name;

    selectPokemon(pokemonName);
  }
});

pokemonListType.addEventListener("click", (e) => {
  if (e.target.matches("button[data-type]")) {
    const selectedType = e.target.dataset.type;

    getSearchType(selectedType);
  }
});

evolutionDataDiv.addEventListener("click", (e) => {
  const evolutionPokemon = e.target.closest(".evolution-pokemon");
  if (evolutionPokemon) {
    const pokemonName = evolutionPokemon.dataset.pokemon;
    selectPokemon(pokemonName);
  }
});

document.addEventListener("click", (e) => {
  if (e.target.matches("#prev-btn")) {
    goToPreviousPage();
  }
  if (e.target.matches("#next-btn")) {
    goToNextPage();
  }
  if (e.target.matches(".page-number")) {
    const page = parseInt(e.target.textContent);
    goToPage(page);
  }
});

// -------------- inicializacion  de mis listener -----------

document.addEventListener("DOMContentLoaded", () => {
  const buttonRandom = document.getElementById("btn-get");
  buttonRandom.addEventListener("click", getRandomPokemon);

  const buttonSearch = document.getElementById("btn-search");
  buttonSearch.addEventListener("click", getSearchPokemon);

  const buttonTeamPokemon = document.getElementById("btn-team_list");
  buttonTeamPokemon.addEventListener("click", displayTeamPokemon);

  const buttonPokemonList = document.getElementById("btn-get_list");
  buttonPokemonList.addEventListener("click", getPokemonList);

  const buttonSearchType = document.getElementById("btn-search_type");
  buttonSearchType.addEventListener("click", getButtonType);

  const pokemonInput = document.getElementById("pokemonInput");
  pokemonInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      getSearchPokemon();
    }
  });
});

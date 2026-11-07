/* ==========================================================
   script.js – animação de rolagem da Cervejaria Feierabend
   Versão 2: as cenas se misturam umas nas outras (crossfade)
   e os vídeos tocam sozinhos quando a cena aparece.
   Usa a biblioteca GSAP com o plugin ScrollTrigger.
   ========================================================== */

const cenas = Array.from(document.querySelectorAll(".cena"));
const videos = cenas.map(function (cena) {
  return cena.querySelector(".cena__video");
});


/* ----------------------------------------------------------
   1. PREPARAR OS VÍDEOS
   Isso roda mesmo se o GSAP não carregar, pra o vídeo nunca
   depender da animação.
   - muted e playsInline: sem isso o celular bloqueia o play
   - se o vídeo der erro, a cena ganha "sem-video" e o CSS
     mostra o degradê no lugar
   ---------------------------------------------------------- */
videos.forEach(function (video, i) {
  if (!video) return;
  video.muted = true;
  video.playsInline = true;

  function semVideo() {
    cenas[i].classList.add("sem-video");
  }
  if (video.error) semVideo();
  video.addEventListener("error", semVideo);
});

// Toca só os vídeos da lista e pausa o resto (economiza bateria)
function tocarSomente(indices) {
  videos.forEach(function (video, i) {
    if (!video) return;
    if (indices.indexOf(i) !== -1) {
      if (video.paused) video.play().catch(function () {});
    } else if (!video.paused) {
      video.pause();
    }
  });
}


/* ----------------------------------------------------------
   2. SEM GSAP OU COM "REDUZIR MOVIMENTO"
   As cenas ficam uma embaixo da outra, sem animação, e cada
   vídeo toca quando aparece na tela.
   ---------------------------------------------------------- */
function modoSimples() {
  if (!("IntersectionObserver" in window)) {
    tocarSomente(videos.map(function (_, i) { return i; }));
    return;
  }
  const observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      const video = entrada.target.querySelector(".cena__video");
      if (!video) return;
      if (entrada.isIntersecting) video.play().catch(function () {});
      else video.pause();
    });
  }, { threshold: 0.25 });
  cenas.forEach(function (cena) { observador.observe(cena); });
}

if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
  console.warn("GSAP não carregou. O site vai funcionar sem animação.");
  modoSimples();
} else {
  iniciar();
}


function iniciar() {
  gsap.registerPlugin(ScrollTrigger);

  const barra = document.querySelector(".progresso__barra");
  const elementosQueSurgem = document.querySelectorAll(".surgir");


  /* --------------------------------------------------------
     3. BARRA DE PROGRESSO
     -------------------------------------------------------- */
  if (barra) {
    gsap.to(barra, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });
  }


  const mm = gsap.matchMedia();

  // Quem ativou "reduzir movimento" no aparelho vê a versão simples
  mm.add("(prefers-reduced-motion: reduce)", function () {
    modoSimples();
  });

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    if (cenas.length === 0) return;

    /* ------------------------------------------------------
       4. O PALCO
       Em vez de uma cena embaixo da outra, a gente empilha
       as 4 cenas no mesmo lugar, dentro de um "palco" que
       fica grudado na tela. Aí a rolagem só troca qual cena
       está visível, misturando uma na outra. É isso que deixa
       a transição suave, sem "corte" entre as cenas.
       ------------------------------------------------------ */
    const palco = document.createElement("div");
    palco.className = "palco";
    cenas[0].parentNode.insertBefore(palco, cenas[0]);
    cenas.forEach(function (cena) { palco.appendChild(cena); });

    gsap.set(palco, { position: "relative", height: "100svh", overflow: "hidden" });
    gsap.set(cenas, { position: "absolute", inset: 0, height: "100%" });
    // Todas começam invisíveis, menos a primeira
    gsap.set(cenas.slice(1), { autoAlpha: 0 });

    const textos = cenas.map(function (c) { return c.querySelector(".cena__texto"); });

    /* ------------------------------------------------------
       5. A LINHA DO TEMPO
       Cada cena ganha 1 "unidade" de tempo. A rolagem inteira
       do palco corresponde à linha do tempo inteira.
       ------------------------------------------------------ */
    const linhaDoTempo = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: palco,
        start: "top top",
        end: "+=" + cenas.length * 100 + "%", // 1 tela de rolagem por cena
        pin: true,
        scrub: 1, // segue a rolagem com 1 segundo de suavidade
        onUpdate: function (estado) {
          // Descobre em qual cena a gente está e toca ela e a próxima
          const posicao = estado.progress * cenas.length;
          const atual = Math.min(cenas.length - 1, Math.floor(posicao));
          tocarSomente([atual, atual + 1]);
        }
      }
    });

    cenas.forEach(function (cena, i) {
      const video = videos[i];
      const texto = textos[i];
      const inicio = i; // cada cena começa na unidade i

      // Zoom lento no vídeo durante a cena inteira (e um pouco além)
      if (video) {
        linhaDoTempo.fromTo(video, { scale: 1.12 }, { scale: 1, duration: 1.4 }, Math.max(0, inicio - 0.3));
      }

      // Texto entra (a primeira cena já começa com o texto na tela)
      if (texto && i > 0) {
        linhaDoTempo.fromTo(texto,
          { autoAlpha: 0, y: 50 },
          { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out" },
          inicio + 0.05
        );
      }

      // Se não for a última cena: texto sai e a próxima cena aparece por cima
      if (i < cenas.length - 1) {
        if (texto) {
          linhaDoTempo.to(texto,
            { autoAlpha: 0, y: -50, duration: 0.25, ease: "power2.in" },
            inicio + 0.65
          );
        }
        // O CROSSFADE: a próxima cena surge suavemente por cima desta
        linhaDoTempo.to(cenas[i + 1], { autoAlpha: 1, duration: 0.35, ease: "power1.inOut" }, inicio + 0.75);
      }
    });

    // Garante que a linha do tempo tenha exatamente o tamanho certo
    linhaDoTempo.set({}, {}, cenas.length);

    // Começa tocando o primeiro vídeo
    tocarSomente([0, 1]);

    // Quando a pessoa sair do modo animado, desfaz o palco
    return function () {
      cenas.forEach(function (cena) { palco.parentNode.insertBefore(cena, palco); });
      palco.remove();
    };
  });


  /* --------------------------------------------------------
     6. ELEMENTOS QUE SURGEM (cards e contato)
     -------------------------------------------------------- */
  mm.add("(prefers-reduced-motion: no-preference)", function () {
    elementosQueSurgem.forEach(function (elemento) {
      gsap.from(elemento, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: { trigger: elemento, start: "top 85%", once: true }
      });
    });
  });


  // Recalcula as posições quando tudo terminar de carregar
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
}

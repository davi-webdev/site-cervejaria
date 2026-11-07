/* ==========================================================
   script.js – animação de rolagem da Cervejaria Correnteza
   Usa a biblioteca GSAP com o plugin ScrollTrigger.
   ========================================================== */


/* ----------------------------------------------------------
   0. SEGURANÇA
   Se a internet falhar e o GSAP não carregar, o site não pode
   quebrar. Então a gente só mostra tudo parado e para aqui.
   ---------------------------------------------------------- */
if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
  console.warn("GSAP não carregou. O site vai funcionar sem animação.");
} else {
  iniciar();
}


function iniciar() {
  // Avisa o GSAP que a gente vai usar o plugin de rolagem
  gsap.registerPlugin(ScrollTrigger);

  // Pega da página tudo que o script vai controlar
  const cenas = document.querySelectorAll(".cena");
  const barra = document.querySelector(".progresso__barra");
  const elementosQueSurgem = document.querySelectorAll(".surgir");


  /* --------------------------------------------------------
     1. VÍDEOS
     - Se o vídeo não existir ou der erro, a cena ganha a
       classe "sem-video" (o CSS mostra um degradê no lugar).
     - O vídeo só toca quando a cena está na tela. Fora dela,
       pausa. Isso economiza bateria e internet no celular.
     -------------------------------------------------------- */
  cenas.forEach(function (cena) {
    const video = cena.querySelector(".cena__video");
    if (!video) return;

    function semVideo() {
      cena.classList.add("sem-video");
    }

    // O erro pode ter acontecido antes do script rodar, então confere já
    if (video.error) semVideo();
    video.addEventListener("error", semVideo);

    ScrollTrigger.create({
      trigger: cena,
      start: "top bottom", // quando o topo da cena encosta no fim da tela
      end: "bottom top",   // até o fim da cena sair pelo topo
      onToggle: function (estado) {
        if (estado.isActive) {
          // .catch evita erro no console quando o navegador bloqueia o play
          video.play().catch(function () {});
        } else {
          video.pause();
        }
      }
    });
  });


  /* --------------------------------------------------------
     2. BARRA DE PROGRESSO
     Vai de 0% a 100% de largura conforme a pessoa rola a
     página do começo ao fim.
     -------------------------------------------------------- */
  if (barra) {
    gsap.to(barra, {
      width: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: true // "scrub" = a animação segue o dedo/rodinha do mouse
      }
    });
  }


  /* --------------------------------------------------------
     3. ANIMAÇÕES
     matchMedia deixa a gente ter duas versões:
     - uma pra quem aceita movimento (a maioria)
     - outra pra quem ativou "reduzir movimento" no celular/PC
       (gente que passa mal com animação). Pra essa, tudo
       aparece direto, sem efeito.
     -------------------------------------------------------- */
  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", function () {

    /* 3a. CENAS: cada cena "gruda" na tela (pin) enquanto a
       pessoa rola, e dentro dela acontece uma mini história:
       o vídeo faz um zoom lento, o texto entra e depois sai. */
    cenas.forEach(function (cena, posicao) {
      const video = cena.querySelector(".cena__video");
      const texto = cena.querySelector(".cena__texto");
      const ehUltima = posicao === cenas.length - 1;

      // Uma "linha do tempo" é uma fila de animações em sequência
      const linhaDoTempo = gsap.timeline({
        scrollTrigger: {
          trigger: cena,
          start: "top top",   // começa quando a cena encosta no topo
          end: "+=100%",      // dura uma tela inteira de rolagem
          pin: true,          // segura a cena parada enquanto isso
          scrub: 0.6          // segue a rolagem, com um leve atraso suave
        }
      });

      // Zoom lento no vídeo durante toda a cena
      if (video) {
        linhaDoTempo.fromTo(video,
          { scale: 1.15 },
          { scale: 1, ease: "none", duration: 1 },
          0 // o 0 faz começar junto com o início da linha do tempo
        );
      }

      if (texto) {
        // Texto entra de baixo pra cima
        linhaDoTempo.fromTo(texto,
          { opacity: 0, y: 60 },
          { opacity: 1, y: 0, ease: "power2.out", duration: 0.35 },
          0
        );

        // Texto sai pra cima (menos na última cena, que fica até o fim)
        if (!ehUltima) {
          linhaDoTempo.to(texto,
            { opacity: 0, y: -60, ease: "power2.in", duration: 0.3 },
            0.7 // começa quando 70% da cena já passou
          );
        }
      }
    });

    /* 3b. ELEMENTOS QUE SURGEM: os cards das cervejas e o
       contato aparecem suavemente quando entram na tela.
       Acontece uma vez só (once), não fica repetindo. */
    elementosQueSurgem.forEach(function (elemento) {
      gsap.from(elemento, {
        opacity: 0,
        y: 40,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: elemento,
          start: "top 85%", // quando o topo dele chega em 85% da altura da tela
          once: true
        }
      });
    });
  });


  /* --------------------------------------------------------
     4. AJUSTE FINAL
     Quando os vídeos e as fontes terminam de carregar, o
     tamanho das coisas pode mudar um pouco. Aí a gente pede
     pro ScrollTrigger recalcular as posições.
     -------------------------------------------------------- */
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
}
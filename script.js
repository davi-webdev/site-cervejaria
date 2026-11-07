/* ==========================================================
   script.js – animações da Cervejaria Feierabend
   Versão 3:
   - abertura com um copo enchendo de chope
   - cada troca de cena tem uma transição diferente
   - os títulos entram palavra por palavra
   Usa a biblioteca GSAP com o plugin ScrollTrigger.
   ========================================================== */

const raiz = document.documentElement;
const abertura = document.querySelector(".abertura");
const cenas = Array.from(document.querySelectorAll(".cena"));
const videos = cenas.map(function (cena) {
  return cena.querySelector(".cena__video");
});

/* ----------------------------------------------------------
   0. VOCÊ TEM 18 ANOS?
   Se a pessoa ainda não confirmou, o <head> já colocou a
   classe "pedir-idade" e a pergunta aparece na frente de tudo.
   A abertura do copo só começa depois do "Sim".
   ---------------------------------------------------------- */
const idadeConfirmada = new Promise(function (resolver) {
  const caixa = document.querySelector(".idade");
  if (!raiz.classList.contains("pedir-idade") || !caixa) {
    raiz.classList.remove("pedir-idade");
    return resolver();
  }

  const sim = caixa.querySelector('[data-idade="sim"]');
  const nao = caixa.querySelector('[data-idade="nao"]');
  setTimeout(function () { sim.focus(); }, 100);

  sim.addEventListener("click", function () {
    try { localStorage.setItem("feierabend-18", String(Date.now())); } catch (e) {}
    caixa.classList.add("idade--saindo");
    setTimeout(function () {
      raiz.classList.remove("pedir-idade");
      resolver();
      // rede de segurança da abertura (igual à do <head>)
      setTimeout(function () { raiz.classList.add("abertura-saiu"); }, 9000);
    }, 400);
  });

  nao.addEventListener("click", function () {
    caixa.querySelector("[data-idade-texto]").textContent =
      "Então ainda não é hora do seu Feierabend. Volte quando tiver 18! 😉";
    caixa.querySelector("[data-idade-botoes]").hidden = true;
  });
});

// Sempre começa do topo (senão o navegador volta pra onde a pessoa parou)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";


/* ----------------------------------------------------------
   1. VÍDEOS
   Funciona mesmo se o GSAP não carregar.
   ---------------------------------------------------------- */
videos.forEach(function (video, i) {
  if (!video) return;
  video.muted = true;       // sem isso o celular bloqueia o play
  video.playsInline = true; // não abre em tela cheia no iPhone

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

// Tira a abertura da tela e libera a rolagem
function removerAbertura() {
  raiz.classList.remove("travado");
  if (abertura) abertura.remove();
}


/* ----------------------------------------------------------
   2. MODO SIMPLES (sem GSAP ou com "reduzir movimento")
   Sem abertura, cenas uma embaixo da outra, vídeo toca quando
   aparece na tela.
   ---------------------------------------------------------- */
function modoSimples() {
  removerAbertura();
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


/* ----------------------------------------------------------
   3. QUEBRAR O TÍTULO EM PALAVRAS
   "Gelada, do jeito certo." vira várias <span>, uma por
   palavra, pra cada uma poder entrar separada.
   Cada palavra fica dentro de uma "janelinha" (overflow
   hidden), então ela parece subir de dentro do nada.
   ---------------------------------------------------------- */
function quebrarEmPalavras(elemento) {
  if (!elemento || elemento.dataset.quebrado) return [];
  elemento.dataset.quebrado = "sim";

  const nosDeTexto = [];
  const andador = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
  while (andador.nextNode()) nosDeTexto.push(andador.currentNode);

  nosDeTexto.forEach(function (no) {
    const pedacos = no.textContent.split(/(\s+)/);
    const fragmento = document.createDocumentFragment();
    pedacos.forEach(function (pedaco) {
      if (pedaco === "") return;
      if (/^\s+$/.test(pedaco)) {
        fragmento.appendChild(document.createTextNode(" "));
        return;
      }
      const janela = document.createElement("span");
      janela.className = "palavra";
      const dentro = document.createElement("span");
      dentro.className = "palavra__dentro";
      dentro.textContent = pedaco;
      janela.appendChild(dentro);
      fragmento.appendChild(janela);
    });
    no.parentNode.replaceChild(fragmento, no);
  });

  return Array.from(elemento.querySelectorAll(".palavra__dentro"));
}


function iniciar() {
  gsap.registerPlugin(ScrollTrigger);

  const barra = document.querySelector(".progresso__barra");
  const elementosQueSurgem = document.querySelectorAll(".surgir");


  /* --------------------------------------------------------
     4. BARRA DE PROGRESSO
     -------------------------------------------------------- */
  if (barra) {
    gsap.to(barra, {
      width: "100%",
      ease: "none",
      scrollTrigger: { trigger: document.body, start: "top top", end: "bottom bottom", scrub: true }
    });
  }

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", function () {
    modoSimples();
  });

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    if (cenas.length === 0) {
      removerAbertura();
      return;
    }

    /* ------------------------------------------------------
       5. O PALCO
       As 4 cenas ficam empilhadas no mesmo lugar, dentro de
       um "palco" grudado na tela. A rolagem só decide qual
       cena aparece e como ela entra.
       ------------------------------------------------------ */
    // A rolagem suave do CSS briga com o "snap" do ScrollTrigger, então desliga aqui
    raiz.style.scrollBehavior = "auto";

    const palco = document.createElement("div");
    palco.className = "palco";
    cenas[0].parentNode.insertBefore(palco, cenas[0]);
    cenas.forEach(function (cena) { palco.appendChild(cena); });

    gsap.set(palco, { position: "relative", height: "100svh", overflow: "hidden" });
    cenas.forEach(function (cena, i) {
      // zIndex: cada cena fica numa "camada" própria, uma acima da outra.
      // Sem isso, o texto de uma cena aparecia por cima da outra.
      gsap.set(cena, { position: "absolute", inset: 0, height: "100%", zIndex: i + 1 });
    });

    // Pega as peças de cada cena
    const pecas = cenas.map(function (cena) {
      return {
        video: cena.querySelector(".cena__video"),
        texto: cena.querySelector(".cena__texto"),
        etapa: cena.querySelector(".cena__etapa"),
        palavras: quebrarEmPalavras(cena.querySelector(".cena__titulo")),
        descricao: cena.querySelector(".cena__descricao")
      };
    });
    const avisoRolar = cenas[0].querySelector(".cena__rolar");

    /* ------------------------------------------------------
       6. AS TRANSIÇÕES
       A cena nova entra por cima da antiga usando uma "máscara"
       com borda esfumaçada (mask-image). Nada de corte reto:
       as duas cenas se misturam na borda.
       - brassagem: sobe de baixo pra cima, tipo chope enchendo
       - fermentação: abre do centro, tipo escotilha do tanque
       - copo: escorre na diagonal, tipo chope sendo servido
       Cada cena tem um número "revelado" de 0 (escondida) a 1
       (inteira na tela). O GSAP anima o número e a função
       aplicarMascara() desenha a máscara certa.
       ------------------------------------------------------ */
    const tipos = [null, "sobe", "abre", "diagonal"];
    const revelado = cenas.map(function (_, i) { return { r: i === 0 ? 1 : 0 }; });

    function aplicarMascara(cena, tipo, r) {
      const s = cena.style;
      let imagem, tamanho, posicao;

      if (r >= 1) {
        imagem = "none"; // inteira na tela: tira a máscara (mais leve)
      } else if (tipo === "abre") {
        imagem = "radial-gradient(closest-side, #000 60%, transparent 100%)";
        const t = r * r * 300; // começa devagar e acelera
        tamanho = t + "vmax " + t + "vmax";
        posicao = "50% 50%";
      } else if (tipo === "diagonal") {
        imagem = "linear-gradient(135deg, #000 0%, #000 44%, transparent 56%, transparent 100%)";
        tamanho = "300% 300%";
        posicao = ((1 - r) * 100) + "% " + ((1 - r) * 100) + "%";
      } else { // "sobe"
        imagem = "linear-gradient(to bottom, transparent 0%, transparent 43%, #000 57%, #000 100%)";
        tamanho = "100% 300%";
        posicao = "50% " + (r * 100) + "%";
      }

      s.webkitMaskImage = s.maskImage = imagem;
      if (imagem !== "none") {
        s.webkitMaskRepeat = s.maskRepeat = "no-repeat";
        s.webkitMaskSize = s.maskSize = tamanho;
        s.webkitMaskPosition = s.maskPosition = posicao;
      }
      // escondida de verdade quando r = 0 (o navegador nem desenha)
      s.visibility = r <= 0 ? "hidden" : "visible";
    }

    cenas.forEach(function (cena, i) {
      if (i > 0) aplicarMascara(cena, tipos[i] || "sobe", 0);
    });

    // Textos começam escondidos (a cena 1 entra depois da abertura)
    pecas.forEach(function (p) {
      gsap.set(p.palavras, { yPercent: 110 });
      gsap.set([p.etapa, p.descricao], { autoAlpha: 0, y: 20 });
    });

    // Animação de entrada do texto de uma cena (usada na linha do tempo e na abertura)
    function entradaDoTexto(p) {
      const tl = gsap.timeline();
      tl.to(p.etapa, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0);
      tl.to(p.palavras, { yPercent: 0, duration: 0.7, ease: "power3.out", stagger: 0.06 }, 0.05);
      tl.to(p.descricao, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.3);
      return tl;
    }

    /* ------------------------------------------------------
       7. A LINHA DO TEMPO DA ROLAGEM
       Cada cena = 1 unidade de tempo = 1 tela de rolagem.
       ------------------------------------------------------ */
    /* A linha do tempo tem "paradas": cada cena tem um ponto
       onde ela fica inteira na tela (cena 1 = 0, cena 2 = 1...).
       As transições acontecem ENTRE as paradas. E com o "snap",
       quando a pessoa para de rolar no meio de uma transição,
       o site termina o movimento sozinho até a parada mais
       próxima, no sentido em que ela estava rolando. Assim
       nunca fica parado num estado pela metade. */
    const ultima = cenas.length - 1;
    const SOBRA = 0.35;                 // um respiro na última cena antes de soltar o palco
    const total = ultima + SOBRA;
    const paradas = [];
    for (let i = 0; i <= ultima; i++) paradas.push(i / total);
    paradas.push(1);

    const linhaDoTempo = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: palco,
        start: "top top",
        end: "+=" + total * 100 + "%",  // 1 tela de rolagem por transição
        pin: true,
        scrub: 0.6,
        snap: {
          snapTo: paradas,
          directional: true,             // vai pra próxima parada no sentido da rolagem
          duration: { min: 0.5, max: 1 },
          delay: 0.08,
          ease: "power2.inOut",
          inertia: false
        },
        onUpdate: function (estado) {
          const posicao = Math.min(ultima, estado.progress * total);
          tocarSomente([Math.floor(posicao), Math.ceil(posicao)]);
        }
      }
    });

    // O aviso "Role para descobrir" some logo no começo da rolagem
    if (avisoRolar) linhaDoTempo.to(avisoRolar, { autoAlpha: 0, duration: 0.15 }, 0);

    pecas.forEach(function (p, i) {
      if (i === 0) return;
      const anterior = pecas[i - 1];
      const cena = cenas[i];
      const tipo = tipos[i] || "sobe";
      const t = i - 1; // a transição pra cena i acontece entre as paradas i-1 e i

      // 1) texto da cena anterior sai pra cima
      linhaDoTempo.to(anterior.texto, { autoAlpha: 0, y: -40, duration: 0.15, ease: "power2.in" }, t + 0.05);

      // 2) a cena anterior "passa pela câmera": cresce e escurece um pouco
      if (anterior.video) {
        linhaDoTempo.fromTo(anterior.video, { scale: 1, opacity: 1 }, { scale: 1.25, opacity: 0.6, duration: 0.5, ease: "power1.in" }, t + 0.15);
      }

      // 3) a cena nova entra com a máscara esfumaçada...
      linhaDoTempo.to(revelado[i], {
        r: 1,
        duration: 0.5,
        ease: "power2.inOut",
        onUpdate: function () { aplicarMascara(cena, tipo, revelado[i].r); }
      }, t + 0.2);

      // ...chegando "de perto" e se afastando até o tamanho normal
      if (p.video) {
        linhaDoTempo.fromTo(p.video, { scale: 1.3 }, { scale: 1, duration: 0.7, ease: "power2.out" }, t + 0.2);
      }

      // 4) texto da cena nova entra palavra por palavra e termina antes da parada
      linhaDoTempo.add(entradaDoTexto(p).timeScale(3.5), t + 0.62);
    });

    // Garante o tamanho certo da linha do tempo
    linhaDoTempo.set({}, {}, total);


    /* ------------------------------------------------------
       8. ABERTURA: O COPO ENCHENDO
       Enquanto o primeiro vídeo carrega, um copo enche de
       chope. Quando os dois terminam, a cortina sobe.
       ------------------------------------------------------ */
    function entrarNoSite() {
      tocarSomente([0, 1]);
      entradaDoTexto(pecas[0]);
    }

    if (!abertura) {
      entrarNoSite();
    } else {
      raiz.classList.add("travado");
      window.scrollTo(0, 0);

      // Peças do desenho
      const q = function (s) { return abertura.querySelector(s); };
      const vidro = q(".abertura__vidro");
      const nivel = q(".abertura__nivel");
      const liquido = q(".abertura__liquido");
      const onda = q(".abertura__onda");
      const jatos = abertura.querySelectorAll(".abertura__jato"); // [0] fora do copo, [1] dentro
      const alavanca = q(".abertura__alavanca");
      const respingos = q(".abertura__respingos");
      const gotinhas = abertura.querySelectorAll(".abertura__respingos circle");
      const coroa = q(".abertura__coroa");
      const bolasDeEspuma = abertura.querySelectorAll(".abertura__coroa circle");
      const escorre = q(".abertura__escorre");
      const marca = q(".abertura__marca");
      const frase = q(".abertura__frase");
      const textoFrase = q(".abertura__texto");
      const porcento = q(".abertura__porcento");

      // Espera o primeiro vídeo estar pronto (no máximo 5 segundos)
      const videoPronto = new Promise(function (resolver) {
        const v = videos[0];
        if (!v || v.readyState >= 3) return resolver();
        v.addEventListener("canplay", resolver, { once: true });
        v.addEventListener("error", resolver, { once: true });
        setTimeout(resolver, 5000);
        v.load();
      });

      /* O desenho inteiro é controlado por estes números.
         O GSAP só anima os números, e a função desenhar()
         escreve eles direto no SVG. Assim nenhuma peça sai
         do lugar, porque a gente diz exatamente onde ela fica. */
      const d = {
        giro: -25,      // inclinação do copo (graus)
        queda: -30,     // copo entrando de cima
        pulo: 0,        // pulinho do final
        nivel: 180,     // altura do chope (180 = vazio, 34 = cheio)
        onda: 0,        // espuma andando pro lado
        alavanca: 0,    // alavanca da torneira (graus)
        jatoTopo: -5,   // onde o jato começa
        jatoFundo: -5,  // onde o jato termina
        largura: 1,     // jato tremendo
        espuma: 0,      // colarinho (0 = nada, 1 = cheio)
        escorre: 0      // gota escorrendo
      };
      const raios = Array.from(bolasDeEspuma).map(function (c) { return parseFloat(c.getAttribute("r")); });
      const BOCA = 38; // altura onde o jato entra no copo

      function desenhar() {
        vidro.setAttribute("transform", "translate(0 " + (d.queda + d.pulo) + ") rotate(" + d.giro + " 60 40)");
        nivel.setAttribute("transform", "rotate(" + (-d.giro) + " 60 40)");
        liquido.setAttribute("transform", "translate(0 " + d.nivel + ")");
        onda.setAttribute("transform", "translate(" + d.onda + " 0)");
        alavanca.setAttribute("transform", "rotate(" + d.alavanca + " 60 -18)");

        // jato: um pedaço fora do copo e outro dentro (o vidro corta o resto)
        const w = 6 * d.largura;
        const x = 60 - w / 2;
        const foraTopo = d.jatoTopo;
        const foraFundo = Math.min(d.jatoFundo, BOCA + 2);
        const dentroTopo = Math.max(d.jatoTopo, BOCA);
        const dentroFundo = d.jatoFundo;
        [[jatos[0], foraTopo, foraFundo], [jatos[1], dentroTopo, dentroFundo]].forEach(function (p) {
          p[0].setAttribute("x", x);
          p[0].setAttribute("width", w);
          p[0].setAttribute("y", p[1]);
          p[0].setAttribute("height", Math.max(0, p[2] - p[1]));
        });

        bolasDeEspuma.forEach(function (c, i) {
          c.setAttribute("r", Math.max(0, raios[i] * d.espuma));
        });
        escorre.setAttribute("transform", "translate(0 " + (-10 * (1 - d.escorre)) + ")");
        escorre.style.opacity = d.escorre;
      }
      desenhar();
      gsap.set([jatos[0], jatos[1], coroa, escorre], { autoAlpha: 1 });
      gsap.set(vidro, { opacity: 0 });

      // Coisas que ficam repetindo enquanto enche
      const repetindo = [
        gsap.to(d, { onda: -40, duration: 0.9, ease: "none", repeat: -1, onUpdate: desenhar }),
        gsap.to(d, { largura: 0.7, duration: 0.08, ease: "sine.inOut", repeat: -1, yoyo: true })
      ];
      // respingos: cada gotinha pula pra cima e volta (anima a posição dela, sem giro nenhum)
      gotinhas.forEach(function (g, i) {
        const cx = parseFloat(g.getAttribute("cx"));
        const cy = parseFloat(g.getAttribute("cy"));
        repetindo.push(gsap.to(g, {
          attr: {
            cy: function () { return cy - 5 - Math.random() * 8; },
            cx: function () { return cx + (Math.random() - 0.5) * 10; }
          },
          duration: 0.2,
          ease: "power1.out",
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
          delay: i * 0.07
        }));
      });

      const contador = { valor: 0 };

      // a timeline começa pausada e só toca depois da confirmação de idade
      const enchendo = gsap.timeline({ paused: true, onUpdate: desenhar });
      idadeConfirmada.then(function () { enchendo.play(); });
      enchendo
        // Copo entra de cima, já inclinado
        .to(d, { queda: 0, duration: 0.6, ease: "back.out(1.6)" }, 0)
        .to(vidro, { opacity: 1, duration: 0.3 }, 0)
        .from([marca, frase], { autoAlpha: 0, y: 16, duration: 0.6, stagger: 0.12, ease: "power2.out" }, 0.2)

        // Alavanca desce e o jato cai até o fundo
        .to(d, { alavanca: 35, duration: 0.3, ease: "back.out(2)" }, 0.5)
        .to(d, { jatoFundo: 178, duration: 0.3, ease: "power2.in" }, 0.7)
        .set(respingos, { autoAlpha: 1 }, 0.95)

        // Enche, enquanto o copo endireita
        .to(d, { nivel: 34, duration: 2.2, ease: "power1.inOut" }, 0.9)
        .to(d, { giro: 0, duration: 2.0, ease: "power2.inOut" }, 1.0)
        .to(contador, {
          valor: 100,
          duration: 2.2,
          ease: "power1.inOut",
          onUpdate: function () { porcento.textContent = Math.round(contador.valor) + "%"; }
        }, 0.9)

        // Fecha a torneira: o jato "cai" e some
        .to(d, { alavanca: 0, duration: 0.3, ease: "power2.out" }, 3.0)
        .to(d, { jatoTopo: 178, duration: 0.25, ease: "power2.in" }, 3.0)
        .set(respingos, { autoAlpha: 0 }, 3.15)

        // Espuma sobe e transborda
        .to(d, { nivel: 28, duration: 0.4, ease: "power2.out" }, 3.05)
        .to(d, { espuma: 1, duration: 0.5, ease: "back.out(2.5)" }, 3.05)
        .to(d, { escorre: 1, duration: 0.7, ease: "power2.out" }, 3.3)

        // "Prost!" e pulinho de comemoração
        .add(function () {
          textoFrase.textContent = "Prost!";
          porcento.textContent = "";
        }, 3.35)
        .fromTo(frase, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, 3.35)
        .to(d, { pulo: -8, duration: 0.18, ease: "power2.out", yoyo: true, repeat: 1 }, 3.4);

      const terminouDeEncher = new Promise(function (resolver) {
        enchendo.eventCallback("onComplete", function () { setTimeout(resolver, 350); });
      });

      Promise.all([videoPronto, terminouDeEncher]).then(function () {
        repetindo.forEach(function (animacao) { animacao.kill(); });
        gsap.timeline({ onComplete: removerAbertura })
          .to(q(".abertura__conteudo"), { scale: 1.08, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, 0)
          .to(abertura, { clipPath: "inset(0% 0% 100% 0%)", webkitClipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "power3.inOut" }, 0.25)
          .add(function () {
            raiz.classList.remove("travado");
            entrarNoSite();
          }, 0.6);
      });
    }

    // Se a pessoa sair do modo animado, desfaz o palco
    return function () {
      cenas.forEach(function (cena) { palco.parentNode.insertBefore(cena, palco); });
      palco.remove();
    };
  });


  /* --------------------------------------------------------
     9. ELEMENTOS QUE SURGEM (cards e contato)
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

  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
  });
}


/* ==========================================================
   10. A LOJA: carrinho, pedido no WhatsApp, horário e agenda
   Essa parte não depende do GSAP: funciona sempre.
   ========================================================== */

/* ----- CONFIGURAÇÃO: troque aqui pra cada cliente ----- */
const LOJA = {
  // NÚMERO FICTÍCIO: 5500000000000 não existe, é só para fins de portfólio.
  // Num negócio real: 55 + DDD + número, só números
  whatsapp: "5500000000000",
  // Fuso horário da cervejaria: o "aberto/fechado" usa o relógio
  // DELA, não o de quem está visitando o site
  fuso: "America/Sao_Paulo",
  // Dias abertos: 0 = domingo, 1 = segunda ... 6 = sábado
  diasAbertos: [4, 5, 6],
  abre: 17,   // hora que abre
  fecha: 23   // hora que fecha
};

const NOMES_DOS_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/* DINHEIRO EM CENTAVOS
   Todo valor é guardado como número inteiro de centavos
   (R$ 16,00 vira 1600). Computador erra conta com vírgula
   (0,1 + 0,2 dá 0,30000000000000004), mas com inteiro não erra. */
function paraCentavos(texto) {
  return Math.round(parseFloat(String(texto).replace(",", ".")) * 100);
}

function emReais(centavos) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}


/* ----------------------------------------------------------
   10a. ABERTO AGORA / FECHADO
   ---------------------------------------------------------- */

// Que dia da semana e que horas são AGORA na cervejaria
function agoraNaLoja(data) {
  data = data || new Date();
  try {
    const partes = new Intl.DateTimeFormat("en-US", {
      timeZone: LOJA.fuso,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).formatToParts(data);
    const pega = function (tipo) {
      return partes.find(function (p) { return p.type === tipo; }).value;
    };
    const dias = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      dia: dias[pega("weekday")],
      minutos: (parseInt(pega("hour"), 10) % 24) * 60 + parseInt(pega("minute"), 10)
    };
  } catch (e) {
    // navegador muito antigo: usa o relógio do aparelho mesmo
    return { dia: data.getDay(), minutos: data.getHours() * 60 + data.getMinutes() };
  }
}

// agora = { dia: 0 a 6, minutos: minutos desde a meia-noite }
function calcularStatus(agora) {
  const abreMin = LOJA.abre * 60;
  const fechaMin = LOJA.fecha * 60;
  const abertoHoje = LOJA.diasAbertos.indexOf(agora.dia) !== -1;

  if (abertoHoje && agora.minutos >= abreMin && agora.minutos < fechaMin) {
    const faltam = fechaMin - agora.minutos;
    if (faltam <= 60) {
      return { tipo: "fechando", texto: "Aberto · fecha em " + faltam + " min" };
    }
    return { tipo: "aberto", texto: "Aberto agora · até " + LOJA.fecha + "h" };
  }

  if (abertoHoje && agora.minutos < abreMin) {
    return { tipo: "fechado", texto: "Fechado · abre hoje às " + LOJA.abre + "h" };
  }

  // procura o próximo dia aberto
  for (let i = 1; i <= 7; i++) {
    const proximo = (agora.dia + i) % 7;
    if (LOJA.diasAbertos.indexOf(proximo) !== -1) {
      const quando = i === 1 ? "amanhã" : NOMES_DOS_DIAS[proximo];
      return { tipo: "fechado", texto: "Fechado · abre " + quando + " às " + LOJA.abre + "h" };
    }
  }
  return { tipo: "fechado", texto: "Fechado" };
}

function atualizarStatus() {
  const status = calcularStatus(agoraNaLoja());
  document.querySelectorAll("[data-status]").forEach(function (el) {
    el.textContent = status.texto;
    el.classList.remove("status--aberto", "status--fechando", "status--fechado");
    el.classList.add("status--" + status.tipo);
  });
}

atualizarStatus();
setInterval(atualizarStatus, 60 * 1000);


/* ----------------------------------------------------------
   10b. AGENDA: destaca o evento de hoje (ou o próximo)
   ---------------------------------------------------------- */
(function marcarEventoDeHoje() {
  const eventos = Array.from(document.querySelectorAll(".evento[data-dia]"));
  if (eventos.length === 0) return;
  const hoje = agoraNaLoja().dia;

  // distância em dias até cada evento (0 = hoje)
  let melhor = null;
  let menorDistancia = 8;
  eventos.forEach(function (evento) {
    const distancia = (parseInt(evento.dataset.dia, 10) - hoje + 7) % 7;
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = evento;
    }
  });

  melhor.classList.add("evento--destaque");
  const selo = document.createElement("span");
  selo.className = "evento__selo";
  selo.textContent = menorDistancia === 0 ? "Hoje" : "Próximo";
  melhor.appendChild(selo);
})();


/* ----------------------------------------------------------
   10c. O CARRINHO
   ---------------------------------------------------------- */
(function carrinho() {
  const compras = Array.from(document.querySelectorAll(".cerveja__compra"));
  const barra = document.querySelector("[data-pedido]");
  const painel = document.querySelector("#painel-pedido");
  if (compras.length === 0 || !barra || !painel) return;

  const lista = painel.querySelector("[data-pedido-lista]");
  const vazio = painel.querySelector("[data-pedido-vazio]");
  const form = painel.querySelector("[data-pedido-form]");
  const erro = painel.querySelector("[data-pedido-erro]");
  const campoEndereco = painel.querySelector("[data-campo-endereco]");
  const botaoDaBarra = barra.querySelector(".pedido__barra");

  /* Cada produto da página é um "grupo". Produto com opções
     (growler e barril) tem um item por rótulo dentro do grupo.
     pedido = { "Remanso": { preco: 1600, qtd: 2 }, "Growler · Cheia": {...} }
     (preço em centavos) */
  const pedido = {};
  const grupoDaChave = {};

  const grupos = compras.map(function (c) {
    const card = c.closest(".cerveja");
    const opcoes = Array.from(card.querySelectorAll("[data-variante]"));
    const grupo = {
      compra: c,
      card: card,
      nome: c.dataset.produto,
      opcoes: opcoes,
      escolha: null,
      chaves: [],
      // data-limite no HTML muda o máximo. Vale pro produto inteiro,
      // somando os rótulos (ex.: no máximo 3 barris no total)
      limite: parseInt(c.dataset.limite, 10) || 20
    };
    if (opcoes.length) {
      opcoes.forEach(function (o) {
        const k = grupo.nome + " · " + o.dataset.variante;
        pedido[k] = { preco: paraCentavos(o.dataset.preco), qtd: 0 };
        grupo.chaves.push(k);
      });
      const marcada = opcoes.find(function (o) { return o.getAttribute("aria-checked") === "true"; }) || opcoes[0];
      grupo.escolha = marcada.dataset.variante;
    } else {
      pedido[grupo.nome] = { preco: paraCentavos(c.dataset.preco), qtd: 0 };
      grupo.chaves.push(grupo.nome);
    }
    grupo.chaves.forEach(function (k) { grupoDaChave[k] = grupo; });
    return grupo;
  });

  function chaveAtual(g) {
    return g.opcoes.length ? g.nome + " · " + g.escolha : g.nome;
  }

  function qtdDoGrupo(g) {
    return g.chaves.reduce(function (soma, k) { return soma + pedido[k].qtd; }, 0);
  }

  // preço da garrafa avulsa de um rótulo (pra calcular economia)
  function precoDaGarrafa(rotulo) {
    return pedido[rotulo] ? pedido[rotulo].preco : null;
  }

  function totais() {
    let itens = 0;
    let valor = 0; // centavos
    Object.keys(pedido).forEach(function (k) {
      itens += pedido[k].qtd;
      valor += pedido[k].qtd * pedido[k].preco;
    });
    return { itens: itens, valor: valor };
  }

  /* LINHA DE CONTA embaixo do preço (growler, kit, caixa, barril).
     É sempre CALCULADA a partir dos preços da página, nunca
     escrita na mão. Se um dia o preço do combo ficar mais caro
     que o avulso, a linha some sozinha em vez de mentir. */
  function textoDaConta(g) {
    const c = g.compra;
    const preco = pedido[chaveAtual(g)].preco;
    let base = null;
    let comparacao = "";

    if (c.dataset.compararGarrafas) {
      // growler: N garrafas de 500 ml do rótulo escolhido
      const n = parseInt(c.dataset.compararGarrafas, 10);
      const garrafa = precoDaGarrafa(g.escolha);
      if (garrafa !== null) { base = garrafa * n; comparacao = n + " garrafas"; }
    } else if (c.dataset.combo) {
      // kit e caixa: soma das garrafas que vêm dentro
      const precos = c.dataset.combo.split(",").map(function (s) { return precoDaGarrafa(s.trim()); });
      if (precos.every(function (p) { return p !== null; })) {
        base = precos.reduce(function (a, b) { return a + b; }, 0);
        comparacao = "Separadas";
      }
    } else if (c.dataset.litros) {
      // barril: quanto sai o litro
      return emReais(Math.round(preco / parseFloat(c.dataset.litros))) + " o litro";
    }

    if (base === null) return "";
    const economia = base - preco;
    if (economia <= 0) {
      console.warn("Atenção: " + chaveAtual(g) + " não está mais barato que " + comparacao + ".");
      return "";
    }
    return comparacao + ": " + emReais(base) + " · economia de " + emReais(economia);
  }

  // monta o copinho das cervejas: chope, espuma e o jato que cai quando adiciona
  grupos.forEach(function (g) {
    const copo = g.card.querySelector(".cerveja__copo");
    if (copo) copo.innerHTML = '<span class="copo__jato"></span><span class="copo__chope"></span><span class="copo__espuma"></span>';
  });

  function mudar(chave, quanto) {
    const item = pedido[chave];
    const g = grupoDaChave[chave];
    if (!item || !g) return;
    if (quanto > 0 && qtdDoGrupo(g) >= g.limite) return; // chegou no máximo
    const novo = Math.max(0, item.qtd + quanto);
    if (novo === item.qtd) return;
    item.qtd = novo;
    desenhar();
    if (quanto > 0) {
      // jatinho de chope no copo do card
      const copo = g.card.querySelector(".cerveja__copo");
      if (copo) {
        copo.classList.remove("copo--servindo");
        void copo.offsetWidth; // reinicia a animação
        copo.classList.add("copo--servindo");
      }
      barra.classList.remove("pedido--pulou");
      void barra.offsetWidth; // reinicia a animação do pulinho
      barra.classList.add("pedido--pulou");
    }
  }

  function desenhar() {
    const t = totais();

    // cards
    grupos.forEach(function (g) {
      const c = g.compra;
      const item = pedido[chaveAtual(g)];
      const noGrupo = qtdDoGrupo(g);

      if (g.opcoes.length) {
        // marca a opção escolhida e mostra quanto já tem de cada rótulo (ex.: "Cheia · 2")
        g.opcoes.forEach(function (o) {
          const escolhida = o.dataset.variante === g.escolha;
          const qtdOpcao = pedido[g.nome + " · " + o.dataset.variante].qtd;
          o.setAttribute("aria-checked", escolhida ? "true" : "false");
          o.tabIndex = escolhida ? 0 : -1;
          o.textContent = o.dataset.variante + (qtdOpcao > 0 ? " · " + qtdOpcao : "");
        });
        // preço do rótulo escolhido: reais e centavos separados
        const reais = Math.floor(item.preco / 100);
        const centavos = item.preco % 100;
        const precoTexto = c.querySelector("[data-preco-texto]");
        const precoCentavos = c.querySelector("[data-preco-centavos]");
        if (precoTexto) precoTexto.textContent = "R$ " + reais.toLocaleString("pt-BR");
        if (precoCentavos) precoCentavos.textContent = "," + String(centavos).padStart(2, "0");
        c.querySelector('[data-acao="mais"]').setAttribute("aria-label", "Adicionar " + g.nome + " de " + g.escolha);
        c.querySelector('[data-acao="menos"]').setAttribute("aria-label", "Tirar " + g.nome + " de " + g.escolha);
      }

      const conta = c.querySelector("[data-conta]");
      if (conta) conta.textContent = textoDaConta(g);

      c.querySelector(".quantidade__numero").textContent = item.qtd;
      c.querySelector('[data-acao="menos"]').disabled = item.qtd === 0;
      c.querySelector('[data-acao="mais"]').disabled = noGrupo >= g.limite;
      g.card.classList.toggle("cerveja--no-pedido", noGrupo > 0);

      // copinho: 1 = metade, 2 = quase cheio, 3 ou mais = cheio
      const copo = g.card.querySelector(".cerveja__copo");
      if (copo) {
        const niveis = [0, 0.5, 0.7, 0.85];
        copo.style.setProperty("--enchimento", item.qtd >= niveis.length ? 0.85 : niveis[item.qtd]);
        copo.style.setProperty("--espuma", item.qtd > 0 ? 1 : 0);
      }
    });

    // barra
    barra.classList.toggle("pedido--visivel", t.itens > 0 && painel.hidden);
    raiz.classList.toggle("tem-pedido", t.itens > 0);
    barra.querySelector("[data-pedido-contagem]").textContent = t.itens + (t.itens === 1 ? " item" : " itens");
    document.querySelectorAll("[data-pedido-total]").forEach(function (el) {
      el.textContent = emReais(t.valor);
    });

    // lista do painel
    lista.innerHTML = "";
    Object.keys(pedido).forEach(function (nome) {
      const item = pedido[nome];
      if (item.qtd === 0) return;
      const g = grupoDaChave[nome];
      const li = document.createElement("li");
      li.className = "painel__item";

      const nomeEl = document.createElement("span");
      nomeEl.className = "painel__item-nome";
      nomeEl.textContent = nome;
      const unidade = document.createElement("small");
      unidade.textContent = emReais(item.preco) + " cada";
      nomeEl.appendChild(unidade);

      const qtd = document.createElement("div");
      qtd.className = "quantidade";
      qtd.innerHTML =
        '<button type="button" class="quantidade__botao" aria-label="Tirar uma">&minus;</button>' +
        '<span class="quantidade__numero">' + item.qtd + "</span>" +
        '<button type="button" class="quantidade__botao" aria-label="Adicionar uma">+</button>';
      const botoes = qtd.querySelectorAll("button");
      botoes[0].addEventListener("click", function () { mudar(nome, -1); });
      botoes[1].addEventListener("click", function () { mudar(nome, 1); });
      botoes[1].disabled = qtdDoGrupo(g) >= g.limite;

      const valor = document.createElement("span");
      valor.className = "painel__item-valor";
      valor.textContent = emReais(item.qtd * item.preco);

      li.append(nomeEl, qtd, valor);
      lista.appendChild(li);
    });
    vazio.hidden = t.itens > 0;
  }

  // opções de rótulo (growler e barril): clique e setinhas do teclado
  grupos.forEach(function (g) {
    g.opcoes.forEach(function (o, i) {
      o.addEventListener("click", function () {
        g.escolha = o.dataset.variante;
        desenhar();
      });
      o.addEventListener("keydown", function (e) {
        let alvo = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") alvo = g.opcoes[(i + 1) % g.opcoes.length];
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") alvo = g.opcoes[(i - 1 + g.opcoes.length) % g.opcoes.length];
        if (alvo) { e.preventDefault(); alvo.click(); alvo.focus(); }
      });
    });
  });

  // botões + e − dos cards
  grupos.forEach(function (g) {
    g.compra.addEventListener("click", function (e) {
      const botao = e.target.closest("[data-acao]");
      if (!botao) return;
      mudar(chaveAtual(g), botao.dataset.acao === "mais" ? 1 : -1);
    });
  });

  /* ----- abrir e fechar o painel ----- */
  let quemAbriu = null;

  function abrir(origem) {
    quemAbriu = origem || null;
    painel.hidden = false;
    raiz.classList.add("painel-aberto");
    botaoDaBarra.setAttribute("aria-expanded", "true");
    desenhar();
    const primeiro = form.querySelector('input[name="nome"]');
    setTimeout(function () { primeiro.focus(); }, 50);
  }

  function fechar() {
    painel.hidden = true;
    raiz.classList.remove("painel-aberto");
    botaoDaBarra.setAttribute("aria-expanded", "false");
    desenhar();
    if (quemAbriu) quemAbriu.focus();
  }

  // "Fazer pedido" do topo: se já tem item, abre o painel; senão, vai pras cervejas
  document.querySelectorAll("[data-abrir-pedido]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (totais().itens === 0 && el.tagName === "A") return; // segue o link #cervejas
      e.preventDefault();
      abrir(el);
    });
  });

  painel.querySelectorAll("[data-fechar-pedido]").forEach(function (el) {
    el.addEventListener("click", function () { fechar(); });
  });

  document.addEventListener("keydown", function (e) {
    if (painel.hidden) return;
    if (e.key === "Escape") fechar();
    // mantém o Tab dentro do painel
    if (e.key === "Tab") {
      const focaveis = painel.querySelectorAll("button, a[href], input, textarea");
      const visiveis = Array.from(focaveis).filter(function (el) { return el.offsetParent !== null; });
      const primeiro = visiveis[0];
      const ultimo = visiveis[visiveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  });

  // mostra o campo de endereço só quando escolhe "Entrega"
  form.addEventListener("change", function (e) {
    if (e.target.name !== "entrega") return;
    const entrega = e.target.value === "Entrega";
    campoEndereco.hidden = !entrega;
    campoEndereco.querySelector("input").required = entrega;
  });

  /* ----- montar a mensagem e abrir o WhatsApp ----- */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    erro.textContent = "";
    form.querySelectorAll(".campo--erro").forEach(function (c) { c.classList.remove("campo--erro"); });

    const t = totais();
    const dados = new FormData(form);
    const nome = (dados.get("nome") || "").trim();
    const entrega = dados.get("entrega");
    const endereco = (dados.get("endereco") || "").trim();
    const horario = (dados.get("horario") || "").trim();
    const obs = (dados.get("obs") || "").trim();

    if (t.itens === 0) { erro.textContent = "Escolha pelo menos uma cerveja."; return; }
    if (!nome) {
      erro.textContent = "Coloca teu nome pra gente saber de quem é o pedido.";
      form.querySelector('input[name="nome"]').closest(".campo").classList.add("campo--erro");
      form.querySelector('input[name="nome"]').focus();
      return;
    }
    if (entrega === "Entrega" && !endereco) {
      erro.textContent = "Coloca o endereço da entrega.";
      campoEndereco.classList.add("campo--erro");
      campoEndereco.querySelector("input").focus();
      return;
    }

    const linhas = ["Olá! Quero fazer um pedido 🍺", ""];
    Object.keys(pedido).forEach(function (n) {
      const item = pedido[n];
      if (item.qtd > 0) linhas.push("• " + item.qtd + "x " + n + " (" + emReais(item.qtd * item.preco) + ")");
    });
    linhas.push("", "*Total: " + emReais(t.valor) + "*", "");
    linhas.push(entrega === "Entrega" ? "🛵 Entrega: " + endereco : "🏠 Vou retirar na taproom");
    linhas.push("Nome: " + nome);
    if (horario) linhas.push("Pra quando: " + horario);
    if (obs) linhas.push("Obs.: " + obs);

    const link = "https://wa.me/" + LOJA.whatsapp + "?text=" + encodeURIComponent(linhas.join("\n"));
    window.open(link, "_blank", "noopener");
  });

  desenhar();
})();



/* ----------------------------------------------------------
   10d. ABAS DO CARDÁPIO
   Clique troca a categoria; setinhas do teclado também.
   ---------------------------------------------------------- */
(function abas() {
  const lista = document.querySelector(".abas");
  if (!lista) return;
  const botoes = Array.from(lista.querySelectorAll('[role="tab"]'));

  function escolher(botao, focar) {
    botoes.forEach(function (b) {
      const ativo = b === botao;
      b.setAttribute("aria-selected", ativo ? "true" : "false");
      b.tabIndex = ativo ? 0 : -1;
      const painel = document.getElementById(b.getAttribute("aria-controls"));
      if (!painel) return;
      painel.hidden = !ativo;
      if (ativo) {
        painel.classList.remove("cardapio__painel--entrando");
        void painel.offsetWidth; // reinicia a animação de entrada
        painel.classList.add("cardapio__painel--entrando");
      }
    });
    if (focar) botao.focus();
    // a altura da página mudou: avisa o ScrollTrigger pra recalcular
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  botoes.forEach(function (botao, i) {
    botao.addEventListener("click", function () { escolher(botao, false); });
    botao.addEventListener("keydown", function (e) {
      let alvo = null;
      if (e.key === "ArrowRight") alvo = botoes[(i + 1) % botoes.length];
      if (e.key === "ArrowLeft") alvo = botoes[(i - 1 + botoes.length) % botoes.length];
      if (e.key === "Home") alvo = botoes[0];
      if (e.key === "End") alvo = botoes[botoes.length - 1];
      if (alvo) { e.preventDefault(); escolher(alvo, true); }
    });
  });
})();

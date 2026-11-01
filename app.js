/* Lasanhada · página de pedidos */
(function () {
  "use strict";
  var C = window.LASANHADA;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var money = function (v) { return "R$ " + v.toFixed(2).replace(".", ","); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- fornada (horário de Londrina) ---------- */
  function agoraSP() {
    var p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return { base: Date.UTC(+p.year, +p.month - 1, +p.day), dow: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), h: +p.hour };
  }
  function soma(base, d) { return new Date(base + d * 864e5); }
  function ddmm(d) { return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0"); }
  function iso(d) { return d.toISOString().slice(0, 10); }

  var TESTE = /[?&]teste\b/.test(location.search) || location.hash === "#teste";
  var api = { vendidas: null };
  function fornada() {
    var n = agoraSP(), dow = n.dow, F = C.fechamento;
    var aberto = (dow >= 1 && dow < F.diaSemana) || (dow === F.diaSemana && n.h < F.hora);
    if (C.status === "aberto" || TESTE) aberto = true;
    if (C.status === "fechado") aberto = false;
    var est = aberto ? ((dow === F.diaSemana && n.h >= 14 && !TESTE) ? "urgente" : "aberto") : "fechado";
    if (C.status === "esgotado" || (api.vendidas !== null && api.vendidas >= C.capacidade)) est = "esgotado";
    var f = { estado: est, podePedir: est === "aberto" || est === "urgente" };
    if (aberto) { var s = (6 - dow + 7) % 7; f.sab = soma(n.base, s); f.dom = soma(n.base, s + 1); }
    else { var g = dow === 0 ? 1 : 8 - dow; f.seg = soma(n.base, g); f.sab = soma(n.base, g + 5); f.dom = soma(n.base, g + 6); }
    if (api.vendidas !== null) f.restam = Math.max(0, C.capacidade - api.vendidas);
    return f;
  }
  function pintaFornada() {
    var f = fornada(), pill = $("#pill-status"), dot = $("#fornada-dot"), txt;
    var cls = f.estado === "urgente" ? "urgente" : (f.podePedir ? "aberto" : "fechado");
    pill.className = "status-pill " + cls; dot.className = "dot " + cls;
    var resto = (f.restam !== undefined && f.restam <= 10 && f.podePedir) ? " Restam " + f.restam + "." : "";
    if (f.estado === "aberto") { pill.textContent = "Pedidos abertos"; txt = "Fornada de sáb " + ddmm(f.sab) + " e dom " + ddmm(f.dom) + "." + resto; }
    else if (f.estado === "urgente") { pill.textContent = "Fecha hoje, 20h"; txt = "Últimas horas pra fornada de sáb " + ddmm(f.sab) + " e dom " + ddmm(f.dom) + "." + resto; }
    else if (f.estado === "esgotado") { pill.textContent = "Esgotou!"; txt = "As " + C.capacidade + " lasanhas da semana já têm dono." + (f.seg ? " Próxima fornada abre segunda, " + ddmm(f.seg) + "." : ""); }
    else { pill.textContent = "Pedidos fechados"; txt = "Essa fornada já tá no forno. A próxima abre segunda, " + ddmm(f.seg) + "."; }
    $("#fornada-txt").textContent = txt;
    var ban = $("#closed-banner");
    ban.hidden = f.podePedir;
    if (!f.podePedir) ban.innerHTML = "<b>" + pill.textContent + "</b>" + txt;
    $("#btn-finalizar").disabled = !f.podePedir;
    pintaDias(f);
    return f;
  }
  function pintaDias(f) {
    var atual = (document.querySelector("input[name=dia]:checked") || {}).value;
    $("#dias").innerHTML = [["Sábado", f.sab], ["Domingo", f.dom]].map(function (o, i) {
      var v = iso(o[1]);
      return '<label class="chip"><input type="radio" name="dia" id="f-dia-' + i + '" value="' + v + '" data-txt="' + o[0] + " " + ddmm(o[1]) + '"' + (atual === v ? " checked" : "") + '><span><b>' + o[0] + '</b><small>' + ddmm(o[1]) + '</small></span></label>';
    }).join("");
  }

  /* ---------- cardápio ---------- */
  var sabNome = {}; C.cardapio.sabores.forEach(function (s) { sabNome[s.id] = s.nome; });
  var tamPor = {}; C.cardapio.tamanhos.forEach(function (t) { tamPor[t.id] = t; });
  function seg(nome) {
    return '<div class="seg" role="radiogroup">' + C.cardapio.sabores.map(function (s, i) {
      return '<label><input type="radio" name="' + nome + '" id="' + nome + '-' + s.id + '" value="' + s.id + '"' + (i ? "" : " checked") + '><span>' + s.nome + '</span></label>';
    }).join("") + "</div>";
  }
  $("#tamanhos").innerHTML = C.cardapio.tamanhos.map(function (t) {
    var picks = t.sabores === 1 ? seg("sab-" + t.id)
      : '<div><p class="pick-label">1ª lasanha</p>' + seg("sab-" + t.id + "-1") + '</div><div><p class="pick-label">2ª lasanha</p>' + seg("sab-" + t.id + "-2") + "</div>";
    var r = Math.floor(t.preco), c = String(Math.round((t.preco - r) * 100)).padStart(2, "0");
    return '<article class="tam' + (t.id === "familia" ? " destaque" : "") + '" data-id="' + t.id + '">' +
      (t.id === "familia" ? '<span class="tam-badge">dá pra misturar!</span>' : "") +
      '<div class="tam-head"><div><h3>' + t.nome + '</h3><span class="comp">' + t.comp + '</span></div><div class="preco"><small>R$</small> ' + r + "<small>," + c + "</small></div></div>" +
      picks +
      '<div class="tam-foot"><div class="qty"><button type="button" data-q="-1" aria-label="Menos">−</button><output>1</output><button type="button" data-q="1" aria-label="Mais">+</button></div>' +
      '<button type="button" class="btn btn-red add">Adicionar</button></div><div class="add-ok" aria-live="polite"></div></article>';
  }).join("");
  $$(".tam").forEach(function (card) {
    var id = card.dataset.id, out = card.querySelector("output");
    card.querySelectorAll("[data-q]").forEach(function (b) {
      b.addEventListener("click", function () { out.textContent = Math.max(1, Math.min(10, +out.textContent + +b.dataset.q)); });
    });
    card.querySelector(".add").addEventListener("click", function () {
      var t = tamPor[id], sab = [];
      if (t.sabores === 1) sab.push(card.querySelector('input[name="sab-' + id + '"]:checked').value);
      else for (var i = 1; i <= t.sabores; i++) sab.push(card.querySelector('input[name="sab-' + id + "-" + i + '"]:checked').value);
      addCarrinho(id, sab, +out.textContent); out.textContent = "1";
      var ok = card.querySelector(".add-ok"); ok.textContent = "foi pra sacola ✓"; ok.classList.add("show");
      setTimeout(function () { ok.classList.remove("show"); }, 1500);
    });
  });

  /* ---------- sacola ---------- */
  var carrinho = store.get("lz-carrinho", []).filter(function (i) { return tamPor[i.id]; });
  function chave(i) { return i.id + ":" + i.sab.slice().sort().join("+"); }
  function addCarrinho(id, sab, q) {
    var k = chave({ id: id, sab: sab }), ex = carrinho.filter(function (i) { return chave(i) === k; })[0];
    if (ex) ex.q = Math.min(20, ex.q + q); else carrinho.push({ id: id, sab: sab, q: q });
    salva(); var c = $("#cart-count"); c.classList.remove("pop"); void c.offsetWidth; c.classList.add("pop");
  }
  function salva() { store.set("lz-carrinho", carrinho); pintaSacola(); }
  function sabTexto(i) {
    if (i.sab.length === 1) return sabNome[i.sab[0]];
    return i.sab[0] === i.sab[1] ? "2 × " + sabNome[i.sab[0]] : i.sab.map(function (s) { return sabNome[s]; }).join(" + ");
  }
  function subtotal() { return carrinho.reduce(function (a, i) { return a + tamPor[i.id].preco * i.q; }, 0); }
  function nLasanhas() { return carrinho.reduce(function (a, i) { return a + tamPor[i.id].lasanhas * i.q; }, 0); }
  function nItens() { return carrinho.reduce(function (a, i) { return a + i.q; }, 0); }
  function pintaSacola() {
    $("#itens").innerHTML = carrinho.map(function (i, k) {
      var t = tamPor[i.id];
      return '<li class="item"><span class="item-nome">' + t.nome + '</span><span class="item-sab">' + sabTexto(i) + '</span>' +
        '<span class="item-ctrl"><button type="button" data-k="' + k + '" data-d="-1" aria-label="Tirar um">−</button><span>' + i.q + '</span><button type="button" data-k="' + k + '" data-d="1" aria-label="Pôr mais um">+</button></span>' +
        '<span class="item-preco">' + money(t.preco * i.q) + "</span></li>";
    }).join("");
    $("#vazio").hidden = carrinho.length > 0;
    var n = nItens(), cc = $("#cart-count"); cc.hidden = !n; cc.textContent = n;
    pintaTotais();
  }
  $("#itens").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-k]"); if (!b) return;
    var i = carrinho[+b.dataset.k]; i.q += +b.dataset.d;
    if (i.q <= 0) carrinho.splice(+b.dataset.k, 1);
    salva();
  });

  /* ---------- entrega ou retirada ---------- */
  function tipo() { return document.querySelector("input[name=tipo]:checked").value; }
  var frete = { estado: "idle" }; // idle | calc | ok | fora | pendente
  function trocaTipo() {
    var r = tipo() === "retirada";
    $("#box-entrega").hidden = r; $("#box-retirada").hidden = !r;
    $("#t-frete-l").textContent = r ? "Retirada" : "Entrega";
    pintaTotais();
  }
  $$("input[name=tipo]").forEach(function (x) { x.addEventListener("change", trocaTipo); });

  function taxaAtual() { return tipo() === "retirada" ? 0 : (frete.estado === "ok" ? frete.taxa : null); }
  function pintaTotais() {
    var sub = subtotal(), dd = $("#t-frete"), tx = taxaAtual(), retirada = tipo() === "retirada";
    $("#t-sub").textContent = money(sub);
    dd.className = "";
    if (retirada) dd.textContent = "grátis";
    else if (frete.estado === "ok") dd.textContent = money(frete.taxa);
    else {
      dd.className = "calc";
      dd.textContent = { idle: "coloque o CEP e o número", calc: "calculando…", fora: "fora da área", pendente: "a confirmar no WhatsApp" }[frete.estado];
    }
    $("#t-total").textContent = money(sub + (tx || 0));
    pintaFloat();
  }

  var end = { rua: "", bairro: "", cidadeOk: true };
  function enderecoTexto() {
    var rua = end.rua || $("#f-rua").value.trim(), bairro = end.bairro || $("#f-bairro").value.trim();
    return { rua: rua, bairro: bairro, num: $("#f-num").value.trim(), comp: $("#f-comp").value.trim(), cep: $("#f-cep").value.trim() };
  }
  var timer, seq = 0;
  function agendaFrete() { clearTimeout(timer); timer = setTimeout(calcula, 600); }
  function calcula() {
    var e = enderecoTexto();
    if (!end.cidadeOk) { frete = { estado: "fora" }; return pintaTotais(); }
    if (!e.rua || !e.num) { frete = { estado: "idle" }; return pintaTotais(); }
    if (!C.apiUrl) { frete = { estado: "pendente" }; return pintaTotais(); }
    var s = ++seq; frete = { estado: "calc" }; pintaTotais();
    postApi({ action: "frete", endereco: busca(e) }).then(function (r) {
      if (s !== seq) return;
      if (r.ok && r.disponivel) frete = { estado: "ok", taxa: r.taxa };
      else if (r.ok) frete = { estado: "fora" };
      else frete = { estado: "pendente" };
      pintaTotais(); avisoFora();
    }).catch(function () { if (s === seq) { frete = { estado: "pendente" }; pintaTotais(); } });
  }
  function busca(e) { return e.rua + ", " + e.num + (e.bairro ? " - " + e.bairro : "") + ", Londrina - PR" + (e.cep ? ", " + e.cep : ""); }
  function avisoFora() {
    var a = $("#end-achado");
    if (frete.estado === "fora") { a.hidden = false; a.className = "end-achado erro"; a.textContent = "Esse endereço fica fora da nossa área de entrega (até 6 km do Centro). Que tal escolher Retirada?"; }
  }
  function postApi(o) {
    return fetch(C.apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(o) }).then(function (r) { return r.json(); });
  }

  $("#f-cep").addEventListener("input", function (ev) {
    var d = ev.target.value.replace(/\D/g, "").slice(0, 8), a = $("#end-achado");
    ev.target.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
    if (d.length !== 8) { end.rua = ""; end.bairro = ""; end.cidadeOk = true; a.hidden = true; agendaFrete(); return; }
    fetch("https://viacep.com.br/ws/" + d + "/json/").then(function (r) { return r.json(); }).then(function (j) {
      a.hidden = false;
      if (j.erro) { a.className = "end-achado erro"; a.textContent = "Não achamos esse CEP. Confere ou preenche a rua."; $("#manual").hidden = false; return; }
      end.cidadeOk = /londrina/i.test(j.localidade || "");
      end.rua = j.logradouro || ""; end.bairro = j.bairro || "";
      if (!end.cidadeOk) { a.className = "end-achado erro"; a.textContent = "Esse CEP é de " + j.localidade + ". Por enquanto só entregamos em Londrina."; }
      else if (!end.rua) { a.className = "end-achado"; a.textContent = "CEP geral de Londrina. Preenche a rua e o bairro."; $("#manual").hidden = false; }
      else { a.className = "end-achado"; a.textContent = "📍 " + end.rua + (end.bairro ? ", " + end.bairro : ""); $("#f-num").focus(); }
      agendaFrete();
    }).catch(function () { $("#manual").hidden = false; agendaFrete(); });
  });
  ["#f-num", "#f-rua", "#f-bairro"].forEach(function (s) { $(s).addEventListener("input", agendaFrete); });
  $("#sem-cep").addEventListener("click", function () { $("#manual").hidden = false; end.rua = ""; end.bairro = ""; $("#f-rua").focus(); });

  $("#f-whats").addEventListener("input", function (ev) {
    var d = ev.target.value.replace(/\D/g, "").slice(0, 11), f = d;
    if (d.length > 2) f = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 7) f = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    ev.target.value = f;
  });
  $("#f-hora").innerHTML = '<option value="">Escolha o horário</option>' + C.horarios.map(function (h) { return "<option>" + h + "</option>"; }).join("");

  // lembra os dados do cliente neste aparelho
  var campos = ["f-nome", "f-whats", "f-cep", "f-num", "f-comp"], salvo = store.get("lz-cliente", {});
  campos.forEach(function (id) {
    if (salvo[id]) $("#" + id).value = salvo[id];
    $("#" + id).addEventListener("change", function () { var o = {}; campos.forEach(function (c) { o[c] = $("#" + c).value; }); store.set("lz-cliente", o); });
  });

  /* ---------- Pix com valor ---------- */
  function emv(id, v) { return id + String(v.length).padStart(2, "0") + v; }
  function limpa(s, n) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").toUpperCase().slice(0, n); }
  function crc16(s) {
    var c = 0xffff;
    for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff; }
    return c.toString(16).toUpperCase().padStart(4, "0");
  }
  function pix(valor, txid) {
    var p = emv("00", "01") + emv("26", emv("00", "br.gov.bcb.pix") + emv("01", C.pix.chave)) + emv("52", "0000") + emv("53", "986") +
      emv("54", valor.toFixed(2)) + emv("58", "BR") + emv("59", limpa(C.pix.nome, 25)) + emv("60", limpa(C.pix.cidade, 15)) +
      emv("62", emv("05", limpa(txid, 25).replace(/ /g, "") || "***")) + "6304";
    return p + crc16(p);
  }

  /* ---------- fechar pedido ---------- */
  function erro(msg, el) {
    var e = $("#form-erro"); e.textContent = msg; e.hidden = false;
    if (el) { el.classList.add("invalido"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    return false;
  }
  $$("#form-pedido input, #form-pedido select").forEach(function (i) {
    i.addEventListener("input", function () { $("#form-erro").hidden = true; var x = i.closest(".invalido") || (i.classList.contains("invalido") && i); if (x) x.classList.remove("invalido"); });
    i.addEventListener("change", function () { var x = i.closest(".chips.invalido"); if (x) x.classList.remove("invalido"); });
  });
  function valida(f) {
    $("#form-erro").hidden = true;
    if (!f.podePedir) return erro("Os pedidos dessa fornada estão fechados.");
    if (!carrinho.length) return erro("Sua sacola tá vazia. Escolhe uma lasanha ali em cima.", $("#cardapio"));
    if (f.restam !== undefined && nLasanhas() > f.restam) return erro("Só restam " + f.restam + " lasanhas nessa fornada.");
    if (tipo() === "entrega") {
      var e = enderecoTexto();
      if (!e.rua) return erro("Coloca o CEP (ou a rua) pra gente achar seu endereço.", $("#f-cep"));
      if (!e.num) return erro("Falta o número da casa.", $("#f-num"));
      if (frete.estado === "fora") return erro("Esse endereço fica fora da área de entrega. Escolhe Retirada.");
      if (frete.estado === "calc") return erro("Só um segundo, estamos calculando a entrega.");
    }
    if (!document.querySelector("input[name=dia]:checked")) return erro("Escolhe o dia: sábado ou domingo.", $("#dias"));
    if (!$("#f-hora").value) return erro("Escolhe o horário.", $("#f-hora"));
    if (!document.querySelector("input[name=modo]:checked")) return erro("Congelada ou quentinha?", $("#f-modo-c").closest(".chips"));
    if ($("#f-nome").value.trim().length < 2) return erro("Coloca seu nome.", $("#f-nome"));
    if ($("#f-whats").value.replace(/\D/g, "").length < 10) return erro("Coloca seu WhatsApp com DDD.", $("#f-whats"));
    return true;
  }
  function montaPedido() {
    var t = tipo(), e = enderecoTexto(), dia = document.querySelector("input[name=dia]:checked");
    return {
      tipo: t, itens: carrinho.map(function (i) { return { id: i.id, sab: i.sab, q: i.q }; }),
      itensTexto: carrinho.map(function (i) { return i.q + "× " + tamPor[i.id].nome + " (" + sabTexto(i) + ")"; }).join("; "),
      subtotal: +subtotal().toFixed(2), lasanhas: nLasanhas(),
      nome: $("#f-nome").value.trim(), whats: $("#f-whats").value.trim(),
      endereco: t === "entrega" ? e.rua + ", " + e.num + (e.comp ? " (" + e.comp + ")" : "") + (e.bairro ? " - " + e.bairro : "") + (e.cep ? " · " + e.cep : "") : "",
      enderecoBusca: t === "entrega" ? busca(e) : "", bairro: e.bairro,
      dataEntrega: dia.value, diaTexto: dia.dataset.txt, hora: $("#f-hora").value,
      modo: document.querySelector("input[name=modo]:checked").value, obs: $("#f-obs").value.trim()
    };
  }
  function codigoLocal() { return "LAS-" + ddmm(new Date(agoraSP().base)).replace("/", "") + "-" + Math.random().toString(36).slice(2, 5).toUpperCase(); }

  function mensagem(p, cod, taxa, total, pago) {
    var L = ["Oi, Lasanhada! 🍅 Pedido *" + cod + "*", ""];
    carrinho.forEach(function (i) { L.push("• " + i.q + "× " + tamPor[i.id].nome + " (" + sabTexto(i) + ")"); });
    L.push("", (p.tipo === "entrega" ? "🛵 Entrega: " : "🏠 Retirada: ") + p.diaTexto + ", " + p.hora);
    if (p.tipo === "entrega") L.push("📍 " + p.endereco);
    L.push(p.modo + " · " + p.nome + " · " + p.whats);
    if (p.obs) L.push("Recado: " + p.obs);
    L.push("", "Lasanhas: " + money(p.subtotal));
    if (p.tipo === "entrega") L.push("Entrega: " + (taxa !== null ? money(taxa) : "a confirmar"));
    L.push("*Total: " + money(total) + (taxa === null ? " + entrega*" : "*"), "");
    L.push(pago ? "Já fiz o Pix, segue o comprovante 👇" : "Me passa a taxa de entrega e o Pix do total, por favor?");
    return L.join("\n");
  }
  function zap(t) { return "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(t); }

  var modal = $("#modal");
  $("#modal-x").addEventListener("click", function () { modal.close(); });
  modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });

  $("#form-pedido").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = fornada(); if (!valida(f)) return;
    var p = montaPedido(), btn = $("#btn-finalizar"), tx = taxaAtual();
    if (!C.apiUrl) return mostra(p, codigoLocal(), tx, p.subtotal + (tx || 0));
    btn.disabled = true; btn.textContent = "Anotando…";
    postApi(Object.assign({ action: "pedido" }, p)).then(function (r) {
      btn.disabled = false; btn.textContent = "Fazer pedido";
      if (!r.ok) {
        if (r.erro === "esgotado") { api.vendidas = C.capacidade - (r.restam || 0); pintaFornada(); return erro(r.restam ? "Só restam " + r.restam + " lasanhas nessa fornada." : "Essa fornada acabou de esgotar."); }
        if (r.erro === "fora") { frete = { estado: "fora" }; pintaTotais(); avisoFora(); return erro("Esse endereço fica fora da área de entrega. Escolhe Retirada."); }
        if (r.erro === "fechado") return erro("Os pedidos dessa fornada estão fechados.");
        return mostra(p, codigoLocal(), tx, p.subtotal + (tx || 0));
      }
      if (p.tipo === "entrega" && typeof r.taxa === "number") { frete = { estado: "ok", taxa: r.taxa }; pintaTotais(); }
      mostra(p, r.codigo, p.tipo === "retirada" ? 0 : (typeof r.taxa === "number" ? r.taxa : null), r.total);
    }).catch(function () {
      btn.disabled = false; btn.textContent = "Fazer pedido";
      mostra(p, codigoLocal(), tx, p.subtotal + (tx || 0));
    });
  });

  function mostra(p, cod, taxa, total) {
    var body = $("#m-body");
    if (taxa !== null) {
      var payload = pix(total, cod), qr = qrcode(0, "M"); qr.addData(payload); qr.make();
      body.innerHTML =
        '<img class="m-art" src="img/st-ela-marmita.webp" alt="">' +
        '<h2 class="m-title" id="m-t">Pedido anotado!</h2><span class="m-code">' + cod + "</span>" +
        '<p class="m-lead">Paga o Pix e manda o comprovante. Pronto, sua lasanha tá garantida.</p>' +
        '<div class="m-total"><span>' + (p.tipo === "entrega" ? "Total com entrega" : "Total") + "</span><b>" + money(total) + "</b></div>" +
        '<div class="qr-box"><img alt="QR Code do Pix de ' + money(total) + '" src="' + qr.createDataURL(6, 2) + '"><p>Abra o app do banco, escolha Pix e aponte a câmera.</p></div>' +
        '<div class="copia"><code id="pix-code">' + payload + '</code><button type="button" class="btn btn-red" id="btn-copiar">Copiar</button></div>' +
        '<a class="btn btn-big btn-block m-zap" target="_blank" rel="noopener" href="' + zap(mensagem(p, cod, taxa, total, true)) + '">Enviar comprovante no WhatsApp</a>' +
        '<p class="m-aviso">A gente confirma o pagamento e o horário pelo WhatsApp.</p>';
      $("#btn-copiar").addEventListener("click", function () {
        var b = this, code = $("#pix-code");
        function sel() { var r = document.createRange(); r.selectNodeContents(code); var s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selecionado"; }
        try { navigator.clipboard.writeText(payload).then(function () { b.textContent = "Copiado ✓"; }, sel); } catch (e) { sel(); }
      });
    } else {
      body.innerHTML =
        '<img class="m-art" src="img/st-ela-moto.webp" alt="">' +
        '<h2 class="m-title" id="m-t">Quase lá!</h2><span class="m-code">' + cod + "</span>" +
        '<p class="m-lead">Manda o pedido no WhatsApp. A gente responde com a taxa de entrega e o Pix do total.</p>' +
        '<div class="m-total"><span>Lasanhas</span><b>' + money(p.subtotal) + "</b></div>" +
        '<a class="btn btn-big btn-block m-zap" target="_blank" rel="noopener" href="' + zap(mensagem(p, cod, null, p.subtotal, false)) + '">Enviar pedido no WhatsApp</a>' +
        '<p class="m-aviso">Se o botão não abrir, chama no <b>' + C.whatsappVisivel + "</b> e passa o código " + cod + ".</p>";
    }
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
  }

  /* ---------- barra flutuante ---------- */
  var pedidoVisivel = false;
  function pintaFloat() {
    var n = nItens();
    $("#float-cart").hidden = !n || pedidoVisivel;
    $("#float-txt").textContent = "Ver meu pedido · " + n + (n === 1 ? " item" : " itens");
    $("#float-total").textContent = money(subtotal());
  }
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { pedidoVisivel = es[0].isIntersecting; pintaFloat(); }, { threshold: 0.05 }).observe($("#pedido"));

  $("#foot-whats").textContent = C.whatsappVisivel;
  $("#foot-insta").href = C.instagram;

  pintaSacola(); trocaTipo(); pintaFornada();
  if ($("#f-cep").value) $("#f-cep").dispatchEvent(new Event("input"));
  window.addEventListener("hashchange", function () { if (location.hash === "#teste") { TESTE = true; pintaFornada(); } });
  setInterval(pintaFornada, 60000);
  if (C.apiUrl) fetch(C.apiUrl + "?action=status").then(function (r) { return r.json(); })
    .then(function (j) { if (typeof j.vendidas === "number") { api.vendidas = j.vendidas; pintaFornada(); } }).catch(function () {});
})();

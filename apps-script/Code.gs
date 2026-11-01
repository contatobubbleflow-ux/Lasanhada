/**
 * LASANHADA · ligação entre o site e a planilha "🍅Lasanhada Controle de Vendas"
 *
 * - Calcula a taxa de entrega pela distância de CARRO (Google Maps),
 *   saindo do endereço da cozinha guardado em ORIGEM. O site só recebe o valor.
 * - Lança cada pedido do site na aba "Pedidos" (uma linha por sabor/tamanho,
 *   igual vocês já usam) e cadastra o cliente novo na aba "Clientes".
 * - Conta as lasanhas da fornada para fechar o site quando chegar em 25.
 *
 * Propriedades do script (Configurações do projeto > Propriedades do script):
 *   ORIGEM      endereço completo da cozinha
 *   CAPACIDADE  25
 */

var FUSO = "America/Sao_Paulo";
var PRECO = { individual: 27.99, casal: 37.99, familia: 55.90 };
var FAIXAS = [{ ate: 3, taxa: 5 }, { ate: 5, taxa: 7 }, { ate: 6, taxa: 10 }];
var FECHA = { diaSemana: 4, hora: 20 }; // quinta, 20h
var NOME = { bolonhesa: "Bolonhesa", vegetariana: "Vegetariana" };
var LINHA1 = 5; // primeira linha de dados nas abas Pedidos e Clientes

function doGet(e) {
  var f = fornada();
  return json({ ok: true, vendidas: vendidas(f), capacidade: capacidade() });
}

function doPost(e) {
  var b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, erro: "json" }); }
  if (b.action === "frete") return json(frete(b.endereco));
  if (b.action === "pedido") return json(pedido(b));
  return json({ ok: false, erro: "acao" });
}

/* ---------- taxa de entrega ---------- */
function frete(endereco) {
  if (!endereco) return { ok: false };
  var cache = CacheService.getScriptCache();
  var k = "f" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, endereco.toLowerCase()));
  var c = cache.get(k); if (c) return JSON.parse(c);
  var origem = PropertiesService.getScriptProperties().getProperty("ORIGEM");
  if (!origem) return { ok: false, erro: "sem_origem" };
  var r;
  try {
    var d = Maps.newDirectionFinder().setOrigin(origem).setDestination(endereco)
      .setMode(Maps.DirectionFinder.Mode.DRIVING).setRegion("br").getDirections();
    if (!d.routes || !d.routes.length) return { ok: false, erro: "nao_encontrado" };
    var leg = d.routes[0].legs[0], km = leg.distance.value / 1000;
    var faixa = /londrina/i.test(leg.end_address || "") ? FAIXAS.filter(function (x) { return km <= x.ate; })[0] : null;
    r = { ok: true, disponivel: !!faixa, taxa: faixa ? faixa.taxa : null };
  } catch (err) { return { ok: false, erro: "maps" }; }
  cache.put(k, JSON.stringify(r), 21600);
  return r;
}

/* ---------- fornada ---------- */
function fornada() {
  var d = new Date(), dow = +Utilities.formatDate(d, FUSO, "u") % 7, h = +Utilities.formatDate(d, FUSO, "H");
  var aberto = (dow >= 1 && dow < FECHA.diaSemana) || (dow === FECHA.diaSemana && h < FECHA.hora);
  var ate = aberto ? 6 - dow : (dow === 0 ? 6 : 13 - dow);
  var sab = new Date(d.getTime() + ate * 864e5), dom = new Date(sab.getTime() + 864e5);
  return { aberto: aberto, dias: [Utilities.formatDate(sab, FUSO, "yyyy-MM-dd"), Utilities.formatDate(dom, FUSO, "yyyy-MM-dd")] };
}
function capacidade() { return +(PropertiesService.getScriptProperties().getProperty("CAPACIDADE") || 25); }
function abaPedidos() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pedidos"); }

function vendidas(f) {
  var sh = abaPedidos(), n = ultimaLinha(sh) - LINHA1 + 1;
  if (n < 1) return 0;
  var v = sh.getRange(LINHA1, 5, n, 9).getValues(); // E (sabor) .. M (entrega)
  return v.reduce(function (a, r) {
    var dia = r[8] instanceof Date ? Utilities.formatDate(r[8], FUSO, "yyyy-MM-dd") : "";
    return (f.dias.indexOf(dia) >= 0 && !/arroz/i.test(String(r[0]))) ? a + (+r[1] || 0) : a;
  }, 0);
}
function ultimaLinha(sh) {
  var max = sh.getMaxRows(), v = sh.getRange(LINHA1, 1, max - LINHA1 + 1, 5).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (v[i][0] !== "" || v[i][2] !== "" || v[i][4] !== "") return LINHA1 + i;
  return LINHA1 - 1;
}

/* ---------- pedido ---------- */
function pedido(p) {
  var f = fornada();
  if (!f.aberto) return { ok: false, erro: "fechado" };

  // linhas no formato da planilha: "Bolonhesa 500 ml", "Vegetariana 700 ml"…
  var linhas = {}, ordem = [], desconto = 0, sub = 0, lasanhas = 0;
  function soma(nome, q) { if (!linhas[nome]) { linhas[nome] = 0; ordem.push(nome); } linhas[nome] += q; lasanhas += q; }
  (p.itens || []).forEach(function (i) {
    var q = Math.max(0, Math.min(20, +i.q || 0)); if (!q || !PRECO[i.id]) return;
    sub += PRECO[i.id] * q;
    if (i.id === "individual") soma(NOME[i.sab[0]] + " 500 ml", q);
    if (i.id === "casal") soma(NOME[i.sab[0]] + " 700 ml", q);
    if (i.id === "familia") { soma(NOME[i.sab[0]] + " 500 ml", q); soma(NOME[i.sab[1]] + " 500 ml", q); desconto += (2 * PRECO.individual - PRECO.familia) * q; }
  });
  if (!ordem.length) return { ok: false, erro: "itens" };

  var taxa = 0;
  if (p.tipo === "entrega") {
    var fr = frete(p.enderecoBusca);
    if (fr.ok && !fr.disponivel) return { ok: false, erro: "fora" };
    taxa = fr.ok ? fr.taxa : null;
  }

  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var restam = capacidade() - vendidas(f);
    if (lasanhas > restam) return { ok: false, erro: "esgotado", restam: Math.max(0, restam) };
    var sh = abaPedidos(), ult = ultimaLinha(sh), lin = ult + 1;
    var nums = ult >= LINHA1 ? sh.getRange(LINHA1, 1, ult - LINHA1 + 1, 1).getValues().map(function (r) { return +r[0] || 0; }) : [0];
    var num = Math.max.apply(null, nums.concat([0])) + 1;
    var codigo = "LAS-" + ("00" + num).slice(-3);
    var dt = p.dataEntrega.split("-"), entrega = new Date(+dt[0], +dt[1] - 1, +dt[2], 12);
    var obs = [p.obs, p.tipo === "retirada" ? "Retirada" : ""].filter(String).join(" · ");

    var aF = [], aH = [], aMW = [];
    ordem.forEach(function (nome, k) {
      aF.push([num, new Date(), p.nome, "'" + p.whats, nome, linhas[nome]]);
      aH.push([k === 0 && desconto ? Math.round(desconto * 100) / 100 : ""]);
      aMW.push([entrega, "A produzir", "Pendente", "Pix", obs, codigo, p.tipo === "entrega" ? "Entrega" : "Retirada",
        p.tipo === "entrega" ? p.endereco : "", k === 0 ? (taxa === null ? "a confirmar" : taxa) : "", p.diaTexto + ", " + p.hora, p.modo]);
    });
    sh.getRange(lin, 1, aF.length, 6).setValues(aF);
    sh.getRange(lin, 8, aH.length, 1).setValues(aH);
    sh.getRange(lin, 13, aMW.length, 11).setValues(aMW);
    sh.getRange(lin, 13, aMW.length, 1).setNumberFormat("dd/MM/yyyy");
    sh.getRange(lin, 2, aF.length, 1).setNumberFormat("dd/MM/yyyy");

    cadastraCliente(p);
    var total = Math.round((sub + (taxa || 0)) * 100) / 100;
    return { ok: true, codigo: codigo, taxa: taxa, total: total };
  } finally { lock.releaseLock(); }
}

function cadastraCliente(p) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Clientes"); if (!sh) return;
  var v = sh.getRange(LINHA1, 1, sh.getMaxRows() - LINHA1 + 1, 3).getValues();
  var zap = String(p.whats).replace(/\D/g, "").slice(-9), vazia = -1;
  for (var i = 0; i < v.length; i++) {
    if (v[i][0] === "" && v[i][1] === "") { if (vazia < 0) vazia = i; continue; }
    if (String(v[i][1]).replace(/\D/g, "").slice(-9) === zap || String(v[i][0]).trim().toLowerCase() === p.nome.toLowerCase()) return;
  }
  if (vazia >= 0) sh.getRange(LINHA1 + vazia, 1, 1, 3).setValues([[p.nome, p.whats, p.tipo === "entrega" ? (p.bairro || p.endereco) : "Retirada"]]);
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Rode uma vez pelo editor: autoriza o Maps e a planilha e mostra um teste no registro. */
function testar() {
  Logger.log("Taxa para um endereço do Centro: " + JSON.stringify(frete("Rua Sergipe, 500 - Centro, Londrina - PR")));
  Logger.log("Lasanhas já pedidas nesta fornada: " + vendidas(fornada()));
}

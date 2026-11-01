/* =========================================================
   LASANHADA · CONFIGURAÇÃO DA PÁGINA DE PEDIDOS
   Tudo que muda no dia a dia fica aqui.
   ========================================================= */
window.LASANHADA = {

  // WhatsApp que recebe os pedidos (55 + DDD + número, só dígitos)
  whatsapp: "5543999360713",
  whatsappVisivel: "(43) 99936-0713",

  instagram: "https://www.instagram.com/lasanhada.ldna/",

  // Pix (chave aleatória). O site gera o QR com o valor do pedido.
  pix: {
    chave: "0709950f-85e7-487b-a253-5e6d5d03c9c8",
    nome: "LASANHADA",
    cidade: "LONDRINA"
  },

  // Endereço do Apps Script publicado (veja apps-script/LEIA-ME.md).
  // Enquanto estiver vazio, a taxa de entrega é combinada no WhatsApp
  // e o pedido vai direto pra conversa, sem Pix automático.
  apiUrl: "",

  // Capacidade de cada fornada (em lasanhas). Família conta como 2.
  capacidade: 25,

  // Situação dos pedidos:
  //  "auto"     → abre segunda 00h e fecha quinta às 20h, sozinho
  //  "aberto"   → força aberto
  //  "esgotado" → mostra que a fornada lotou
  //  "fechado"  → fecha agora
  status: "auto",

  // Fechamento automático: quinta-feira (4) às 20h
  fechamento: { diaSemana: 4, hora: 20 },

  // Horários que o cliente pode escolher para receber
  horarios: ["11h às 13h", "13h às 15h", "15h às 17h", "17h às 19h", "19h às 21h"],

  cardapio: {
    sabores: [
      { id: "bolonhesa", nome: "Bolonhesa", desc: "Molho bolonhesa de carne, massa e muito queijo." },
      { id: "vegetariana", nome: "Vegetariana", desc: "Proteína de soja bem temperadinha no lugar da carne, molho, massa e queijo." }
    ],
    tamanhos: [
      { id: "individual", nome: "Individual", comp: "500 ml + arroz", preco: 27.99, lasanhas: 1, sabores: 1, serve: "pra você" },
      { id: "casal", nome: "Casal", comp: "700 ml + arroz", preco: 37.99, lasanhas: 1, sabores: 1, serve: "pra dois" },
      { id: "familia", nome: "Família", comp: "2 × 500 ml + 2 arrozes", preco: 55.90, lasanhas: 2, sabores: 2, serve: "pra família toda" }
    ]
  },

  // Faixas de entrega (distância de carro). Acima da última, não entrega.
  frete: [
    { ate: 3, taxa: 5 },
    { ate: 5, taxa: 7 },
    { ate: 6, taxa: 10 }
  ]
};

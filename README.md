# Lasanhada · página de pedidos

Site de pedidos da Lasanhada (Centro · Londrina, PR). Todo dia é domingo.

- Cardápio: Bolonhesa e Vegetariana, em Individual, Casal e Família, sempre com arroz.
- Pedidos de segunda até quinta às 20h; entrega ou retirada no sábado e no domingo, com horário agendado.
- Fornada de 25 lasanhas. Entrega até 6 km (R$ 5 / R$ 7 / R$ 10).
- Pix gerado com o valor do pedido e confirmação pelo WhatsApp.

## O que editar
| Arquivo | Para quê |
|---|---|
| `config.js` | WhatsApp, Pix, horários, preços, status da fornada (`auto`, `aberto`, `esgotado`, `fechado`) e o endereço do backend |
| `img/` | Fotos e vídeos |
| `apps-script/` | Backend no Google (taxa pelo Google Maps e planilha de pedidos). Veja `apps-script/LEIA-ME.md` |

Para ver a página aberta fora do horário de pedidos, use o endereço com `?teste` no final.

## Publicar no GitHub Pages
Settings → Pages → Branch `main` / pasta raiz → Save. O link fica `https://<usuário>.github.io/<repositório>/`.

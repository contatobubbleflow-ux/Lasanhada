# Ligar o site à planilha (uma vez só, uns 10 minutos)

Depois disso, cada pedido do site cai sozinho na aba **Pedidos** da planilha **🍅Lasanhada Controle de Vendas**, o cliente novo entra na aba **Clientes**, a taxa de entrega é calculada pelo Google Maps e o site fecha quando a fornada chegar em 25 lasanhas.

A planilha já está preparada: a aba Cardápio ganhou Vegetariana 500 ml e 700 ml, e a aba Pedidos ganhou as colunas R a W (código, entrega ou retirada, endereço, taxa, horário, congelada ou quentinha). O custo da Vegetariana aparece quando vocês lançarem a ficha técnica dela.

## Passo a passo
1. Abra a planilha **🍅Lasanhada Controle de Vendas**.
2. Menu **Extensões → Apps Script**.
3. Apague o que estiver no `Código.gs`, cole todo o conteúdo de `Code.gs` desta pasta e salve.
4. Engrenagem **Configurações do projeto** → **Propriedades do script** → adicione:
   - `ORIGEM` = endereço completo da cozinha (rua, número, bairro, Londrina - PR). Fica só aqui, nunca aparece no site.
   - `CAPACIDADE` = `25`
5. No editor, escolha a função **testar** e clique em **Executar**. Aceite as autorizações do Google. No registro aparece a taxa de um endereço de teste.
6. **Implantar → Nova implantação → App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Copie o endereço que termina em `/exec`.
7. No `config.js` do site, cole esse endereço em `apiUrl: "…"`.

## No dia a dia
- O pedido entra com Produção **A produzir** e Pagamento **Pendente**. Quando o Pix cair, troque para **Pago**.
- Pedido que não pagou: apague as linhas dele. As lasanhas voltam a ficar disponíveis no site.
- Para fechar antes da hora: no `config.js`, troque `status: "auto"` por `"esgotado"` ou `"fechado"`.
- Mudou o `Code.gs`? **Implantar → Gerenciar implantações → editar → Nova versão** (o endereço continua o mesmo).

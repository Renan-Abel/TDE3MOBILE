# Sistema de Vendas — TDE Mobile

Aplicativo React Native com TypeScript, Expo SDK 58 e SQLite local. Implementa o modelo do enunciado “TDE – Banco de Dados Relacional com MAUI”, que permite outras linguagens e frameworks.

## Executar no Android

Requisitos: Node.js 22.13 ou superior (Node 24 recomendado), npm e Expo Go compatível com SDK 58, em celular ou emulador Android.

```powershell
cd C:\Users\renan\Desktop\TDE3Mobile\SistemaVendas
npm install
npm start
```

Leia o QR code com o Expo Go. Celular e computador devem estar na mesma rede. Em um emulador Android já aberto, pressione `a` no terminal. A conexão é necessária para carregar o aplicativo em desenvolvimento; os cadastros usam banco local e funcionam sem servidor.

O alvo validado na compilação é Android. A execução da interface em aparelho ainda precisa ser conferida. O comando web não foi configurado para SQLite/WASM e não é o caminho de apresentação deste trabalho.

## Funcionalidades

- Menu principal com contadores e acesso aos três módulos.
- Clientes: cadastrar, buscar, consultar, editar e excluir; nome, RG e telefone.
- Produtos: cadastrar, buscar, consultar, editar e excluir; nome, tipo, preço e estoque.
- Compras: cadastrar, buscar, consultar, editar e excluir; cliente, data, itens e total.
- Itens de compra: adicionar, consultar, editar quantidade/produto e remover dentro da compra.
- Dados persistidos no dispositivo. Nenhum dado fictício é inserido automaticamente.

## Modelo e decisões

`Cliente (1) → (N) Compra (1) → (N) ItemCompra (N) ← (1) Produto`.

Os nomes e campos seguem o diagrama. IDs são inteiros gerados automaticamente. SQLite usa TEXT para nomes e datas ISO (AAAA-MM-DD). RG é TEXT numérico de até 10 dígitos para preservar zeros à esquerda; o diagrama o descreve como INT(10). A interface apresenta datas como DD/MM/AAAA.

Preço, valor parcial e total são INTEGER em centavos, evitando arredondamento de ponto flutuante. O valor parcial dividido pela quantidade preserva o preço unitário histórico sem acrescentar campos ao diagrama. Alterar o preço do produto não modifica compras anteriores.

Uma compra precisa de cliente e pelo menos um item. A quantidade deve ser inteira e positiva. Salvar uma compra desconta o estoque; editar devolve as quantidades antigas e aplica as novas; excluir devolve o estoque. Todas essas operações acontecem em transações, com rollback em caso de falha. Cancelar o formulário descarta o rascunho. O botão “Salvar compra” confirma também as alterações dos itens.

Clientes e produtos vinculados não podem ser excluídos. A exclusão da compra remove seus itens por chave estrangeira em cascata. As entradas são validadas antes das gravações e as consultas usam parâmetros SQL.

O esquema de referência está em `src/data/schema.sql`; a mesma definição usada pelo app fica em `src/data/schema.ts`. Ao alterar o SQL, atualize também a string TypeScript. O banco `sistema-vendas.db` é criado automaticamente na primeira abertura; não precisa de MySQL ou API. Desinstalar o aplicativo ou limpar seus dados pode apagar o banco.

## Estrutura

- `src/app/`: telas e navegação com Expo Router.
- `src/components/ui.tsx`: componentes visuais compartilhados.
- `src/screens/Catalog.tsx`: formulário e listagem de clientes e produtos.
- `src/data/repository.ts`: CRUD, transações e regras de estoque.
- `src/data/validation.ts`: validação de campos, dinheiro e datas.
- `tests/repository.test.cjs`: testes do repositório real sobre SQLite em memória, com adaptador da interface síncrona do Expo.

## Verificar

```powershell
npm run typecheck
npm run lint
npm test
```

Os testes exigem Node.js com `node:sqlite`. Eles verificam CRUD, vínculos, totais, estoque, rollback, edição, exclusão em cascata e validações. Eles não substituem testes da interface no Android.

## Roteiro de apresentação

1. Cadastre um cliente com nome, RG numérico e telefone com DDD.
2. Cadastre um produto com preço 12,50 e estoque 10.
3. Crie uma compra para esse cliente, adicionando duas unidades: total R$ 25,00 e estoque 8.
4. Feche e reabra o aplicativo para demonstrar a persistência.
5. Edite a quantidade para três e salve: total R$ 37,50 e estoque 7.
6. Tente uma quantidade superior ao estoque e confira a mensagem; a compra anterior deve permanecer intacta.
7. Cadastre um segundo produto, adicione-o à compra e salve. Remova esse item e salve novamente para demonstrar o CRUD de ItemCompra.
8. Tente excluir um cliente ou produto vinculado para mostrar a proteção dos relacionamentos.
9. Exclua a compra, confira a devolução do estoque e então exclua cliente e produto.

Referências técnicas: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/ e https://docs.expo.dev/router/installation/.

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS Cliente (
 CodigoCliente INTEGER PRIMARY KEY AUTOINCREMENT,
 Nome TEXT NOT NULL CHECK(length(trim(Nome)) BETWEEN 2 AND 50),
 RG TEXT NOT NULL UNIQUE CHECK(length(RG) BETWEEN 1 AND 10 AND RG NOT GLOB '*[^0-9]*'),
 Telefone TEXT NOT NULL CHECK(length(Telefone) BETWEEN 10 AND 14)
);
CREATE TABLE IF NOT EXISTS Produto (
 CodigoProduto INTEGER PRIMARY KEY AUTOINCREMENT,
 NomeProduto TEXT NOT NULL CHECK(length(trim(NomeProduto)) BETWEEN 2 AND 50),
 Tipo TEXT NOT NULL CHECK(length(trim(Tipo)) BETWEEN 1 AND 50),
 Preco INTEGER NOT NULL CHECK(Preco > 0),
 QtdEstoque INTEGER NOT NULL CHECK(QtdEstoque >= 0)
);
CREATE TABLE IF NOT EXISTS Compra (
 CodigoCompra INTEGER PRIMARY KEY AUTOINCREMENT,
 DataCompra TEXT NOT NULL,
 ValorTotal INTEGER NOT NULL DEFAULT 0 CHECK(ValorTotal >= 0),
 CodigoCliente INTEGER NOT NULL REFERENCES Cliente(CodigoCliente) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS ItemCompra (
 CodigoItem INTEGER PRIMARY KEY AUTOINCREMENT,
 CodigoProduto INTEGER NOT NULL REFERENCES Produto(CodigoProduto) ON DELETE RESTRICT,
 CodigoCompra INTEGER NOT NULL REFERENCES Compra(CodigoCompra) ON DELETE CASCADE,
 Quantidade INTEGER NOT NULL CHECK(Quantidade > 0),
 ValorParcial INTEGER NOT NULL CHECK(ValorParcial > 0)
);
CREATE INDEX IF NOT EXISTS idx_compra_cliente ON Compra(CodigoCliente);
CREATE INDEX IF NOT EXISTS idx_item_compra ON ItemCompra(CodigoCompra);
CREATE INDEX IF NOT EXISTS idx_item_produto ON ItemCompra(CodigoProduto);
PRAGMA user_version = 1;

import type { SQLiteDatabase } from "expo-sqlite";
import * as v from "./validation";
import { schema } from "./schema";
export type Client = {
  CodigoCliente: number;
  Nome: string;
  RG: string;
  Telefone: string;
};
export type Product = {
  CodigoProduto: number;
  NomeProduto: string;
  Tipo: string;
  Preco: number;
  QtdEstoque: number;
};
export type Purchase = {
  CodigoCompra: number;
  CodigoCliente: number;
  DataCompra: string;
  ValorTotal: number;
  Nome: string;
};
export type Item = {
  CodigoItem?: number;
  CodigoProduto: number;
  Quantidade: number;
  ValorParcial: number;
  NomeProduto: string;
};
export async function initialize(db: SQLiteDatabase) {
  db.execSync(schema);
}
export const clients = (db: SQLiteDatabase) =>
  db.getAllSync<Client>("SELECT * FROM Cliente ORDER BY Nome");
export const products = (db: SQLiteDatabase) =>
  db.getAllSync<Product>("SELECT * FROM Produto ORDER BY NomeProduto");
export const purchases = (db: SQLiteDatabase) =>
  db.getAllSync<Purchase>(
    "SELECT c.*, cl.Nome FROM Compra c JOIN Cliente cl USING(CodigoCliente) ORDER BY c.DataCompra DESC, c.CodigoCompra DESC",
  );
export const items = (db: SQLiteDatabase, id: number) =>
  db.getAllSync<Item>(
    "SELECT i.*, p.NomeProduto FROM ItemCompra i JOIN Produto p USING(CodigoProduto) WHERE CodigoCompra = ? ORDER BY CodigoItem",
    id,
  );
export function saveClient(
  db: SQLiteDatabase,
  id: number | undefined,
  name: string,
  rg: string,
  phone: string,
) {
  const n = v.text(name, "Nome", 2);
  const r = v.text(rg, "RG", 1, 10);
  const p = v.text(phone, "Telefone", 10, 14);
  if (!/^\d{1,10}$/.test(r))
    throw new Error("RG: informe até 10 dígitos, sem pontuação.");
  if (
    !/^[\d ()+.-]+$/.test(p) ||
    p.replace(/\D/g, "").length < 10 ||
    p.replace(/\D/g, "").length > 11
  )
    throw new Error("Telefone: informe DDD e número, com 10 ou 11 dígitos.");
  if (
    db.getFirstSync(
      "SELECT 1 FROM Cliente WHERE RG = ? AND CodigoCliente != ?",
      r,
      id ?? 0,
    )
  )
    throw new Error("Já existe um cliente com esse RG.");
  if (id)
    db.runSync(
      "UPDATE Cliente SET Nome=?, RG=?, Telefone=? WHERE CodigoCliente=?",
      n,
      r,
      p,
      id,
    );
  else
    db.runSync("INSERT INTO Cliente(Nome,RG,Telefone) VALUES(?,?,?)", n, r, p);
}
export function saveProduct(
  db: SQLiteDatabase,
  id: number | undefined,
  name: string,
  type: string,
  price: string,
  stock: string,
) {
  const n = v.text(name, "Nome", 2);
  const t = v.text(type, "Tipo");
  const p = v.cents(price);
  const s = v.integer(stock, "Estoque");
  if (id)
    db.runSync(
      "UPDATE Produto SET NomeProduto=?, Tipo=?, Preco=?, QtdEstoque=? WHERE CodigoProduto=?",
      n,
      t,
      p,
      s,
      id,
    );
  else
    db.runSync(
      "INSERT INTO Produto(NomeProduto,Tipo,Preco,QtdEstoque) VALUES(?,?,?,?)",
      n,
      t,
      p,
      s,
    );
}
export function removeClient(db: SQLiteDatabase, id: number) {
  if (db.getFirstSync("SELECT 1 FROM Compra WHERE CodigoCliente=?", id))
    throw new Error(
      "Este cliente possui compras. Exclua as compras vinculadas primeiro.",
    );
  db.runSync("DELETE FROM Cliente WHERE CodigoCliente=?", id);
}
export function removeProduct(db: SQLiteDatabase, id: number) {
  if (db.getFirstSync("SELECT 1 FROM ItemCompra WHERE CodigoProduto=?", id))
    throw new Error(
      "Este produto está vinculado a uma compra. Remova os itens vinculados primeiro.",
    );
  db.runSync("DELETE FROM Produto WHERE CodigoProduto=?", id);
}
export function savePurchase(
  db: SQLiteDatabase,
  id: number | undefined,
  client: number,
  date: string,
  draft: Item[],
) {
  const iso = v.date(date);
  if (
    !Number.isSafeInteger(client) ||
    !db.getFirstSync("SELECT 1 FROM Cliente WHERE CodigoCliente=?", client)
  )
    throw new Error("Selecione um cliente.");
  if (!draft.length)
    throw new Error("Adicione pelo menos um produto à compra.");
  for (const item of draft) {
    v.integer(String(item.Quantidade), "Quantidade", 1);
    if (
      !Number.isSafeInteger(item.ValorParcial) ||
      item.ValorParcial <= 0 ||
      item.ValorParcial % item.Quantidade !== 0
    )
      throw new Error("Valor do item inválido.");
  }
  const total = draft.reduce((sum, i) => sum + i.ValorParcial, 0);
  if (!Number.isSafeInteger(total) || total > 1000000000000)
    throw new Error("Total da compra acima do limite permitido.");
  db.withTransactionSync(() => {
    if (id) {
      if (!db.getFirstSync("SELECT 1 FROM Compra WHERE CodigoCompra=?", id))
        throw new Error("Compra não encontrada.");
      restoreStock(db, id);
    }
    for (const item of draft) {
      const result = db.runSync(
        "UPDATE Produto SET QtdEstoque=QtdEstoque-? WHERE CodigoProduto=? AND QtdEstoque>=?",
        item.Quantidade,
        item.CodigoProduto,
        item.Quantidade,
      );
      if (result.changes !== 1)
        throw new Error(`Estoque insuficiente para ${item.NomeProduto}.`);
    }
    let purchaseId = id;
    if (id)
      db.runSync(
        "UPDATE Compra SET CodigoCliente=?,DataCompra=?,ValorTotal=? WHERE CodigoCompra=?",
        client,
        iso,
        total,
        id,
      );
    else
      purchaseId = db.runSync(
        "INSERT INTO Compra(CodigoCliente,DataCompra,ValorTotal) VALUES(?,?,?)",
        client,
        iso,
        total,
      ).lastInsertRowId;
    const old = id ? items(db, id) : [];
    for (const previous of old)
      if (!draft.some((i) => i.CodigoItem === previous.CodigoItem))
        db.runSync(
          "DELETE FROM ItemCompra WHERE CodigoItem=?",
          previous.CodigoItem!,
        );
    for (const item of draft) {
      if (item.CodigoItem && old.some((i) => i.CodigoItem === item.CodigoItem))
        db.runSync(
          "UPDATE ItemCompra SET CodigoProduto=?,Quantidade=?,ValorParcial=? WHERE CodigoItem=? AND CodigoCompra=?",
          item.CodigoProduto,
          item.Quantidade,
          item.ValorParcial,
          item.CodigoItem,
          purchaseId!,
        );
      else
        db.runSync(
          "INSERT INTO ItemCompra(CodigoProduto,CodigoCompra,Quantidade,ValorParcial) VALUES(?,?,?,?)",
          item.CodigoProduto,
          purchaseId!,
          item.Quantidade,
          item.ValorParcial,
        );
    }
  });
}
function restoreStock(db: SQLiteDatabase, id: number) {
  for (const item of items(db, id))
    db.runSync(
      "UPDATE Produto SET QtdEstoque=QtdEstoque+? WHERE CodigoProduto=?",
      item.Quantidade,
      item.CodigoProduto,
    );
}
export function removePurchase(db: SQLiteDatabase, id: number) {
  db.withTransactionSync(() => {
    restoreStock(db, id);
    db.runSync("DELETE FROM Compra WHERE CodigoCompra=?", id);
  });
}

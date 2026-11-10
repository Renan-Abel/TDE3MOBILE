const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
// Execute the actual TypeScript repository with a thin Expo-compatible adapter.
const cache = new Map();
function load(file) {
 const full = path.resolve(file);
 if (cache.has(full)) return cache.get(full);
 const output = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 const mod = { exports: {} };
 vm.runInThisContext('(function(require,module,exports){'+output+'\n})', { filename: full })((name) => load(path.resolve(path.dirname(full), name + '.ts')), mod, mod.exports);
 cache.set(full, mod.exports);
 return mod.exports;
}
const repo = load('src/data/repository.ts');
const v = load('src/data/validation.ts');
function setup(t) {
 const sqlite = new DatabaseSync(':memory:');
 t.after(() => sqlite.close());
 const db = {
  execSync(sql) { sqlite.exec(sql); },
  runSync(sql, ...params) { const r = sqlite.prepare(sql).run(...params); return { changes: Number(r.changes), lastInsertRowId: Number(r.lastInsertRowid) }; },
  getFirstSync(sql, ...params) { return sqlite.prepare(sql).get(...params) || null; },
  getAllSync(sql, ...params) { return sqlite.prepare(sql).all(...params); },
  withTransactionSync(task) { sqlite.exec('BEGIN'); try { task(); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; } },
 };
 db.execSync(load('src/data/schema.ts').schema);
 repo.saveClient(db, undefined, 'Ana Silva', '123456789', '11999999999');
 repo.saveProduct(db, undefined, 'Caderno', 'Papelaria', '12,50', '10');
 return db;
}
const item = (quantity = 2) => ({ CodigoProduto: 1, NomeProduto: 'Caderno', Quantidade: quantity, ValorParcial: quantity * 1250 });
test('validates money, integers and real calendar dates', () => {
 assert.equal(v.cents('12,50'), 1250);
 assert.equal(v.date('29/02/2024'), '2024-02-29');
 for (const date of ['29/02/2025', '31/04/2026', '03/13/2026', '1/1/2026']) assert.throws(() => v.date(date));
 for (const price of ['0', '-1', '1.234,50', 'NaN']) assert.throws(() => v.cents(price));
 for (const qty of ['-1', '1.5', '1e2', '']) assert.throws(() => v.integer(qty, 'Quantidade', 1));
});
test('client and product CRUD, duplicate RG and validation', t => {
 const db = setup(t);
 assert.throws(() => repo.saveClient(db, undefined, 'Outro', '123456789', '11999999999'), /RG/);
 assert.throws(() => repo.saveClient(db, undefined, 'Ana', 'ABC', '11999999999'), /RG/);
 assert.throws(() => repo.saveProduct(db, undefined, 'Produto', 'Tipo', '0', '10'));
 repo.saveClient(db, 1, 'Ana Souza', '123456789', '11988888888');
 repo.saveProduct(db, 1, 'Agenda', 'Papelaria', '20,00', '8');
 assert.equal(repo.clients(db)[0].Nome, 'Ana Souza');
 assert.equal(repo.products(db)[0].Preco, 2000);
 repo.removeClient(db, 1); repo.removeProduct(db, 1);
 assert.equal(repo.clients(db).length, 0); assert.equal(repo.products(db).length, 0);
});
test('purchase persists relationships, totals and stock', t => {
 const db = setup(t);
 repo.savePurchase(db, undefined, 1, '03/11/2026', [item()]);
 assert.equal(repo.purchases(db)[0].ValorTotal, 2500);
 assert.equal(repo.purchases(db)[0].Nome, 'Ana Silva');
 assert.equal(repo.items(db, 1)[0].Quantidade, 2);
 assert.equal(repo.products(db)[0].QtdEstoque, 8);
 assert.throws(() => repo.removeClient(db, 1), /compras/);
 assert.throws(() => repo.removeProduct(db, 1), /compra/);
});
test('insufficient stock rolls back all earlier items', t => {
 const db = setup(t);
 assert.throws(() => repo.savePurchase(db, undefined, 1, '03/11/2026', [item(2), item(9)]), /Estoque/);
 assert.equal(repo.products(db)[0].QtdEstoque, 10);
 assert.equal(repo.purchases(db).length, 0);
 assert.equal(repo.items(db, 1).length, 0);
});
test('editing preserves item ID, restores old stock and recalculates totals', t => {
 const db = setup(t);
 repo.savePurchase(db, undefined, 1, '03/11/2026', [item(2)]);
 const old = repo.items(db, 1)[0];
 repo.savePurchase(db, 1, 1, '04/11/2026', [{ ...item(3), CodigoItem: old.CodigoItem }]);
 assert.equal(repo.items(db, 1)[0].CodigoItem, old.CodigoItem);
 assert.equal(repo.products(db)[0].QtdEstoque, 7);
 assert.equal(repo.purchases(db)[0].ValorTotal, 3750);
 assert.equal(repo.purchases(db)[0].DataCompra, '2026-11-04');
});
test('failed edit retains original purchase and stock', t => {
 const db = setup(t);
 repo.savePurchase(db, undefined, 1, '03/11/2026', [item(2)]);
 assert.throws(() => repo.savePurchase(db, 1, 1, '04/11/2026', [item(11)]), /Estoque/);
 assert.equal(repo.products(db)[0].QtdEstoque, 8);
 assert.equal(repo.items(db, 1)[0].Quantidade, 2);
 assert.equal(repo.purchases(db)[0].ValorTotal, 2500);
});
test('item deletion and purchase deletion restore stock and cascade', t => {
 const db = setup(t);
 repo.savePurchase(db, undefined, 1, '03/11/2026', [item(2), item(3)]);
 const old = repo.items(db, 1);
 repo.savePurchase(db, 1, 1, '03/11/2026', [old[0]]);
 assert.equal(repo.items(db, 1).length, 1);
 assert.equal(repo.products(db)[0].QtdEstoque, 8);
 repo.removePurchase(db, 1);
 assert.equal(repo.items(db, 1).length, 0);
 assert.equal(repo.purchases(db).length, 0);
 assert.equal(repo.products(db)[0].QtdEstoque, 10);
});
test('rejects empty purchases, missing clients and invalid quantities', t => {
 const db = setup(t);
 assert.throws(() => repo.savePurchase(db, undefined, 1, '03/11/2026', []));
 assert.throws(() => repo.savePurchase(db, undefined, 999, '03/11/2026', [item()]));
 assert.throws(() => repo.savePurchase(db, undefined, 1, '03/11/2026', [item(0)]));
 assert.throws(() => db.runSync('INSERT INTO Compra(DataCompra, CodigoCliente) VALUES(?,?)', '2026-11-03', 999));
 assert.equal(repo.purchases(db).length, 0);
});

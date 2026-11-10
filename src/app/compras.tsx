import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as repo from "../data/repository";
import { displayDate, integer, money, today } from "../data/validation";
import {
  Button,
  Card,
  Choice,
  Empty,
  Field,
  Heading,
  Notice,
  Page,
  confirmDelete,
  errorMessage,
  s,
} from "../components/ui";
export default function Purchases() {
  const db = useSQLiteContext();
  const [rows, setRows] = useState<repo.Purchase[]>([]);
  const [clients, setClients] = useState<repo.Client[]>([]);
  const [products, setProducts] = useState<repo.Product[]>([]);
  const [draft, setDraft] = useState<repo.Item[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<number>();
  const [client, setClient] = useState(0);
  const [date, setDate] = useState(today());
  const [product, setProduct] = useState(0);
  const [quantity, setQuantity] = useState("1");
  const [itemIndex, setItemIndex] = useState<number>();
  const load = useCallback(() => {
    setRows(repo.purchases(db));
    setClients(repo.clients(db));
    setProducts(repo.products(db));
  }, [db]);
  useFocusEffect(
    useCallback(() => {
      try {
        load();
      } catch (e) {
        setMessage(errorMessage(e));
      }
    }, [load]),
  );
  function start(row?: repo.Purchase) {
    try {
      load();
      setId(row?.CodigoCompra);
      setClient(row?.CodigoCliente ?? 0);
      setDate(row ? displayDate(row.DataCompra) : today());
      setDraft(row ? repo.items(db, row.CodigoCompra) : []);
      setEditing(true);
      setMessage("");
      resetItem();
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  function resetItem() {
    setItemIndex(undefined);
    setProduct(0);
    setQuantity("1");
  }
  function addItem() {
    try {
      const count = integer(quantity, "Quantidade", 1);
      const p = products.find((p) => p.CodigoProduto === product);
      if (!p) throw new Error("Selecione um produto.");
      const previous = itemIndex === undefined ? undefined : draft[itemIndex];
      const unit =
        previous && previous.CodigoProduto === product
          ? previous.ValorParcial / previous.Quantidade
          : p.Preco;
      const item = {
        CodigoItem: previous?.CodigoItem,
        CodigoProduto: product,
        NomeProduto: p.NomeProduto,
        Quantidade: count,
        ValorParcial: unit * count,
      };
      if (!Number.isSafeInteger(item.ValorParcial))
        throw new Error("Valor do item acima do limite.");
      setDraft(
        itemIndex === undefined
          ? [...draft, item]
          : draft.map((it, i) => (i === itemIndex ? item : it)),
      );
      resetItem();
      setMessage("Item atualizado no rascunho. Salve a compra para confirmar.");
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  function save() {
    try {
      if (itemIndex !== undefined)
        throw new Error(
          "Confirme ou cancele a edição do item antes de salvar.",
        );
      repo.savePurchase(db, id, client, date, draft);
      load();
      setEditing(false);
      setMessage("Compra salva. Estoque e total atualizados.");
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  function remove(row: repo.Purchase) {
    confirmDelete(() => {
      try {
        repo.removePurchase(db, row.CodigoCompra);
        load();
        setMessage("Compra excluída e estoque devolvido.");
      } catch (e) {
        setMessage(errorMessage(e));
      }
    }, "Os itens serão excluídos e as quantidades devolvidas ao estoque.");
  }
  const filtered = rows.filter((r) =>
    `${r.CodigoCompra} ${r.Nome} ${displayDate(r.DataCompra)}`
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <Page>
      <Heading
        title={
          editing ? (id ? `Compra #${id}` : "Nova compra") : "Suas compras"
        }
        subtitle={
          editing
            ? "Escolha o cliente, adicione os produtos e confira o total antes de salvar."
            : "Registre compras e acompanhe cada item."
        }
      />
      <Notice text={message} />
      {editing ? (
        <>
          <Card>
            <Choice
              label="Cliente"
              value={client}
              onChange={setClient}
              options={clients.map((c) => ({
                id: c.CodigoCliente,
                label: c.Nome,
              }))}
            />
            <Field
              label="Data da compra (DD/MM/AAAA)"
              value={date}
              onChangeText={setDate}
              maxLength={10}
              placeholder="DD/MM/AAAA"
              keyboardType="numbers-and-punctuation"
            />
          </Card>
          <Card>
            <Text style={s.name}>
              {itemIndex === undefined ? "Adicionar produto" : "Editar item"}
            </Text>
            <Choice
              label="Produto"
              value={product}
              onChange={setProduct}
              options={products.map((p) => ({
                id: p.CodigoProduto,
                label: `${p.NomeProduto} · ${money(p.Preco)} · estoque ${p.QtdEstoque}`,
              }))}
            />
            <Field
              label="Quantidade"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              maxLength={10}
            />
            <Button
              title={
                itemIndex === undefined
                  ? "Adicionar item"
                  : "Confirmar alteração do item"
              }
              onPress={addItem}
            />
            {itemIndex !== undefined && (
              <Button
                secondary
                title="Cancelar edição do item"
                onPress={resetItem}
              />
            )}
            <Text style={s.muted}>
              O estoque será conferido ao salvar. Itens existentes mantêm o
              preço registrado, mesmo que o preço do produto mude.
            </Text>
          </Card>
          <Text style={s.badge}>ITENS DA COMPRA ({draft.length})</Text>
          {draft.map((it, index) => (
            <Card key={index}>
              <Text style={s.name}>{it.NomeProduto}</Text>
              <Text style={s.muted}>
                {it.Quantidade} × {money(it.ValorParcial / it.Quantidade)}
              </Text>
              <Text style={s.name}>{money(it.ValorParcial)}</Text>
              <View style={s.row}>
                <Button
                  secondary
                  title="Editar item"
                  onPress={() => {
                    setItemIndex(index);
                    setProduct(it.CodigoProduto);
                    setQuantity(String(it.Quantidade));
                  }}
                />
                <Button
                  danger
                  title="Remover item"
                  onPress={() => {
                    setDraft(draft.filter((_, i) => i !== index));
                    resetItem();
                  }}
                />
              </View>
            </Card>
          ))}
          {!draft.length && <Empty text="Adicione pelo menos um item." />}
          <Card>
            <Text style={s.muted}>Total da compra</Text>
            <Text style={s.title}>
              {money(draft.reduce((sum, it) => sum + it.ValorParcial, 0))}
            </Text>
            <Button title="Salvar compra" onPress={save} />
            <Button
              secondary
              title="Cancelar"
              onPress={() => {
                setEditing(false);
                setMessage("");
                resetItem();
              }}
            />
          </Card>
        </>
      ) : (
        <>
          <Button
            title="+ Nova compra"
            disabled={!clients.length || !products.length}
            onPress={() => start()}
          />
          {(!clients.length || !products.length) && (
            <Card>
              <Text style={s.muted}>
                Cadastre pelo menos um cliente e um produto para registrar
                compras.
              </Text>
              <Button
                secondary
                title="Cadastrar cliente"
                onPress={() => router.push("/clientes")}
              />
              <Button
                secondary
                title="Cadastrar produto"
                onPress={() => router.push("/produtos")}
              />
            </Card>
          )}
          <Field
            label="Buscar por cliente, código ou data"
            value={search}
            onChangeText={setSearch}
          />
          {filtered.map((row) => (
            <Card key={row.CodigoCompra}>
              <Text style={s.badge}>
                COMPRA #{row.CodigoCompra} · {displayDate(row.DataCompra)}
              </Text>
              <Text style={s.name}>{row.Nome}</Text>
              <Text style={s.title}>{money(row.ValorTotal)}</Text>
              <View style={s.row}>
                <Button
                  secondary
                  title="Ver / editar"
                  onPress={() => start(row)}
                />
                <Button danger title="Excluir" onPress={() => remove(row)} />
              </View>
            </Card>
          ))}
          {!filtered.length && (
            <Empty
              text={
                rows.length
                  ? "Nenhuma compra encontrada."
                  : "Sua primeira compra vai aparecer aqui. Toque em Nova compra para começar."
              }
            />
          )}
        </>
      )}
    </Page>
  );
}

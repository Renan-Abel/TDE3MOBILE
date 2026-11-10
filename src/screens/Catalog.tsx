import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import * as repo from "../data/repository";
import { money } from "../data/validation";
import {
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Notice,
  Page,
  confirmDelete,
  errorMessage,
  s,
} from "../components/ui";
export default function Catalog({ kind }: { kind: "clients" | "products" }) {
  const db = useSQLiteContext();
  const isClient = kind === "clients";
  const [rows, setRows] = useState<(repo.Client | repo.Product)[]>([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [id, setId] = useState<number>();
  const [name, setName] = useState("");
  const [documentOrCategory, setDocumentOrCategory] = useState("");
  const [phoneOrPrice, setPhoneOrPrice] = useState("");
  const [stock, setStock] = useState("");
  const load = useCallback(() => {
    setRows(isClient ? repo.clients(db) : repo.products(db));
  }, [db, isClient]);
  useFocusEffect(
    useCallback(() => {
      try {
        load();
      } catch (e) {
        setMessage(errorMessage(e));
      }
    }, [load]),
  );
  function start(row?: repo.Client | repo.Product) {
    setId(
      row
        ? "CodigoCliente" in row
          ? row.CodigoCliente
          : row.CodigoProduto
        : undefined,
    );
    setName(row ? ("Nome" in row ? row.Nome : row.NomeProduto) : "");
    setDocumentOrCategory(row ? ("RG" in row ? row.RG : row.Tipo) : "");
    setPhoneOrPrice(
      row
        ? "Telefone" in row
          ? row.Telefone
          : (row.Preco / 100).toFixed(2).replace(".", ",")
        : "",
    );
    setStock(row && "QtdEstoque" in row ? String(row.QtdEstoque) : "0");
    setEditing(true);
    setMessage("");
  }
  function save() {
    try {
      if (isClient)
        repo.saveClient(db, id, name, documentOrCategory, phoneOrPrice);
      else
        repo.saveProduct(db, id, name, documentOrCategory, phoneOrPrice, stock);
      setEditing(false);
      load();
      setMessage(
        isClient ? "Cliente salvo. Tudo certo!" : "Produto salvo. Tudo certo!",
      );
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  function remove(row: repo.Client | repo.Product) {
    confirmDelete(() => {
      try {
        if ("CodigoCliente" in row) repo.removeClient(db, row.CodigoCliente);
        else repo.removeProduct(db, row.CodigoProduto);
        load();
        setMessage("Registro excluído.");
      } catch (e) {
        setMessage(errorMessage(e));
      }
    });
  }
  const filtered = rows.filter((row) =>
    Object.values(row)
      .join(" ")
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <Page>
      <Heading
        title={isClient ? "Seus clientes" : "Seus produtos"}
        subtitle={
          isClient
            ? "Mantenha os contatos sempre à mão."
            : "Preços e estoque organizados."
        }
      />
      <Notice text={message} />
      {editing ? (
        <Card>
          <Text style={s.name}>
            {id ? "Editar" : "Cadastrar"} {isClient ? "cliente" : "produto"}
          </Text>
          <Field
            label="Nome"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
          <Field
            label={isClient ? "RG (somente números)" : "Tipo"}
            value={documentOrCategory}
            onChangeText={setDocumentOrCategory}
            maxLength={isClient ? 10 : 50}
            keyboardType={isClient ? "number-pad" : "default"}
          />
          <Field
            label={isClient ? "Telefone com DDD" : "Preço (R$)"}
            value={phoneOrPrice}
            onChangeText={setPhoneOrPrice}
            maxLength={isClient ? 14 : 12}
            keyboardType={isClient ? "phone-pad" : "decimal-pad"}
            placeholder={isClient ? "11999999999" : "29,90"}
          />
          {!isClient && (
            <Field
              label="Quantidade em estoque"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
              maxLength={10}
            />
          )}
          <Button title="Salvar" onPress={save} />
          <Button
            secondary
            title="Cancelar"
            onPress={() => {
              setEditing(false);
              setMessage("");
            }}
          />
        </Card>
      ) : (
        <>
          <Button
            title={isClient ? "+ Novo cliente" : "+ Novo produto"}
            onPress={() => start()}
          />
          <Field
            label={isClient ? "Buscar cliente" : "Buscar produto"}
            placeholder={
              isClient
                ? "Digite um nome, RG ou telefone"
                : "Digite o nome ou tipo do produto"
            }
            value={search}
            onChangeText={setSearch}
          />
          <Text style={s.badge}>
            {filtered.length}{" "}
            {isClient
              ? filtered.length === 1
                ? "cliente encontrado"
                : "clientes encontrados"
              : filtered.length === 1
                ? "produto encontrado"
                : "produtos encontrados"}
          </Text>
          {filtered.map((row) => (
            <Card
              key={
                "CodigoCliente" in row ? row.CodigoCliente : row.CodigoProduto
              }
            >
              <Text style={s.name}>
                {"Nome" in row ? row.Nome : row.NomeProduto}
              </Text>
              {"RG" in row ? (
                <Text style={s.muted}>
                  RG: {row.RG}
                  {"\n"}Telefone: {row.Telefone}
                </Text>
              ) : (
                <>
                  <Text style={s.muted}>
                    {row.Tipo} · {row.QtdEstoque} em estoque
                  </Text>
                  <Text style={s.name}>{money(row.Preco)}</Text>
                </>
              )}
              <View style={s.row}>
                <Button secondary title="Editar" onPress={() => start(row)} />
                <Button danger title="Excluir" onPress={() => remove(row)} />
              </View>
            </Card>
          ))}
          {!filtered.length && (
            <Empty
              text={
                rows.length
                  ? "Não encontramos resultados. Tente buscar por outro termo."
                  : "Nenhum registro ainda. Toque no botão acima para cadastrar."
              }
            />
          )}
        </>
      )}
    </Page>
  );
}

import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import {
  Card,
  Heading,
  Page,
  Button,
  s,
  Notice,
  errorMessage,
} from "../components/ui";
export default function Home() {
  const db = useSQLiteContext();
  const [counts, setCounts] = useState({
    clients: 0,
    products: 0,
    purchases: 0,
  });
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      try {
        setCounts({
          clients: db.getFirstSync<{
            n: number;
          }>("SELECT COUNT(*) n FROM Cliente")!.n,
          products: db.getFirstSync<{
            n: number;
          }>("SELECT COUNT(*) n FROM Produto")!.n,
          purchases: db.getFirstSync<{
            n: number;
          }>("SELECT COUNT(*) n FROM Compra")!.n,
        });
        setError("");
      } catch (e) {
        setError(errorMessage(e));
      }
    }, [db]),
  );
  return (
    <Page>
      <Heading
        title="Seu negócio em dia."
        subtitle="Clientes, produtos e compras em um só lugar."
      />
      <Notice text={error} />
      <Card>
        <Text style={s.badge}>VISÃO GERAL</Text>
        <View style={s.row}>
          <Text style={s.name}>{counts.clients} clientes</Text>
          <Text style={s.name}>{counts.products} produtos</Text>
          <Text style={s.name}>{counts.purchases} compras</Text>
        </View>
        <Text style={s.muted}>
          Para registrar uma compra, primeiro cadastre o cliente e os produtos.
        </Text>
      </Card>
      <Card>
        <Text style={s.name}>Clientes</Text>
        <Text style={s.muted}>
          Tenha os contatos dos seus clientes sempre à mão.
        </Text>
        <Button title="Ver clientes" onPress={() => router.push("/clientes")} />
      </Card>
      <Card>
        <Text style={s.name}>Produtos</Text>
        <Text style={s.muted}>Organize os produtos, preços e estoque.</Text>
        <Button title="Ver produtos" onPress={() => router.push("/produtos")} />
      </Card>
      <Card>
        <Text style={s.name}>Compras</Text>
        <Text style={s.muted}>
          Escolha o cliente, adicione itens e acompanhe os totais.
        </Text>
        <Button title="Ver compras" onPress={() => router.push("/compras")} />
      </Card>
      <Text style={s.muted}>
        Seus dados ficam salvos neste dispositivo e podem ser consultados sem
        internet.
      </Text>
    </Page>
  );
}

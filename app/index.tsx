import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface Pokemon {
  name: string;
  image: string;
  imageBack: string;
  types: PokemonTypes[];
}

interface PokemonTypes {
  type: {
    name: string;
    url: string;
  };
}

const colorsByType: Record<string, string> = {
  grass: "#8BC34A",
  fire: "#FF8A65",
  water: "#64B5F6",
  bug: "#9CCC65",
  electric: "#FFD54F",
  poison: "#BA68C8",
  normal: "#B0BEC5",
  ground: "#D7A86E",
  fairy: "#F8BBD0",
  fighting: "#E57373",
  psychic: "#F06292",
  rock: "#A1887F",
  ghost: "#9575CD",
  ice: "#81D4FA",
  dragon: "#7986CB",
  dark: "#616161",
  steel: "#90A4AE",
  flying: "#81A1F7",
};

const DEFAULT_TYPE_COLOR = "#E0E0E0";

export default function Index() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);

  useEffect(() => {
    fetchPokemon();
  }, []);

  async function fetchPokemon() {
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon/?limit=20");
      const data = await response.json();

      const detailedPokemons = await Promise.all(
        data.results.map(async (pokemon: any) => {
          const res = await fetch(pokemon.url);
          const details = await res.json();
          return {
            name: pokemon.name,
            image: details.sprites.front_default,
            imageBack: details.sprites.back_default,
            types: details.types,
          };
        }),
      );

      setPokemons(detailedPokemons);
    } catch (error) {
      console.error("Failed to fetch pokemon", error);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        gap: 16,
        padding: 16,
      }}
    >
      {pokemons.map((pokemon) => {
        const primaryType = pokemon.types?.[0]?.type?.name;
        const typeColor = colorsByType[primaryType] ?? DEFAULT_TYPE_COLOR;

        return (
          <Link
            key={pokemon.name}
            href={{ pathname: "/details", params: { name: pokemon.name } }}
            asChild
          >
            <Pressable
              style={{
                backgroundColor: typeColor,
                padding: 20,
                borderRadius: 20,
              }}
            >
              <View>
                <Text style={styles.name}>{pokemon.name}</Text>
                <Text style={styles.type}>{primaryType}</Text>
                <View
                  style={{
                    flexDirection: "row",
                  }}
                >
                  <Image source={{ uri: pokemon.image }} style={{ width: 150, height: 150 }} />
                  <Image source={{ uri: pokemon.imageBack }} style={{ width: 150, height: 150 }} />
                </View>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  name: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  type: {
    fontSize: 20,
    fontWeight: "bold",
    color: "gray",
    textAlign: "center",
  },
});

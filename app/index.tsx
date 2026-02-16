import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colorsByType, DEFAULT_TYPE_COLOR } from "../constants/pokemon";

type PokemonTypeItem = {
  type: {
    name: string;
    url: string;
  };
};

type PokemonCard = {
  id: number;
  name: string;
  image: string;
  imageBack: string;
  types: PokemonTypeItem[];
};

type ApiListResponse = {
  results: {
    name: string;
    url: string;
  }[];
};

const PAGE_SIZE = 10;
const POKEMON_LIMIT = 151;

export default function Index() {
  const [pokemons, setPokemons] = useState<PokemonCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [sortMode, setSortMode] = useState<"id" | "name">("id");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPokemonData = useCallback(async () => {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/?offset=0&limit=${POKEMON_LIMIT}`);
    const data = (await response.json()) as ApiListResponse;

    const detailedPokemons = await Promise.all(
      data.results.map(async (pokemon) => {
        const res = await fetch(pokemon.url);
        const details = await res.json();
        return {
          id: details.id,
          name: pokemon.name,
          image: details.sprites.front_default,
          imageBack: details.sprites.back_default,
          types: details.types,
        } as PokemonCard;
      }),
    );

    return detailedPokemons;
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchPokemonData();
      setPokemons(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to fetch pokemon", error);
    } finally {
      setLoading(false);
    }
  }, [fetchPokemonData]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const pokemon of pokemons) {
      for (const item of pokemon.types) {
        types.add(item.type.name);
      }
    }
    return ["all", ...Array.from(types).sort()];
  }, [pokemons]);

  const filteredPokemons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const list = pokemons.filter((pokemon) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        pokemon.name.includes(normalizedQuery) ||
        pokemon.id.toString().includes(normalizedQuery);

      const matchesType =
        selectedType === "all" || pokemon.types.some((entry) => entry.type.name === selectedType);

      return matchesQuery && matchesType;
    });

    return [...list].sort((a, b) => {
      if (sortMode === "name") {
        return a.name.localeCompare(b.name);
      }
      return a.id - b.id;
    });
  }, [pokemons, query, selectedType, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredPokemons.length / PAGE_SIZE));
  const showPagination = filteredPokemons.length > PAGE_SIZE;

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedType, sortMode]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedPokemons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredPokemons.slice(start, end);
  }, [currentPage, filteredPokemons]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await fetchPokemonData();
      setPokemons(data);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to refresh pokemon", error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPokemonData]);

  function renderHeader() {
    return (
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Pokedex</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or id"
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>Type Filter</Text>
          <Pressable
            style={styles.sortButton}
            onPress={() => setSortMode((prev) => (prev === "id" ? "name" : "id"))}
          >
            <Text style={styles.sortButtonText}>Sort: {sortMode.toUpperCase()}</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {availableTypes.map((type) => {
            const selected = selectedType === type;
            const bg = type === "all" ? "#607D8B" : colorsByType[type] ?? DEFAULT_TYPE_COLOR;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: bg,
                    opacity: selected ? 1 : 0.55,
                    borderWidth: selected ? 2 : 0,
                    borderColor: "#222",
                  },
                ]}
              >
                <Text style={styles.chipText}>{type}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  function renderFooter() {
    if (!showPagination) {
      return null;
    }

    const canGoPrev = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
      <View style={styles.paginationContainer}>
        <Pressable
          onPress={() => canGoPrev && setCurrentPage((prev) => prev - 1)}
          style={[styles.paginationButton, !canGoPrev && styles.disabledButton]}
        >
          <Text style={styles.paginationText}>Previous</Text>
        </Pressable>

        <Text style={styles.pageInfo}>
          Page {currentPage} / {totalPages}
        </Text>

        <Pressable
          onPress={() => canGoNext && setCurrentPage((prev) => prev + 1)}
          style={[styles.paginationButton, !canGoNext && styles.disabledButton]}
        >
          <Text style={styles.paginationText}>Next</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading pokemon...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={paginatedPokemons}
      keyExtractor={(item) => item.name}
      contentContainerStyle={styles.listContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={<Text style={styles.emptyText}>No pokemon found.</Text>}
      ListFooterComponent={renderFooter}
      renderItem={({ item }) => {
        const primaryType = item.types?.[0]?.type?.name;
        const typeColor = colorsByType[primaryType] ?? DEFAULT_TYPE_COLOR;

        return (
          <Link href={{ pathname: "/details", params: { name: item.name } }} asChild>
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: typeColor,
                },
              ]}
            >
              <Text style={styles.name}>#{item.id.toString().padStart(3, "0")} {item.name}</Text>
              <View style={styles.typeRow}>
                {item.types.map((entry) => (
                  <Text key={`${item.name}-${entry.type.name}`} style={styles.typeTag}>
                    {entry.type.name}
                  </Text>
                ))}
              </View>

              <View style={styles.imageRow}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <Image source={{ uri: item.imageBack }} style={styles.image} />
              </View>
            </Pressable>
          </Link>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  listContainer: {
    gap: 12,
    padding: 12,
    paddingBottom: 24,
  },
  headerContainer: {
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: "#111",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#1f2937",
    borderRadius: 999,
  },
  sortButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    gap: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeTag: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  imageRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  image: {
    width: 120,
    height: 120,
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    marginTop: 16,
  },
  paginationContainer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  paginationButton: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 9,
    borderRadius: 10,
    minWidth: 92,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.45,
  },
  paginationText: {
    color: "white",
    fontWeight: "700",
  },
  pageInfo: {
    fontWeight: "700",
    color: "#374151",
  },
});

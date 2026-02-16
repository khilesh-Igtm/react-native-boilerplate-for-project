import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { colorsByType, DEFAULT_TYPE_COLOR } from "../constants/pokemon";

type PokemonType = {
  slot: number;
  type: {
    name: string;
    url: string;
  };
};

type PokemonStat = {
  base_stat: number;
  stat: {
    name: string;
  };
};

type PokemonAbility = {
  ability: {
    name: string;
  };
  is_hidden: boolean;
};

type PokemonDetails = {
  id: number;
  name: string;
  base_experience: number;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
    other?: {
      "official-artwork"?: {
        front_default?: string;
      };
    };
  };
  types: PokemonType[];
  stats: PokemonStat[];
  abilities: PokemonAbility[];
  species: {
    url: string;
  };
};

type TypeEndpoint = {
  damage_relations: {
    double_damage_from: {
      name: string;
    }[];
  };
};

type SpeciesEndpoint = {
  evolution_chain: {
    url: string;
  };
};

type EvolutionNode = {
  species: {
    name: string;
  };
  evolves_to: EvolutionNode[];
};

type EvolutionEndpoint = {
  chain: EvolutionNode;
};

function normalizeParam(value?: string | string[]) {
  if (!value) {
    return "";
  }
  return Array.isArray(value) ? value[0] : value;
}

function flattenEvolutionChain(node: EvolutionNode): string[] {
  const names = [node.species.name];

  for (const child of node.evolves_to) {
    names.push(...flattenEvolutionChain(child));
  }

  return names;
}

function prettyStatName(value: string) {
  return value.replace(/-/g, " ").toUpperCase();
}

export default function Details() {
  const params = useLocalSearchParams<{ name?: string | string[] }>();
  const [pokemon, setPokemon] = useState<PokemonDetails | null>(null);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [evolution, setEvolution] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pokemonName = normalizeParam(params.name);

  const primaryType = pokemon?.types?.[0]?.type?.name;
  const heroColor = useMemo(
    () => colorsByType[primaryType ?? ""] ?? DEFAULT_TYPE_COLOR,
    [primaryType],
  );

  const fetchWeaknesses = useCallback(async (types: PokemonType[]) => {
    const typeResponses = await Promise.all(types.map((item) => fetch(item.type.url)));
    const typeData = (await Promise.all(typeResponses.map((response) => response.json()))) as TypeEndpoint[];

    const weakSet = new Set<string>();
    for (const entry of typeData) {
      for (const weak of entry.damage_relations.double_damage_from) {
        weakSet.add(weak.name);
      }
    }

    return Array.from(weakSet).sort();
  }, []);

  const fetchEvolution = useCallback(async (speciesUrl: string) => {
    const speciesResponse = await fetch(speciesUrl);
    const speciesData = (await speciesResponse.json()) as SpeciesEndpoint;

    const evolutionResponse = await fetch(speciesData.evolution_chain.url);
    const evolutionData = (await evolutionResponse.json()) as EvolutionEndpoint;

    return flattenEvolutionChain(evolutionData.chain);
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!pokemonName) {
      setError("No pokemon name provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`);
      if (!response.ok) {
        throw new Error("Pokemon not found");
      }

      const data = (await response.json()) as PokemonDetails;
      setPokemon(data);

      const [weaknessData, evolutionData] = await Promise.all([
        fetchWeaknesses(data.types),
        fetchEvolution(data.species.url),
      ]);

      setWeaknesses(weaknessData);
      setEvolution(evolutionData);
    } catch (err) {
      console.error(err);
      setError("Failed to load pokemon details.");
    } finally {
      setLoading(false);
    }
  }, [fetchEvolution, fetchWeaknesses, pokemonName]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading details...</Text>
      </View>
    );
  }

  if (error || !pokemon) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Unknown error"}</Text>
      </View>
    );
  }

  const imageUrl =
    pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.heroCard, { backgroundColor: heroColor }]}>
        <Text style={styles.heroName}>#{pokemon.id.toString().padStart(3, "0")} {pokemon.name}</Text>
        {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.heroImage} /> : null}
        <View style={styles.typeRow}>
          {pokemon.types.map((entry) => (
            <Text style={styles.typeChip} key={entry.type.name}>
              {entry.type.name}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <Text style={styles.sectionText}>Height: {(pokemon.height / 10).toFixed(1)} m</Text>
        <Text style={styles.sectionText}>Weight: {(pokemon.weight / 10).toFixed(1)} kg</Text>
        <Text style={styles.sectionText}>Base Experience: {pokemon.base_experience}</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Abilities</Text>
        {pokemon.abilities.map((entry) => (
          <Text style={styles.sectionText} key={entry.ability.name}>
            {entry.ability.name}
            {entry.is_hidden ? " (hidden)" : ""}
          </Text>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Base Stats</Text>
        <View style={styles.statsWrap}>
          {pokemon.stats.map((entry) => {
            const pct = Math.min(100, (entry.base_stat / 180) * 100);
            return (
              <View key={entry.stat.name} style={styles.statRow}>
                <Text style={styles.statLabel}>{prettyStatName(entry.stat.name)}</Text>
                <View style={styles.statTrack}>
                  <View style={[styles.statFill, { width: `${pct}%`, backgroundColor: heroColor }]} />
                </View>
                <Text style={styles.statValue}>{entry.base_stat}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Weak Against</Text>
        <View style={styles.wrapRow}>
          {weaknesses.length === 0 ? (
            <Text style={styles.sectionText}>No weakness data</Text>
          ) : (
            weaknesses.map((name) => (
              <Text
                key={name}
                style={[
                  styles.badge,
                  { backgroundColor: colorsByType[name] ?? DEFAULT_TYPE_COLOR, opacity: 0.9 },
                ]}
              >
                {name}
              </Text>
            ))
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Evolution Chain</Text>
        <View style={styles.wrapRow}>
          {evolution.map((name, idx) => (
            <Text key={`${name}-${idx}`} style={styles.sectionText}>
              {idx === evolution.length - 1 ? name : `${name} -> `}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 10,
  },
  container: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  heroImage: {
    width: 220,
    height: 220,
    alignSelf: "center",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeChip: {
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionText: {
    fontSize: 15,
    textTransform: "capitalize",
  },
  statsWrap: {
    gap: 8,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    width: 70,
    fontSize: 11,
    fontWeight: "700",
  },
  statTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#ECEFF1",
    overflow: "hidden",
  },
  statFill: {
    height: "100%",
  },
  statValue: {
    width: 36,
    textAlign: "right",
    fontWeight: "700",
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});

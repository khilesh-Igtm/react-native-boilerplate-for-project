import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Details() {
  const params = useLocalSearchParams<{ name?: string }>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Pokemon Details</Text>
        <Text style={styles.value}>{params.name ?? "Unknown"}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  value: {
    fontSize: 18,
    color: "#444",
    textTransform: "capitalize",
  },
});

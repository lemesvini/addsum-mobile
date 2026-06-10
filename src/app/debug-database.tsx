import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, type Href } from "expo-router";
import {
  X,
  RefreshCw,
  Film,
  Building2,
  Users,
  MapPin,
  LayoutGrid,
  ArrowLeftRight,
  Database,
  ChevronDown,
  ChevronRight,
  Trash2,
  Sparkles,
} from "lucide-react-native";
import { useAuthUser } from "@/features/auth/auth-store";
import { resetOnboarding } from "@/features/onboarding/onboarding-store";
import { useDatabase } from "@/db/use-db";
import { COLLECTIONS } from "@/db/index";
import { useSync, type SyncStatus } from "@/sync/use-sync";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function syncStatusLabel(status: SyncStatus): string {
  switch (status) {
    case "idle":
      return "Ocioso";
    case "syncing":
      return "Sincronizando…";
    case "synced":
      return "Sincronizado";
    case "error":
      return "Erro";
    default:
      return status;
  }
}

const COLLECTION_ICONS: Record<string, React.ReactNode> = {
  movies: <Film size={18} color="#2C67CA" strokeWidth={2} />,
  producers: <Building2 size={18} color="#2C67CA" strokeWidth={2} />,
  users: <Users size={18} color="#2C67CA" strokeWidth={2} />,
  cities: <MapPin size={18} color="#2C67CA" strokeWidth={2} />,
  dashboard: <LayoutGrid size={18} color="#2C67CA" strokeWidth={2} />,
  syncQueue: <ArrowLeftRight size={18} color="#2C67CA" strokeWidth={2} />,
};

type CollectionData = {
  name: string;
  count: number;
  documents: any[];
};

type CollectionRowProps = {
  collection: CollectionData;
  expanded: boolean;
  onToggle: () => void;
  onClear: () => void;
  showSeparator: boolean;
};

function CollectionRow({
  collection,
  expanded,
  onToggle,
  onClear,
  showSeparator,
}: CollectionRowProps) {
  const icon = COLLECTION_ICONS[collection.name] ?? (
    <Database size={18} color="#2C67CA" strokeWidth={2} />
  );

  return (
    <>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.6}
        className="flex-row items-center px-4 py-3.5"
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </View>
        <Text className="flex-1 text-base font-medium text-card-foreground">
          {collection.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className="bg-muted rounded-full px-2 py-0.5">
            <Text className="text-xs font-semibold text-muted-foreground">
              {collection.count}
            </Text>
          </View>
          {expanded ? (
            <ChevronDown size={16} color="#9ca3af" strokeWidth={2} />
          ) : (
            <ChevronRight size={16} color="#9ca3af" strokeWidth={2} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="mx-4 mb-3 rounded-xl bg-muted/40 overflow-hidden border border-border">
          {collection.count === 0 ? (
            <View className="px-4 py-3">
              <Text className="text-sm text-muted-foreground italic">
                Nenhum documento nesta collection
              </Text>
            </View>
          ) : (
            <>
              <ScrollView
                className="max-h-36"
                nestedScrollEnabled
                contentContainerStyle={{ padding: 12 }}
              >
                <View>
                  {collection.documents.map((doc, idx) => (
                    <View
                      key={idx}
                      className="bg-background rounded-lg p-3 mb-2 border border-border"
                      style={{ minWidth: 280 }}
                    >
                      <Text
                        className="text-xs text-muted-foreground font-mono"
                        numberOfLines={12}
                      >
                        {JSON.stringify(doc, null, 2)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View className="h-px bg-border" />
              <TouchableOpacity
                onPress={onClear}
                activeOpacity={0.6}
                className="flex-row items-center px-4 py-3"
              >
                <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                  <Trash2 size={16} color="#ef4444" strokeWidth={2} />
                </View>
                <Text className="text-base font-medium text-destructive">
                  Limpar collection
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {!expanded && showSeparator && (
        <View className="ml-[60px] h-px bg-border" />
      )}
    </>
  );
}

export default function DebugDatabase() {
  const { db, resetDatabase } = useDatabase();
  const { refresh: syncRefresh, status: syncStatus } = useSync();
  const user = useAuthUser();
  const insets = useSafeAreaInsets();
  const [collectionsData, setCollectionsData] = useState<CollectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCollection, setExpandedCollection] = useState<string | null>(
    null,
  );
  const [syncing, setSyncing] = useState(false);

  const loadDatabaseData = useCallback(async () => {
    if (!db) return;

    try {
      setLoading(true);

      const data: CollectionData[] = [];

      for (const { name } of COLLECTIONS) {
        try {
          const collection = (db as any)[name];
          if (!collection) {
            data.push({ name, count: 0, documents: [] });
            continue;
          }
          const docs = await collection.find().exec();
          data.push({
            name,
            count: docs.length,
            documents: docs.map((doc: any) => {
              try {
                return doc.toJSON();
              } catch {
                return doc;
              }
            }),
          });
        } catch {
          data.push({ name, count: 0, documents: [] });
        }
      }

      setCollectionsData(data);
    } catch (error) {
      Alert.alert(
        "Erro",
        `Falha ao carregar banco de dados: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (cancelled) return;
      if (db) {
        await loadDatabaseData();
        return;
      }
      timeoutId = setTimeout(run, 500);
    };

    void run();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [db, loadDatabaseData]);

  const handleClearCollection = (collectionName: string) => {
    Alert.alert(
      "Limpar collection",
      `Deseja limpar todos os documentos de "${collectionName}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            try {
              if (!db) return;
              await (db as any)[collectionName]?.find().remove();
              await loadDatabaseData();
            } catch (error) {
              Alert.alert(
                "Erro",
                `Falha ao limpar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
              );
            }
          },
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Limpar banco de dados",
      "Deseja apagar TODOS os dados locais? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await resetDatabase();
              setExpandedCollection(null);
              setCollectionsData(
                COLLECTIONS.map(({ name }) => ({
                  name,
                  count: 0,
                  documents: [],
                })),
              );
            } catch (error) {
              Alert.alert(
                "Erro",
                `Falha ao limpar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncRefresh();
      await loadDatabaseData();
      Alert.alert("Sucesso", "Sync concluído com sucesso");
    } catch (error) {
      Alert.alert(
        "Erro",
        `Falha ao sincronizar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleResetOnboarding = () => {
    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    Alert.alert(
      "Resetar onboarding",
      `Remover o flag de onboarding para ${user.email}? O fluxo será exibido novamente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Resetar",
          style: "destructive",
          onPress: async () => {
            try {
              await resetOnboarding(user._id);
              router.replace("/(onboarding)" as Href);
            } catch (error) {
              Alert.alert(
                "Erro",
                `Falha ao resetar onboarding: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
              );
            }
          },
        },
      ],
    );
  };

  const totalDocs = collectionsData.reduce((acc, col) => acc + col.count, 0);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4 px-4 pt-6">
          {/* Header */}
          <View className="flex-row items-center mb-2">
            <View className="flex-1 items-center">
              <Text className="font-bold text-card-foreground">
                Debug Database
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              className="absolute right-0 h-8 w-8 items-center justify-center rounded-full bg-muted"
            >
              <X size={16} color="#9ca3af" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Stats card */}
          <Card className="bg-transparent !border-none p-4 rounded-2xl">
            {loading ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#2C67CA" />
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-baseline gap-1.5 mb-1">
                    <Text className="text-4xl font-bold text-card-foreground">
                      {totalDocs}
                    </Text>
                    <Text className="text-base text-muted-foreground">
                      docs
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    em {collectionsData.length} collections
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleSync}
                  disabled={syncing || syncStatus === "syncing"}
                  activeOpacity={0.7}
                  className="flex-row items-center gap-2 rounded-full bg-primary px-2 py-2"
                >
                  {syncing || syncStatus === "syncing" ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <RefreshCw size={18} strokeWidth={2} color="#ffffff" />
                  )}
                  <Text className="text-sm font-semibold text-foreground">
                    {syncStatusLabel(syncStatus)}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>

          {/* Collections */}
          {!loading && collectionsData.length > 0 && (
            <View>
              <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Collections
              </Text>
              <View className="bg-card rounded-2xl overflow-hidden">
                {collectionsData.map((collection, idx) => (
                  <CollectionRow
                    key={collection.name}
                    collection={collection}
                    expanded={expandedCollection === collection.name}
                    onToggle={() =>
                      setExpandedCollection(
                        expandedCollection === collection.name
                          ? null
                          : collection.name,
                      )
                    }
                    onClear={() => handleClearCollection(collection.name)}
                    showSeparator={idx < collectionsData.length - 1}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Danger zone */}
          {!loading && (
            <View style={{ marginTop: 8 }}>
              <Text className="mb-2 ml-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Zona de perigo
              </Text>
              <View className="bg-card rounded-2xl overflow-hidden">
                <TouchableOpacity
                  onPress={handleResetOnboarding}
                  activeOpacity={0.6}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Sparkles size={18} color="#2C67CA" strokeWidth={2} />
                  </View>
                  <Text className="flex-1 text-base font-medium text-card-foreground">
                    Resetar onboarding
                  </Text>
                  <ChevronRight size={17} color="#9ca3af" strokeWidth={2} />
                </TouchableOpacity>
                <View className="ml-[60px] h-px bg-border" />
                <TouchableOpacity
                  onPress={handleClearAll}
                  activeOpacity={0.6}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                    <Trash2 size={18} color="#ef4444" strokeWidth={2} />
                  </View>
                  <Text className="flex-1 text-base font-medium text-destructive">
                    Apagar banco de dados
                  </Text>
                  <ChevronRight size={17} color="#ef4444" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        className="items-center justify-center py-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <Text className="text-xs text-muted-foreground">
          Menu de desenvolvedor
        </Text>
      </View>
    </View>
  );
}

// ══════════════════════════════════════════════
// Progress Tab — Weight tracking + chart
// ══════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  RefreshControl, Alert, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/utils/constants';
import { dbAddPeso, dbSetMeta } from '@/services/database';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { user, cache, setCache, profile, setProfile, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [pesoInput, setPesoInput] = useState('');
  const [metaInput, setMetaInput] = useState('');

  const hist = cache.pesos;
  const meta = profile?.meta_peso || 0;

  async function savePeso() {
    const v = parseFloat(pesoInput);
    if (!v || v < 30 || v > 300) { Alert.alert('⚠️', 'Peso inválido'); return; }
    if (!user) return;
    try {
      await dbAddPeso(user.id, v, cache);
      setCache({ ...cache });
      setPesoInput('');
      if (profile) setProfile({ ...profile, peso_atual: v });
    } catch (e: any) { Alert.alert('Erro', e.message); }
  }

  async function saveMeta() {
    const v = parseFloat(metaInput);
    if (!v || v < 30 || v > 300) { Alert.alert('⚠️', 'Valor inválido'); return; }
    if (!user) return;
    try {
      await dbSetMeta(user.id, v);
      if (profile) setProfile({ ...profile, meta_peso: v });
      setMetaInput('');
    } catch (e: any) { Alert.alert('Erro', e.message); }
  }

  // Stats
  const atual = hist.length ? hist[hist.length - 1].p : 0;
  const inicial = hist.length ? hist[0].p : 0;
  const diff = (atual - inicial).toFixed(1);
  const diffNum = parseFloat(diff);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshData(); setRefreshing(false); }} tintColor={COLORS.lime} />}
    >
      {/* Stats */}
      {hist.length > 0 && (
        <View className="flex-row mx-4 mt-3 gap-3">
          <View className="flex-1 bg-surface border border-border rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-txt">{atual}kg</Text>
            <Text className="text-[10px] text-muted2">Atual</Text>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-xl p-3 items-center">
            <Text className="text-lg font-bold text-txt">{inicial}kg</Text>
            <Text className="text-[10px] text-muted2">Inicial</Text>
          </View>
          <View className="flex-1 bg-surface border border-border rounded-xl p-3 items-center">
            <Text className={`text-lg font-bold ${diffNum >= 0 ? 'text-ok' : 'text-danger'}`}>
              {diffNum >= 0 ? '+' : ''}{diff}kg
            </Text>
            <Text className="text-[10px] text-muted2">Ganho</Text>
          </View>
        </View>
      )}

      {/* Chart */}
      {hist.length > 1 && (
        <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-3 overflow-hidden">
          <LineChart
            data={{
              labels: hist.slice(-15).map(h => h.d.slice(0, 5)),
              datasets: [
                { data: hist.slice(-15).map(h => h.p), color: () => COLORS.lime, strokeWidth: 2 },
                ...(meta > 0 ? [{ data: hist.slice(-15).map(() => meta), color: () => COLORS.cyan, strokeWidth: 1.5, withDots: false } as any] : []),
              ],
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 1,
              color: () => COLORS.lime,
              labelColor: () => COLORS.muted,
              propsForDots: { r: '3', strokeWidth: '1', stroke: COLORS.lime },
              propsForBackgroundLines: { stroke: COLORS.surface2 },
            }}
            bezier
            style={{ borderRadius: 8 }}
          />
        </View>
      )}

      {/* Add Weight */}
      <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-4">
        <Text className="text-xs text-muted2 tracking-wider mb-2">⚖️ REGISTRAR PESO</Text>
        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-txt"
            placeholder="Ex: 65.5"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            value={pesoInput}
            onChangeText={setPesoInput}
          />
          <TouchableOpacity className="bg-lime rounded-xl px-6 justify-center" onPress={savePeso}>
            <Text className="text-bg font-bold">Salvar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Set Goal */}
      <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-4">
        <Text className="text-xs text-muted2 tracking-wider mb-2">
          🎯 META {meta > 0 ? `(${meta}kg)` : ''}
        </Text>
        <View className="flex-row gap-3">
          <TextInput
            className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-txt"
            placeholder="Ex: 80"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
            value={metaInput}
            onChangeText={setMetaInput}
          />
          <TouchableOpacity className="bg-cyan rounded-xl px-6 justify-center" onPress={saveMeta}>
            <Text className="text-bg font-bold">Definir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* History */}
      <View className="px-4 mt-3 pb-8">
        <Text className="text-xs text-muted2 tracking-wider mb-2">HISTÓRICO</Text>
        {!hist.length ? (
          <View className="items-center py-8">
            <Text className="text-3xl mb-2">📊</Text>
            <Text className="text-muted2 text-sm">Nenhum registro ainda</Text>
          </View>
        ) : (
          [...hist].reverse().slice(0, 15).map((h, ri) => {
            const idx = hist.length - 1 - ri;
            const prev = idx > 0 ? hist[idx - 1].p : null;
            const d = prev != null ? (h.p - prev).toFixed(1) : null;
            const dNum = d ? parseFloat(d) : null;
            return (
              <View key={h.id} className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-1">
                <Text className="text-muted2 text-xs flex-1">{h.d}</Text>
                <Text className="font-bold text-txt text-sm mr-3">{h.p} kg</Text>
                {dNum !== null && (
                  <Text className={`text-[10px] ${dNum >= 0 ? 'text-ok' : 'text-danger'}`}>
                    {dNum >= 0 ? '+' : ''}{d}kg
                  </Text>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

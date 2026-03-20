// ══════════════════════════════════════════════
// Water Tab — Ring progress, add water, log
// ══════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  RefreshControl, Alert,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { dbAddAgua, dbDelAgua, dbResetAgua } from '@/services/database';
import { WATER_GOAL, COLORS } from '@/utils/constants';

const RADIUS = 60;
const STROKE = 8;
const CIRC = 2 * Math.PI * RADIUS;

export default function WaterScreen() {
  const { user, cache, setCache, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [customMl, setCustomMl] = useState('');

  const log = cache.waterLog;
  const total = log.reduce((s, w) => s + w.ml, 0);
  const pct = Math.min(100, Math.round((total / WATER_GOAL) * 100));
  const dashOffset = CIRC - (CIRC * pct / 100);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  async function addWater(ml: number) {
    if (!user) return;
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const tmpId = 'tmp_' + Date.now();
    const newCache = { ...cache, waterLog: [...cache.waterLog, { id: tmpId, ml, t: hora }] };
    setCache(newCache);
    try { await dbAddAgua(user.id, ml, tmpId, newCache); } catch (e) { console.error(e); }
  }

  async function addCustom() {
    const v = parseInt(customMl);
    if (!v || v < 1 || v > 5000) { Alert.alert('⚠️', 'Valor inválido (1-5000)'); return; }
    setCustomMl('');
    await addWater(v);
  }

  async function deleteEntry(id: string) {
    if (!user) return;
    const newCache = { ...cache, waterLog: cache.waterLog.filter(w => w.id !== id) };
    setCache(newCache);
    try { await dbDelAgua(user.id, id); } catch (e) { console.error(e); }
  }

  async function resetWater() {
    Alert.alert('Zerar', 'Zerar toda a água de hoje?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Zerar', style: 'destructive', onPress: async () => {
          if (!user) return;
          const newCache = { ...cache, waterLog: [] };
          setCache(newCache);
          try { await dbResetAgua(user.id); } catch (e) { console.error(e); }
        },
      },
    ]);
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.cyan} />}
    >
      {/* Ring Progress */}
      <View className="items-center mt-6 mb-6">
        <View className="relative items-center justify-center">
          <Svg width={RADIUS * 2 + STROKE * 2} height={RADIUS * 2 + STROKE * 2}>
            <Circle
              cx={RADIUS + STROKE} cy={RADIUS + STROKE} r={RADIUS}
              stroke={COLORS.surface2} strokeWidth={STROKE} fill="none"
            />
            <Circle
              cx={RADIUS + STROKE} cy={RADIUS + STROKE} r={RADIUS}
              stroke={COLORS.cyan} strokeWidth={STROKE} fill="none"
              strokeDasharray={CIRC} strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90" origin={`${RADIUS + STROKE}, ${RADIUS + STROKE}`}
            />
          </Svg>
          <View className="absolute items-center">
            <Text className="text-3xl font-bold text-cyan">{total}</Text>
            <Text className="text-[10px] text-muted2">ml</Text>
          </View>
        </View>
        <Text className="text-muted2 text-xs mt-2">{pct}% da meta ({WATER_GOAL}ml)</Text>
      </View>

      {/* Quick Add Buttons */}
      <View className="flex-row px-4 gap-3 mb-4">
        {[200, 300, 500].map(ml => (
          <TouchableOpacity
            key={ml}
            className="flex-1 bg-surface border border-border rounded-xl py-4 items-center"
            onPress={() => addWater(ml)}
            activeOpacity={0.7}
          >
            <Text className="text-cyan text-lg font-bold">+{ml}</Text>
            <Text className="text-[10px] text-muted2">ml</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Input */}
      <View className="flex-row px-4 gap-3 mb-4">
        <TextInput
          className="flex-1 bg-surface2 border border-border rounded-xl px-4 py-3 text-txt"
          placeholder="Quantidade personalizada (ml)"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={customMl}
          onChangeText={setCustomMl}
        />
        <TouchableOpacity
          className="bg-cyan rounded-xl px-6 py-3 items-center justify-center"
          onPress={addCustom}
        >
          <Text className="text-bg font-bold">+</Text>
        </TouchableOpacity>
      </View>

      {/* Reset Button */}
      <TouchableOpacity className="mx-4 mb-4 py-2 items-center" onPress={resetWater}>
        <Text className="text-danger text-xs">🗑️ Zerar água de hoje</Text>
      </TouchableOpacity>

      {/* Water Log */}
      <View className="px-4 pb-8">
        <Text className="text-xs text-muted2 tracking-wider mb-2">REGISTRO DE HOJE</Text>
        {!log.length ? (
          <View className="items-center py-8">
            <Text className="text-3xl mb-2">💧</Text>
            <Text className="text-muted2 text-sm">Nenhum registro hoje</Text>
          </View>
        ) : (
          [...log].reverse().map(w => (
            <View key={w.id} className="flex-row items-center bg-surface border border-border rounded-xl px-4 py-3 mb-2">
              <Text className="text-cyan font-bold text-sm flex-1">{w.ml}ml</Text>
              <Text className="text-muted2 text-xs mr-3">{w.t}</Text>
              <TouchableOpacity onPress={() => deleteEntry(w.id)}>
                <Text className="text-danger text-xs">✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

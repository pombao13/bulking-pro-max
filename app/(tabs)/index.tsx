// ══════════════════════════════════════════════
// Meals Tab — Main tab with meal list, pie chart
// ══════════════════════════════════════════════
import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, RefreshControl, Alert,
  Dimensions, TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { today, nowTime, fmtHora } from '@/utils/formatters';
import { PHASE_LIMIT, PHASE_PESO, COLORS } from '@/utils/constants';
import { dbSetMealCheck, dbSaveDiet } from '@/services/database';
import { PieChart } from 'react-native-chart-kit';
import type { Meal, Ingredient } from '@/types';

const screenWidth = Dimensions.get('window').width;

export default function MealsScreen() {
  const { user, cache, setCache, refeicoes, setRefeicoes, fase, tipo, setFase, setTipo, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{ meal: Meal; idx: number } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMealName, setNewMealName] = useState('');
  const [newMealHora, setNewMealHora] = useState('');
  const [newMealIngrs, setNewMealIngrs] = useState<Ingredient[]>([]);
  const [ingrForm, setIngrForm] = useState({ nome: '', qtd: '', kcal: '', c: '', p: '', f: '' });

  const meals = refeicoes[fase]?.[tipo] || [];
  const now = nowTime();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Day totals
  const totals = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.macros.kcal, c: a.c + m.macros.c, p: a.p + m.macros.p, f: a.f + m.macros.f }),
    { kcal: 0, c: 0, p: 0, f: 0 }
  );
  const doneCount = meals.filter((_, i) => cache.mealChecks[`m_${fase}_${tipo}_${i}_${today()}`]).length;
  const pct = meals.length ? Math.round((doneCount / meals.length) * 100) : 0;

  // Pie chart data
  const pieData = [
    { name: 'Carbs', population: totals.c || 0, color: COLORS.warn, legendFontColor: COLORS.txt, legendFontSize: 11 },
    { name: 'Prot', population: totals.p || 0, color: COLORS.ok, legendFontColor: COLORS.txt, legendFontSize: 11 },
    { name: 'Gord', population: totals.f || 0, color: COLORS.pink, legendFontColor: COLORS.txt, legendFontSize: 11 },
  ].filter(d => d.population > 0);

  async function toggleMeal(idx: number) {
    if (!user) return;
    const key = `m_${fase}_${tipo}_${idx}_${today()}`;
    const isDone = !!cache.mealChecks[key];
    try {
      await dbSetMealCheck(user.id, fase, tipo, idx, !isDone, cache);
      setCache({ ...cache });
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  async function deleteMeal(idx: number) {
    Alert.alert('Excluir', 'Excluir esta refeição?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          const list = [...(refeicoes[fase]?.[tipo] || [])];
          list.splice(idx, 1);
          const newRef = { ...refeicoes, [fase]: { ...refeicoes[fase], [tipo]: list } };
          setRefeicoes(newRef);
          if (user) await dbSaveDiet(user.id, { fases: newRef });
          setSelectedMeal(null);
        },
      },
    ]);
  }

  function addIngredient() {
    if (!ingrForm.nome.trim()) return Alert.alert('⚠️', 'Nome do ingrediente');
    if (!ingrForm.qtd.trim()) return Alert.alert('⚠️', 'Digite a quantidade');
    setNewMealIngrs([...newMealIngrs, {
      id: 'custom', nome: ingrForm.nome.trim(), qtd: ingrForm.qtd.trim(),
      amount: parseFloat(ingrForm.qtd) || 0,
      kcal: Math.round(parseFloat(ingrForm.kcal) || 0),
      c: Math.round(parseFloat(ingrForm.c) || 0),
      p: Math.round(parseFloat(ingrForm.p) || 0),
      f: Math.round(parseFloat(ingrForm.f) || 0),
    }]);
    setIngrForm({ nome: '', qtd: '', kcal: '', c: '', p: '', f: '' });
  }

  async function saveMeal() {
    if (!newMealName.trim()) return Alert.alert('⚠️', 'Nome da refeição');
    if (!newMealHora.trim() || !/^\d{2}:\d{2}$/.test(newMealHora)) return Alert.alert('⚠️', 'Hora inválida');
    const macros = newMealIngrs.reduce((a, b) => ({
      kcal: a.kcal + b.kcal, c: a.c + b.c, p: a.p + b.p, f: a.f + b.f,
    }), { kcal: 0, c: 0, p: 0, f: 0 });
    const meal: Meal = { nome: newMealName, hora: newMealHora, icon: '🍽️', ingrs: [...newMealIngrs], macros };
    const list = [...(refeicoes[fase]?.[tipo] || []), meal].sort((a, b) => a.hora.localeCompare(b.hora));
    const newRef = { ...refeicoes, [fase]: { ...refeicoes[fase], [tipo]: list } };
    setRefeicoes(newRef);
    if (user) await dbSaveDiet(user.id, { fases: newRef });
    setShowAddModal(false);
    setNewMealName(''); setNewMealHora(''); setNewMealIngrs([]);
  }

  // Phase banner
  const lastPeso = cache.pesos.length ? cache.pesos[cache.pesos.length - 1].p : 0;
  const showBanner = lastPeso >= (PHASE_LIMIT[fase] || 999) && parseInt(fase) < 7;

  return (
    <View className="flex-1 bg-bg">
      {/* Phase / Type Selector */}
      <View className="flex-row px-4 pt-3 pb-2 gap-3">
        <View className="flex-1">
          <Text className="text-[10px] text-muted2 tracking-wider mb-1">FASE</Text>
          <View className="flex-row gap-1">
            {['1','2','3','4','5','6','7'].map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setFase(f)}
                className={`flex-1 py-2 rounded-lg items-center ${fase === f ? 'bg-lime' : 'bg-surface2 border border-border'}`}
              >
                <Text className={`text-xs font-bold ${fase === f ? 'text-bg' : 'text-muted2'}`}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View className="w-28">
          <Text className="text-[10px] text-muted2 tracking-wider mb-1">DIA</Text>
          <View className="flex-row gap-1">
            {(['trabalho', 'folga'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTipo(t)}
                className={`flex-1 py-2 rounded-lg items-center ${tipo === t ? 'bg-cyan' : 'bg-surface2 border border-border'}`}
              >
                <Text className={`text-[10px] font-bold ${tipo === t ? 'text-bg' : 'text-muted2'}`}>
                  {t === 'trabalho' ? '🔨' : '😴'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Phase Banner */}
      {showBanner && (
        <TouchableOpacity
          className="mx-4 mb-2 bg-lime/10 border border-lime/30 rounded-xl p-3 flex-row items-center"
          onPress={() => { const next = Math.min(7, parseInt(fase) + 1); setFase(String(next)); }}
        >
          <Text className="text-lg mr-2">🚀</Text>
          <Text className="text-lime text-xs font-bold flex-1">
            Você atingiu {PHASE_LIMIT[fase]}kg! AVANÇAR PARA FASE {parseInt(fase) + 1}
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.lime} />}
      >
        {/* Day Stats */}
        <View className="mx-4 mt-2 bg-surface rounded-xl border border-border p-4">
          <View className="flex-row justify-between mb-3">
            <View className="items-center flex-1">
              <Text className="text-lime text-xl font-bold">{totals.kcal}</Text>
              <Text className="text-[10px] text-muted2">KCAL</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-warn text-sm font-bold">{totals.c}g</Text>
              <Text className="text-[10px] text-muted2">CARBS</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-ok text-sm font-bold">{totals.p}g</Text>
              <Text className="text-[10px] text-muted2">PROT</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-pink text-sm font-bold">{totals.f}g</Text>
              <Text className="text-[10px] text-muted2">GORD</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View className="bg-surface2 rounded-full h-2 overflow-hidden">
            <View className="bg-lime rounded-full h-2" style={{ width: `${pct}%` }} />
          </View>
          <Text className="text-muted2 text-[10px] text-center mt-1">{doneCount}/{meals.length} REFEIÇÕES · {pct}%</Text>
        </View>

        {/* Pie Chart */}
        {pieData.length > 0 && (
          <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-3 items-center">
            <PieChart
              data={pieData}
              width={screenWidth - 64}
              height={140}
              chartConfig={{ color: () => '#fff', labelColor: () => COLORS.txt, backgroundGradientFrom: COLORS.surface, backgroundGradientTo: COLORS.surface }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}

        {/* Meal List */}
        <View className="px-4 mt-3 pb-4">
          {!meals.length ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-2">🍽️</Text>
              <Text className="text-muted2 text-sm">Nenhuma refeição cadastrada para esta fase.</Text>
            </View>
          ) : (
            meals.map((m, i) => {
              const key = `m_${fase}_${tipo}_${i}_${today()}`;
              const done = !!cache.mealChecks[key];
              const isUp = !done && m.hora === now;
              return (
                <TouchableOpacity
                  key={i}
                  className={`flex-row items-center p-4 mb-2 rounded-xl border ${done ? 'bg-lime/5 border-lime/20' : isUp ? 'bg-cyan/5 border-cyan/30' : 'bg-surface border-border'}`}
                  onPress={() => setSelectedMeal({ meal: m, idx: i })}
                  activeOpacity={0.7}
                >
                  <Text className="text-2xl mr-3">{m.icon}</Text>
                  <View className="flex-1">
                    <Text className={`font-bold text-sm ${done ? 'text-lime/60' : 'text-txt'}`}>{m.nome}</Text>
                    <Text className="text-muted2 text-[11px]">⏰ {m.hora}</Text>
                    <Text className="text-muted text-[10px]">{m.macros.kcal}kcal · C{m.macros.c} P{m.macros.p} G{m.macros.f}</Text>
                  </View>
                  <View className={`w-7 h-7 rounded-full items-center justify-center ${done ? 'bg-lime' : 'border border-border'}`}>
                    {done && <Text className="text-bg text-xs font-bold">✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB — Add Meal */}
      <TouchableOpacity
        className="absolute bottom-20 right-5 bg-lime w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text className="text-bg text-2xl font-bold">+</Text>
      </TouchableOpacity>

      {/* Meal Detail Modal */}
      <Modal visible={!!selectedMeal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface rounded-t-3xl border-t border-border p-6 max-h-[80%]">
            {selectedMeal && (
              <ScrollView>
                <Text className="text-xl font-bold text-txt mb-1">
                  {selectedMeal.meal.icon} {selectedMeal.meal.nome}
                </Text>
                <Text className="text-muted2 text-sm mb-4">⏰ {selectedMeal.meal.hora}</Text>

                {/* Ingredients table */}
                {selectedMeal.meal.ingrs?.length > 0 && (
                  <View className="mb-4">
                    <View className="flex-row bg-surface2 rounded-t-lg p-2">
                      <Text className="flex-1 text-[10px] text-muted2 font-bold">INGREDIENTE</Text>
                      <Text className="w-12 text-[10px] text-muted2 font-bold text-center">QTD</Text>
                      <Text className="w-10 text-[10px] text-muted2 font-bold text-center">KCAL</Text>
                      <Text className="w-8 text-[10px] text-muted2 font-bold text-center">C</Text>
                      <Text className="w-8 text-[10px] text-muted2 font-bold text-center">P</Text>
                      <Text className="w-8 text-[10px] text-muted2 font-bold text-center">G</Text>
                    </View>
                    {selectedMeal.meal.ingrs.map((ing, j) => (
                      <View key={j} className="flex-row border-b border-border p-2">
                        <Text className="flex-1 text-[11px] text-txt">{ing.nome}</Text>
                        <Text className="w-12 text-[10px] text-muted2 text-center">{ing.qtd}</Text>
                        <Text className="w-10 text-[10px] text-txt text-center">{ing.kcal}</Text>
                        <Text className="w-8 text-[10px] text-warn text-center">{ing.c}</Text>
                        <Text className="w-8 text-[10px] text-ok text-center">{ing.p}</Text>
                        <Text className="w-8 text-[10px] text-pink text-center">{ing.f}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Macros summary */}
                <View className="bg-surface2 rounded-xl p-4 mb-4">
                  <Text className="text-[10px] text-muted2 text-center mb-2 tracking-wider">TOTAIS DA REFEIÇÃO</Text>
                  <Text className="text-2xl font-bold text-lime text-center">{selectedMeal.meal.macros.kcal}<Text className="text-sm"> kcal</Text></Text>
                  <View className="flex-row mt-2">
                    <View className="flex-1 items-center">
                      <Text className="text-warn text-sm font-bold">{selectedMeal.meal.macros.c}g</Text>
                      <Text className="text-[9px] text-warn">CARBS</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-ok text-sm font-bold">{selectedMeal.meal.macros.p}g</Text>
                      <Text className="text-[9px] text-ok">PROT</Text>
                    </View>
                    <View className="flex-1 items-center">
                      <Text className="text-pink text-sm font-bold">{selectedMeal.meal.macros.f}g</Text>
                      <Text className="text-[9px] text-pink">GORD</Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl border border-border items-center"
                    onPress={() => setSelectedMeal(null)}
                  >
                    <Text className="text-muted2 font-bold text-sm">Fechar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 py-3 rounded-xl bg-danger/20 border border-danger/30 items-center"
                    onPress={() => deleteMeal(selectedMeal.idx)}
                  >
                    <Text className="text-danger font-bold text-sm">🗑️ Excluir</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 rounded-xl items-center ${cache.mealChecks[`m_${fase}_${tipo}_${selectedMeal.idx}_${today()}`] ? 'bg-danger/20 border border-danger/30' : 'bg-lime items-center'}`}
                    onPress={() => { toggleMeal(selectedMeal.idx); setSelectedMeal(null); }}
                  >
                    <Text className={`font-bold text-sm ${cache.mealChecks[`m_${fase}_${tipo}_${selectedMeal.idx}_${today()}`] ? 'text-danger' : 'text-bg'}`}>
                      {cache.mealChecks[`m_${fase}_${tipo}_${selectedMeal.idx}_${today()}`] ? '↩ Desmarcar' : '✓ Concluir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Meal Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface rounded-t-3xl border-t border-border p-6 max-h-[85%]">
            <ScrollView>
              <Text className="text-lg font-bold text-txt mb-4">➕ Nova Refeição</Text>

              <Text className="text-[10px] text-muted2 mb-1">NOME</Text>
              <TextInput
                className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3"
                placeholder="Ex: Almoço"
                placeholderTextColor="#666"
                value={newMealName}
                onChangeText={setNewMealName}
              />

              <Text className="text-[10px] text-muted2 mb-1">HORA (HH:MM)</Text>
              <TextInput
                className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3"
                placeholder="12:30"
                placeholderTextColor="#666"
                keyboardType="numeric"
                maxLength={5}
                value={newMealHora}
                onChangeText={(t) => setNewMealHora(fmtHora(t))}
              />

              {/* Ingredient Form */}
              <Text className="text-xs text-cyan font-bold mb-2 mt-2">INGREDIENTES</Text>
              <View className="flex-row gap-2 mb-2">
                <TextInput className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="Nome" placeholderTextColor="#666" value={ingrForm.nome} onChangeText={(t) => setIngrForm({...ingrForm, nome: t})} />
                <TextInput className="w-16 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="Qtd" placeholderTextColor="#666" value={ingrForm.qtd} onChangeText={(t) => setIngrForm({...ingrForm, qtd: t})} />
              </View>
              <View className="flex-row gap-2 mb-2">
                <TextInput className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="kcal" placeholderTextColor="#666" keyboardType="numeric" value={ingrForm.kcal} onChangeText={(t) => setIngrForm({...ingrForm, kcal: t})} />
                <TextInput className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="C" placeholderTextColor="#666" keyboardType="numeric" value={ingrForm.c} onChangeText={(t) => setIngrForm({...ingrForm, c: t})} />
                <TextInput className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="P" placeholderTextColor="#666" keyboardType="numeric" value={ingrForm.p} onChangeText={(t) => setIngrForm({...ingrForm, p: t})} />
                <TextInput className="flex-1 bg-surface2 border border-border rounded-lg px-3 py-2 text-txt text-xs" placeholder="G" placeholderTextColor="#666" keyboardType="numeric" value={ingrForm.f} onChangeText={(t) => setIngrForm({...ingrForm, f: t})} />
              </View>
              <TouchableOpacity className="bg-cyan/20 border border-cyan/30 rounded-lg py-2 items-center mb-3" onPress={addIngredient}>
                <Text className="text-cyan text-xs font-bold">+ Adicionar Ingrediente</Text>
              </TouchableOpacity>

              {/* Ingredient List */}
              {newMealIngrs.map((ing, i) => (
                <View key={i} className="flex-row items-center bg-surface2 rounded-lg p-2 mb-1">
                  <Text className="flex-1 text-txt text-xs">{ing.nome} · {ing.qtd} · {ing.kcal}kcal</Text>
                  <TouchableOpacity onPress={() => setNewMealIngrs(newMealIngrs.filter((_, j) => j !== i))}>
                    <Text className="text-danger text-xs">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Actions */}
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity className="flex-1 py-3 rounded-xl border border-border items-center" onPress={() => setShowAddModal(false)}>
                  <Text className="text-muted2 font-bold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 py-3 rounded-xl bg-lime items-center" onPress={saveMeal}>
                  <Text className="text-bg font-bold">Salvar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

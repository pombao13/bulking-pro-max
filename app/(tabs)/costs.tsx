// ══════════════════════════════════════════════
// Costs Tab — Daily/monthly cost calculations
// ══════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, RefreshControl,
  Dimensions, TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { fmtR, fmtKg, fmtInitVal, parseMoney } from '@/utils/formatters';
import { PHASE_PESO, COLORS } from '@/utils/constants';
import { DB, GROUPS, calcSuplDiario } from '@/services/dietData';
import { COOK, getAutoCookFactor } from '@/utils/cookFactors';
import { dbSetPreco } from '@/services/database';
import { BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function CostsScreen() {
  const { user, cache, setCache, refeicoes, fase, tipo, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const meals = refeicoes[fase]?.[tipo] || [];
  const precos = cache.precos;

  // Calculate daily usage from meals
  const uso: Record<string, number> = {};
  const meta: Record<string, { nome: string; unit: string }> = {};

  meals.forEach(meal => {
    (meal.ingrs || []).forEach(ingr => {
      const id = ingr.id;
      if (!id || id === 'custom') {
        const key = 'ai_' + (ingr.nome || '').replace(/\s+/g, '_').toLowerCase();
        uso[key] = (uso[key] || 0) + (parseFloat(String(ingr.amount)) || parseFloat(String(ingr.qtd)) || 0);
        if (!meta[key]) meta[key] = { nome: ingr.nome, unit: 'g' };
        return;
      }
      uso[id] = (uso[id] || 0) + (ingr.amount || 0);
    });
  });

  let grandDia = 0;
  const barLabels: string[] = [];
  const barValues: number[] = [];

  // Known DB ingredients
  const dbRows = Object.keys(uso).filter(k => !k.startsWith('ai_')).map(id => {
    const d = DB[id];
    if (!d) return null;
    const dayAmt = uso[id];
    const ck = COOK[id];
    const rawAmt = ck ? Math.round(dayAmt * ck.rawPer1g) : dayAmt;
    const pr = precos[id] || { val: 0, unit: 'kg', cook_factor: 0 };
    let custoDia = 0;
    if (pr.val > 0) {
      if (d.unit === 'un' || pr.unit === 'un') custoDia = rawAmt * pr.val;
      else custoDia = (rawAmt / 1000) * pr.val;
    }
    grandDia += custoDia;
    if (custoDia > 0) { barLabels.push(d.nome.slice(0, 10)); barValues.push(+(custoDia).toFixed(2)); }
    return { id, d, dayAmt, rawAmt, ck, pr, custoDia };
  }).filter(Boolean);

  // AI imported ingredients
  const aiRows = Object.keys(uso).filter(k => k.startsWith('ai_')).map(key => {
    const m = meta[key] || { nome: key, unit: 'g' };
    const dayAmt = uso[key];
    const pr = precos[key] || { val: 0, unit: 'kg', cook_factor: 0 };
    const autoResult = getAutoCookFactor(m.nome);
    const cookFactor = pr.cook_factor > 0 ? pr.cook_factor : (autoResult ? autoResult.factor : 0);
    const rawAmt = cookFactor > 0 ? Math.round(dayAmt / cookFactor) : dayAmt;
    let custo = 0;
    if (pr.val > 0) {
      if (pr.unit === 'un') custo = dayAmt * pr.val;
      else custo = (rawAmt / 1000) * pr.val;
    }
    grandDia += custo;
    if (custo > 0) { barLabels.push(m.nome.slice(0, 10)); barValues.push(+(custo).toFixed(2)); }
    return { key, nome: m.nome, dayAmt, rawAmt, pr, custo, cookFactor, isAuto: pr.cook_factor === 0 && autoResult !== null };
  });

  // Supplements
  const suplAll = cache.supls.filter(s => (s.fase === fase || s.fase === 'all') && (s.tipo === tipo || s.tipo === 'all'));
  const suplCosts = suplAll.filter(s => calcSuplDiario(s) > 0);
  suplCosts.forEach(s => {
    const c = calcSuplDiario(s);
    grandDia += c;
    barLabels.push(s.nome.slice(0, 10));
    barValues.push(+(c).toFixed(2));
  });

  async function savePrice(id: string, val: number, unit: string, cf: number) {
    if (!user) return;
    await dbSetPreco(user.id, id, val, unit, cf, cache);
    setCache({ ...cache });
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshData(); setRefreshing(false); }} tintColor={COLORS.lime} />}
    >
      {/* Summary */}
      <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-4">
        <View className="flex-row justify-between">
          <View>
            <Text className="text-[10px] text-muted2">CUSTO / DIA</Text>
            <Text className="text-lime text-xl font-bold">{grandDia > 0 ? fmtR(grandDia) : 'R$ —'}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-muted2">CUSTO / MÊS</Text>
            <Text className="text-lime text-xl font-bold">{grandDia > 0 ? fmtR(grandDia * 30) : 'R$ —'}</Text>
          </View>
        </View>
        <View className="mt-2 pt-2 border-t border-border">
          <Text className="text-cyan text-xs">Meta proteína ({PHASE_PESO[fase]}kg × 2): <Text className="font-bold">{Math.round((PHASE_PESO[fase] || 52) * 2)}g/dia</Text></Text>
        </View>
      </View>

      {/* Cost Chart */}
      {barValues.length > 0 && (
        <View className="mx-4 mt-3 bg-surface rounded-xl border border-border p-3">
          <BarChart
            data={{ labels: barLabels, datasets: [{ data: barValues }] }}
            width={screenWidth - 64}
            height={Math.max(150, barLabels.length * 30)}
            chartConfig={{
              backgroundColor: COLORS.surface,
              backgroundGradientFrom: COLORS.surface,
              backgroundGradientTo: COLORS.surface,
              decimalPlaces: 2,
              color: () => COLORS.lime,
              labelColor: () => COLORS.muted2,
              barPercentage: 0.5,
            }}
            fromZero
            showValuesOnTopOfBars
            horizontalLabelRotation={0}
            yAxisLabel="R$"
            yAxisSuffix=""
            style={{ borderRadius: 8 }}
          />
        </View>
      )}

      {/* Ingredient Cost Rows */}
      <View className="px-4 mt-3 pb-8">
        {dbRows.map(row => {
          if (!row) return null;
          const { id, d, dayAmt, rawAmt, ck, pr, custoDia } = row;
          return (
            <View key={id} className="bg-surface border border-border rounded-xl p-4 mb-2">
              <Text className="text-txt font-bold text-sm mb-2">{d.nome}</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[9px] text-muted2">CRU/DIA</Text>
                  <Text className="text-cyan text-sm font-bold">{d.unit === 'un' ? `${rawAmt}un` : `${rawAmt}g`}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] text-muted2">MÊS</Text>
                  <Text className="text-muted2 text-sm">{d.unit === 'un' ? `${rawAmt * 30}un` : fmtKg(rawAmt * 30)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] text-lime">CUSTO/DIA</Text>
                  <Text className="text-lime text-sm font-bold">{custoDia > 0 ? fmtR(custoDia) : '—'}</Text>
                </View>
              </View>
              {ck && (
                <Text className="text-[9px] text-muted mt-1">Cozido: {Math.round(dayAmt)}g · {ck.conv}</Text>
              )}
              {/* Price Input */}
              <View className="flex-row items-center mt-2 pt-2 border-t border-border gap-2">
                <Text className="text-[10px] text-muted2">{d.unit === 'un' ? 'R$/un' : 'R$/kg'}:</Text>
                <TextInput
                  className="bg-surface2 border border-border rounded-lg px-3 py-1 text-txt text-xs flex-1"
                  placeholder="0,00"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                  defaultValue={fmtInitVal(pr.val)}
                  onEndEditing={(e) => savePrice(id, parseMoney(e.nativeEvent.text), d.unit === 'un' ? 'un' : 'kg', pr.cook_factor)}
                />
              </View>
            </View>
          );
        })}

        {/* AI Ingredients */}
        {aiRows.map(row => (
          <View key={row.key} className="bg-surface border border-cyan/20 rounded-xl p-4 mb-2">
            <View className="flex-row items-center mb-2">
              <Text className="text-txt font-bold text-sm flex-1">{row.nome}</Text>
              <Text className="text-cyan text-[9px] font-bold">IMPORTADO</Text>
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Text className="text-[9px] text-muted2">CRU/DIA</Text>
                <Text className="text-cyan text-sm font-bold">{row.rawAmt}g</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[9px] text-muted2">MÊS</Text>
                <Text className="text-muted2 text-sm">{fmtKg(row.rawAmt * 30)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[9px] text-lime">CUSTO/DIA</Text>
                <Text className="text-lime text-sm font-bold">{row.custo > 0 ? fmtR(row.custo) : '—'}</Text>
              </View>
            </View>
            {/* Price Input */}
            <View className="flex-row items-center mt-2 pt-2 border-t border-border gap-2">
              <Text className="text-[10px] text-muted2">R$/kg:</Text>
              <TextInput
                className="bg-surface2 border border-border rounded-lg px-3 py-1 text-txt text-xs flex-1"
                placeholder="0,00"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
                defaultValue={fmtInitVal(row.pr.val)}
                onEndEditing={(e) => savePrice(row.key, parseMoney(e.nativeEvent.text), row.pr.unit || 'kg', row.pr.cook_factor)}
              />
            </View>
          </View>
        ))}

        {/* Supplements */}
        {suplCosts.length > 0 && (
          <Text className="text-xs text-muted2 tracking-wider mt-4 mb-2">💊 SUPLEMENTOS</Text>
        )}
        {suplCosts.map(s => {
          const c = calcSuplDiario(s);
          return (
            <View key={s.id} className="bg-surface border border-purple/30 rounded-xl p-4 mb-2">
              <Text className="text-txt font-bold text-sm mb-1">{s.nome} <Text className="text-purple text-[9px]">SUPLEMENTO</Text></Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-[9px] text-lime">CUSTO/DIA</Text>
                  <Text className="text-lime text-sm font-bold">{fmtR(c)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[9px] text-lime">CUSTO/MÊS</Text>
                  <Text className="text-lime text-sm font-bold">{fmtR(c * 30)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

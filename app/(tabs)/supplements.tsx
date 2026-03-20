// ══════════════════════════════════════════════
// Supplements Tab
// ══════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { today, fmtR } from '@/utils/formatters';
import { COLORS } from '@/utils/constants';
import { calcSuplDiario } from '@/services/dietData';
import { dbAddSupl, dbDelSupl, dbToggleSuplCheck, dbUpdateSupl } from '@/services/database';
import type { Supplement } from '@/types';

const UNIT_LABELS: Record<string, { total: string; diaria: string }> = {
  un: { total: 'QTD TOTAL (un)', diaria: 'USO DIÁRIO (un)' },
  g: { total: 'QTD TOTAL (g)', diaria: 'USO DIÁRIO (g)' },
  gotas: { total: 'VOLUME DO FRASCO (ml)', diaria: 'GOTAS POR DIA' },
  ml: { total: 'QTD TOTAL (ml)', diaria: 'USO DIÁRIO (ml)' },
};

export default function SupplementsScreen() {
  const { user, cache, setCache, fase, tipo, refreshData } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: '', preco: '', qtdTotal: '', qtdDiaria: '',
    unidade: 'un', fase: 'all', tipo: 'all',
  });

  const list = cache.supls.filter(s =>
    (s.fase === fase || s.fase === 'all') && (s.tipo === tipo || s.tipo === 'all')
  );

  function openAdd() {
    setEditId(null);
    setForm({ nome: '', preco: '', qtdTotal: '', qtdDiaria: '', unidade: 'un', fase: 'all', tipo: 'all' });
    setShowModal(true);
  }

  function openEdit(s: Supplement) {
    setEditId(s.id);
    setForm({
      nome: s.nome, preco: s.preco_total > 0 ? s.preco_total.toFixed(2).replace('.', ',') : '',
      qtdTotal: s.qtd_total > 0 ? String(s.qtd_total) : '',
      qtdDiaria: s.qtd_diaria || '', unidade: s.unidade || 'un',
      fase: s.fase, tipo: s.tipo,
    });
    setShowModal(true);
  }

  async function toggleCheck(id: string) {
    if (!user) return;
    const key = `sl_${id}_${today()}`;
    const was = !!cache.suplChecks[key];
    const newChecks = { ...cache.suplChecks };
    if (was) delete newChecks[key]; else newChecks[key] = true;
    setCache({ ...cache, suplChecks: newChecks });
    try { await dbToggleSuplCheck(user.id, id, !was); } catch (e) { console.error(e); }
  }

  async function deleteSupl(id: string) {
    Alert.alert('Excluir', 'Excluir este suplemento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          if (!user) return;
          try { await dbDelSupl(user.id, id, cache); setCache({ ...cache }); }
          catch (e: any) { Alert.alert('Erro', e.message); }
        },
      },
    ]);
  }

  async function save() {
    if (!form.nome.trim()) { Alert.alert('⚠️', 'Digite o nome'); return; }
    if (!user) return;
    const precoTotal = parseFloat(form.preco.replace(/\./g, '').replace(',', '.') || '0');
    const qtdTotal = parseFloat(form.qtdTotal.replace(/\./g, '').replace(',', '.') || '0');
    const qtdDiaria = form.qtdDiaria.trim();
    const preco = calcSuplDiario({ unidade: form.unidade, preco_total: precoTotal, qtd_total: qtdTotal, qtd_diaria: parseFloat(qtdDiaria) || 0 });

    try {
      if (editId) {
        await dbUpdateSupl(user.id, editId, {
          nome: form.nome, fase: form.fase, tipo: form.tipo, preco,
          unidade: form.unidade, preco_total: precoTotal, qtd_total: qtdTotal,
          qtd_diaria: qtdDiaria || null,
        }, cache);
      } else {
        await dbAddSupl(user.id, form.nome, form.fase, form.tipo, preco, qtdDiaria, form.unidade, precoTotal, qtdTotal, cache);
      }
      setCache({ ...cache });
      setShowModal(false);
    } catch (e: any) { Alert.alert('Erro', e.message); }
  }

  const labels = UNIT_LABELS[form.unidade] || UNIT_LABELS.un;

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshData(); setRefreshing(false); }} tintColor={COLORS.purple} />}
      >
        <View className="px-4 pt-3 pb-8">
          {!list.length ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-2">💊</Text>
              <Text className="text-muted2 text-sm">Nenhum suplemento cadastrado.</Text>
            </View>
          ) : (
            list.map(s => {
              const done = !!cache.suplChecks[`sl_${s.id}_${today()}`];
              const custoDia = calcSuplDiario(s);
              return (
                <TouchableOpacity
                  key={s.id}
                  className={`flex-row items-center p-4 mb-2 rounded-xl border ${done ? 'bg-purple/5 border-purple/20' : 'bg-surface border-border'}`}
                  onPress={() => toggleCheck(s.id)}
                  activeOpacity={0.7}
                >
                  <View className={`w-6 h-6 rounded-md mr-3 items-center justify-center ${done ? 'bg-purple' : 'border border-border'}`}>
                    {done && <Text className="text-bg text-xs font-bold">✓</Text>}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text className={`font-bold text-sm ${done ? 'text-purple/60' : 'text-txt'}`}>{s.nome}</Text>
                      {custoDia > 0 && <Text className="text-lime text-[11px] ml-2">{fmtR(custoDia)}/dia</Text>}
                    </View>
                    <Text className="text-muted text-[10px]">
                      Fase: {s.fase === 'all' ? 'Todas' : s.fase} · {s.tipo === 'all' ? 'Todos' : s.tipo}
                      {s.qtd_diaria ? ` · ${s.qtd_diaria}${s.unidade === 'gotas' ? ' gotas' : s.unidade}/dia` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="p-2"
                    onPress={(e) => { e.stopPropagation; openEdit(s); }}
                  >
                    <Text>✏️</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        className="absolute bottom-20 right-5 bg-purple w-14 h-14 rounded-full items-center justify-center shadow-lg"
        onPress={openAdd}
        activeOpacity={0.8}
      >
        <Text className="text-bg text-2xl font-bold">+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 bg-black/70 justify-end">
          <View className="bg-surface rounded-t-3xl border-t border-border p-6 max-h-[85%]">
            <ScrollView>
              <Text className="text-lg font-bold text-txt mb-4">{editId ? '💊 Editar Suplemento' : '💊 Novo Suplemento'}</Text>

              <Text className="text-[10px] text-muted2 mb-1">NOME</Text>
              <TextInput className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3" placeholder="Ex: Creatina" placeholderTextColor="#666" value={form.nome} onChangeText={t => setForm({...form, nome: t})} />

              {/* Unit selector */}
              <Text className="text-[10px] text-muted2 mb-1">UNIDADE</Text>
              <View className="flex-row gap-2 mb-3">
                {['un', 'g', 'gotas', 'ml'].map(u => (
                  <TouchableOpacity
                    key={u}
                    className={`flex-1 py-2 rounded-lg items-center ${form.unidade === u ? 'bg-purple' : 'bg-surface2 border border-border'}`}
                    onPress={() => setForm({...form, unidade: u})}
                  >
                    <Text className={`text-xs font-bold ${form.unidade === u ? 'text-bg' : 'text-muted2'}`}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-[10px] text-muted2 mb-1">{form.unidade === 'gotas' ? 'VALOR DO FRASCO (R$)' : 'VALOR DO POTE (R$)'}</Text>
              <TextInput className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3" placeholder="0,00" placeholderTextColor="#666" keyboardType="decimal-pad" value={form.preco} onChangeText={t => setForm({...form, preco: t})} />

              <Text className="text-[10px] text-muted2 mb-1">{labels.total}</Text>
              <TextInput className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3" placeholder="Ex: 60" placeholderTextColor="#666" keyboardType="numeric" value={form.qtdTotal} onChangeText={t => setForm({...form, qtdTotal: t})} />

              <Text className="text-[10px] text-muted2 mb-1">{labels.diaria}</Text>
              <TextInput className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-3" placeholder="Ex: 2" placeholderTextColor="#666" keyboardType="numeric" value={form.qtdDiaria} onChangeText={t => setForm({...form, qtdDiaria: t})} />

              {/* Fase selector */}
              <Text className="text-[10px] text-muted2 mb-1">FASE</Text>
              <View className="flex-row gap-1 mb-3 flex-wrap">
                {['all', '1','2','3','4','5','6','7'].map(f => (
                  <TouchableOpacity
                    key={f}
                    className={`px-3 py-2 rounded-lg ${form.fase === f ? 'bg-purple' : 'bg-surface2 border border-border'}`}
                    onPress={() => setForm({...form, fase: f})}
                  >
                    <Text className={`text-xs font-bold ${form.fase === f ? 'text-bg' : 'text-muted2'}`}>{f === 'all' ? 'Todas' : f}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tipo selector */}
              <Text className="text-[10px] text-muted2 mb-1">TIPO</Text>
              <View className="flex-row gap-2 mb-4">
                {['all', 'trabalho', 'folga'].map(t => (
                  <TouchableOpacity
                    key={t}
                    className={`flex-1 py-2 rounded-lg items-center ${form.tipo === t ? 'bg-purple' : 'bg-surface2 border border-border'}`}
                    onPress={() => setForm({...form, tipo: t})}
                  >
                    <Text className={`text-xs font-bold ${form.tipo === t ? 'text-bg' : 'text-muted2'}`}>{t === 'all' ? 'Todos' : t === 'trabalho' ? '🔨 Trab' : '😴 Folga'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Delete button (edit mode) */}
              {editId && (
                <TouchableOpacity className="py-2 items-center mb-3" onPress={() => { setShowModal(false); deleteSupl(editId); }}>
                  <Text className="text-danger text-xs">🗑️ Excluir suplemento</Text>
                </TouchableOpacity>
              )}

              <View className="flex-row gap-3">
                <TouchableOpacity className="flex-1 py-3 rounded-xl border border-border items-center" onPress={() => setShowModal(false)}>
                  <Text className="text-muted2 font-bold">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 py-3 rounded-xl bg-purple items-center" onPress={save}>
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

// ══════════════════════════════════════════════
// Import Tab — Diet import/export/reset + AI schema
// ══════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/contexts/AuthContext';
import { dbSaveDiet } from '@/services/database';
import { applyImportedDiet, getDefaultRefeicoes, DIET_SCHEMA } from '@/services/dietData';

export default function ImportScreen() {
  const { user, refeicoes, setRefeicoes, refreshData } = useAuth();
  const [jsonText, setJsonText] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  function parseJSON(text: string) {
    try {
      let json = text;
      const match = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (match) json = match[1];
      const parsed = JSON.parse(json);
      const fases = Object.keys(parsed.fases || parsed);
      const count = fases.reduce((s, f) => {
        const d = (parsed.fases || parsed)[f];
        return s + (d?.trabalho?.length || 0) + (d?.folga?.length || 0);
      }, 0);
      setPreview(`✅ JSON válido!\nFases: ${fases.join(', ')}\nTotal: ${count} refeições`);
      return parsed;
    } catch (e: any) {
      Alert.alert('❌ JSON Inválido', e.message);
      setPreview(null);
      return null;
    }
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (!result.canceled && result.assets?.[0]) {
        const response = await fetch(result.assets[0].uri);
        const text = await response.text();
        setJsonText(text);
        parseJSON(text);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function applyDiet() {
    const parsed = parseJSON(jsonText);
    if (!parsed) return;
    try {
      const newRef = applyImportedDiet(parsed, refeicoes);
      setRefeicoes(newRef);
      if (user) await dbSaveDiet(user.id, parsed);
      Alert.alert('🎉', 'Dieta importada com sucesso!');
      setJsonText('');
      setPreview(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }

  async function resetDiet() {
    Alert.alert(
      '⚠️ Excluir Dieta',
      'Excluir toda a dieta atual?\n\nIsso remove refeições importadas e manuais.\nPreços, peso e água são mantidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive', onPress: async () => {
            if (user) await dbSaveDiet(user.id, null);
            setRefeicoes(getDefaultRefeicoes());
            Alert.alert('🗑️', 'Dieta resetada!');
          },
        },
      ]
    );
  }

  async function exportDiet() {
    const fases: any = {};
    [1,2,3,4,5,6,7].forEach(fk => {
      const k = String(fk);
      fases[k] = {};
      ['trabalho', 'folga'].forEach(tipo => {
        const meals = refeicoes[k]?.[tipo] || [];
        fases[k][tipo] = meals.map(m => ({
          nome: m.nome, hora: m.hora, icon: m.icon,
          ingredientes: (m.ingrs || []).map(i => ({
            nome: i.nome, qtd: i.qtd || String(i.amount || 0) + 'g',
            kcal: i.kcal || 0, c: i.c || 0, p: i.p || 0, f: i.f || 0,
          })),
        }));
      });
    });
    const json = JSON.stringify({ fases }, null, 2);
    try {
      await Share.share({ message: json, title: 'bulking-dieta.json' });
    } catch (e) { console.error(e); }
  }

  async function copySchema() {
    await Clipboard.setStringAsync(DIET_SCHEMA);
    Alert.alert('📋', 'Prompt copiado para a área de transferência!');
  }

  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="px-4 pt-3 pb-8">
        {/* AI Diet Section */}
        <View className="bg-surface rounded-xl border border-border p-4 mb-3">
          <Text className="text-lg font-bold text-txt mb-2">🤖 Gerar Dieta com IA</Text>
          <Text className="text-muted2 text-xs mb-3">
            Copie o prompt abaixo, cole no ChatGPT ou Gemini, e volte com o JSON gerado.
          </Text>
          <TouchableOpacity
            className="bg-cyan rounded-xl py-3 items-center mb-2"
            onPress={copySchema}
            activeOpacity={0.8}
          >
            <Text className="text-bg font-bold">📋 Copiar Prompt IA</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSchema(!showSchema)}>
            <Text className="text-muted2 text-[10px] text-center">
              {showSchema ? '▲ Ocultar prompt' : '▼ Ver prompt completo'}
            </Text>
          </TouchableOpacity>
          {showSchema && (
            <View className="bg-surface2 rounded-lg p-3 mt-2">
              <Text className="text-[9px] text-muted2 font-mono">{DIET_SCHEMA.slice(0, 500)}...</Text>
            </View>
          )}
        </View>

        {/* Import Section */}
        <View className="bg-surface rounded-xl border border-border p-4 mb-3">
          <Text className="text-lg font-bold text-txt mb-2">📥 Importar Dieta</Text>

          <TouchableOpacity
            className="bg-surface2 border border-border border-dashed rounded-xl py-6 items-center mb-3"
            onPress={pickFile}
            activeOpacity={0.7}
          >
            <Text className="text-2xl mb-1">📂</Text>
            <Text className="text-muted2 text-sm">Selecionar arquivo JSON</Text>
          </TouchableOpacity>

          <Text className="text-[10px] text-muted2 mb-1 text-center">— OU —</Text>

          <TextInput
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt text-xs mb-3"
            placeholder='Cole o JSON aqui {"fases": {...}}'
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={jsonText}
            onChangeText={(t) => { setJsonText(t); if (t.trim()) parseJSON(t); }}
          />

          {preview && (
            <View className="bg-ok/10 border border-ok/30 rounded-xl p-3 mb-3">
              <Text className="text-ok text-xs">{preview}</Text>
            </View>
          )}

          <TouchableOpacity
            className={`rounded-xl py-3 items-center ${preview ? 'bg-lime' : 'bg-surface2 border border-border'}`}
            onPress={applyDiet}
            disabled={!preview}
          >
            <Text className={`font-bold ${preview ? 'text-bg' : 'text-muted2'}`}>Aplicar Dieta</Text>
          </TouchableOpacity>
        </View>

        {/* Export & Reset */}
        <View className="bg-surface rounded-xl border border-border p-4">
          <Text className="text-lg font-bold text-txt mb-3">📤 Exportar / Resetar</Text>

          <TouchableOpacity
            className="bg-cyan/20 border border-cyan/30 rounded-xl py-3 items-center mb-3"
            onPress={exportDiet}
            activeOpacity={0.8}
          >
            <Text className="text-cyan font-bold">📥 Exportar Dieta (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-danger/10 border border-danger/30 rounded-xl py-3 items-center"
            onPress={resetDiet}
            activeOpacity={0.8}
          >
            <Text className="text-danger font-bold">🗑️ Resetar Dieta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

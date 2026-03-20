// ══════════════════════════════════════════════
// Register Screen
// ══════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function RegisterScreen() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    if (!nome.trim() || !email.trim() || !password) {
      setError('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      setError('Senha mínimo 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nome: nome.trim() } },
    });
    if (err) {
      setError(err.message);
    } else {
      if (data?.session) {
        Alert.alert('✅', `Bem-vindo, ${nome}!`);
      } else {
        Alert.alert('✅', 'Conta criada! Verifique seu e-mail.');
        router.back();
      }
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-bg"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <Text className="text-5xl mb-2">💪</Text>
          <Text className="text-2xl font-bold text-lime">CRIAR CONTA</Text>
        </View>

        <View className="bg-surface rounded-2xl p-6 border border-border">
          <Text className="text-xs text-muted2 mb-1 tracking-wider">NOME</Text>
          <TextInput
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-4"
            placeholder="Seu nome"
            placeholderTextColor="#666"
            value={nome}
            onChangeText={setNome}
          />

          <Text className="text-xs text-muted2 mb-1 tracking-wider">E-MAIL</Text>
          <TextInput
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-4"
            placeholder="seu@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text className="text-xs text-muted2 mb-1 tracking-wider">SENHA</Text>
          <TextInput
            className="bg-surface2 border border-border rounded-xl px-4 py-3 text-txt mb-4"
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor="#666"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <Text className="text-danger text-xs mb-3 text-center">{error}</Text>
          ) : null}

          <TouchableOpacity
            className="bg-lime rounded-xl py-4 items-center mb-4"
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text className="text-bg font-bold text-base tracking-wider">
              {loading ? 'CRIANDO...' : 'CRIAR CONTA'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="py-2 items-center"
            onPress={() => router.back()}
          >
            <Text className="text-muted2 text-sm">
              Já tem conta? <Text className="text-cyan font-bold">ENTRAR</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

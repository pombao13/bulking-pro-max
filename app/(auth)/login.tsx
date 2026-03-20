// ══════════════════════════════════════════════
// Login Screen
// ══════════════════════════════════════════════
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/services/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) {
      let msg = err.message;
      if (msg.includes('Invalid') || msg.includes('credentials')) msg = 'E-mail ou senha incorretos.';
      if (msg.includes('Email not confirmed')) msg = 'Confirme seu e-mail primeiro.';
      setError(msg);
    }
    setLoading(false);
  }

  async function handleGoogleLogin() {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (err) Alert.alert('Erro', err.message);
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
        {/* Logo / Title */}
        <View className="items-center mb-10">
          <Text className="text-5xl mb-2">💪</Text>
          <Text className="text-3xl font-bold text-lime">BULKING</Text>
          <Text className="text-lg text-muted2 tracking-widest">PRO MAX</Text>
        </View>

        {/* Login Form */}
        <View className="bg-surface rounded-2xl p-6 border border-border">
          <Text className="text-lg font-bold text-txt mb-5 text-center">ENTRAR</Text>

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
            placeholder="••••••"
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text className="text-bg font-bold text-base tracking-wider">
              {loading ? 'ENTRANDO...' : 'ENTRAR'}
            </Text>
          </TouchableOpacity>

          {/* Google Login */}
          <TouchableOpacity
            className="bg-surface2 border border-border rounded-xl py-3 items-center mb-4 flex-row justify-center gap-2"
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            <Text className="text-lg">🔵</Text>
            <Text className="text-txt font-semibold">Entrar com Google</Text>
          </TouchableOpacity>

          {/* Register Link */}
          <TouchableOpacity
            className="py-2 items-center"
            onPress={() => router.push('/(auth)/register')}
          >
            <Text className="text-muted2 text-sm">
              Não tem conta? <Text className="text-cyan font-bold">CRIAR CONTA</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

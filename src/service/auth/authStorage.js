// Storage layer: AsyncStorage based auth session persistence helpers.
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_SESSION_KEY = '@bharatFpoVyapar/auth_session';

const parseSession = rawSession => {
  if (!rawSession) {
    return { token: null, user: null, refreshToken: null };
  }

  try {
    const parsed = JSON.parse(rawSession);
    return {
      token: parsed?.token ?? null,
      user: parsed?.user ?? null,
      refreshToken: parsed?.refreshToken ?? null,
    };
  } catch (err) {
    return { token: null, user: null, refreshToken: null };
  }
};

export const saveAuthSession = async session => {
  const normalizedSession = {
    token: session?.token ?? null,
    user: session?.user ?? null,
    refreshToken: session?.refreshToken ?? null,
  };

  await AsyncStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify(normalizedSession),
  );

  return normalizedSession;
};

export const getStoredAuthSession = async () => {
  const rawSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  return parseSession(rawSession);
};

export const getStoredToken = async () => {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  return parseSession(raw).token;
};

export const getStoredRefreshToken = async () => {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  return parseSession(raw).refreshToken;
};

export const removeAuthSession = async () => {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
};

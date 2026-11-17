import 'fast-text-encoding';
import { Platform } from 'react-native';
import * as ExpoCrypto from 'expo-crypto';
import { installAuthCrypto } from './cryptoSupport';

if (Platform.OS !== 'web') {
  installAuthCrypto(globalThis, {
    random: ((array: Uint8Array) => ExpoCrypto.getRandomValues(array)) as Crypto['getRandomValues'],
    sha256: data => ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data),
  });
}

import 'react-native-url-polyfill/auto';
// Install the native WebCrypto adapter before App imports the Supabase client.
// PKCE email links need secure random values and SHA-256 during SDK initialization/use.
import './src/auth/installCrypto';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

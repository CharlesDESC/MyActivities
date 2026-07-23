/* eslint-env jest */

// expo-secure-store touche le trousseau natif : on le remplace par une Map en mémoire,
// remise à zéro entre les tests via resetSecureStore().
// `var` + préfixe `mock` : jest.mock est hoisté au-dessus des déclarations, et
// babel-plugin-jest-hoist n'autorise que les variables préfixées `mock` dans une factory.
var mockSecureStorage = new Map();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) =>
    mockSecureStorage.has(key) ? mockSecureStorage.get(key) : null,
  ),
  setItemAsync: jest.fn(async (key, value) => {
    mockSecureStorage.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key) => {
    mockSecureStorage.delete(key);
  }),
}));

global.resetSecureStore = () => mockSecureStorage.clear();

// expo-router : navigation mockée, les tests vérifient les appels plutôt que le rendu réel.
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (callback) => jest.requireActual('react').useEffect(callback, [callback]),
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: { Screen: 'Stack.Screen' },
}));

// Le module natif Mapbox n'existe pas sous Node.
jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: { setAccessToken: jest.fn() },
  MapView: 'MapView',
  Camera: 'Camera',
  PointAnnotation: 'PointAnnotation',
  UserLocation: 'UserLocation',
}));

// La WebView Mapbox est native dans Expo Go ; sous Jest, un hôte léger suffit.
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

// console.log bruyant de lib/api : on le neutralise pour garder une sortie de test lisible.
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

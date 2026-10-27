// READER-180. After an app update, the persisted idps can still name the old data domain. The first render must
// already see the build's own IDPS, or the launch requests go to a host that no longer exists.
//
//     npx jest src/redux/reducers/idps.test.js

import { useRef } from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, createStore } from 'redux';
import { persistReducer, persistStore } from 'redux-persist';
import { PersistGate } from 'redux-persist/integration/react';
import idps from './idps';
import { autoUpdateCoreIdps } from '../actions';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { IDPS: { 43: { id: 43, domain: 'readlangham.org' } } },
    },
  },
}));

const persistedRoot = (idp43) =>
  JSON.stringify({
    idps: JSON.stringify({ 43: idp43 }),
    _persist: JSON.stringify({ version: -1, rehydrated: true }),
  });

// Shows the domain the child saw on its first render, like the launch effects in Library.
const FirstRenderDomain = ({ store }) => {
  const first = useRef(store.getState().idps[43].domain);
  return <Text>{first.current}</Text>;
};

const renderApp = async ({ withFix }) => {
  const store = createStore(
    persistReducer(
      { key: 'root', storage: AsyncStorage },
      combineReducers({ idps }),
    ),
  );
  const persistor = persistStore(store);
  render(
    <PersistGate
      persistor={persistor}
      onBeforeLift={
        withFix ? () => store.dispatch(autoUpdateCoreIdps()) : undefined
      }
    >
      <FirstRenderDomain store={store} />
    </PersistGate>,
  );
  return screen.findByText(/\./);
};

describe('core idps on the first render after an app update', () => {
  beforeEach(() => AsyncStorage.clear());

  it('uses the build domain, not the persisted old one', async () => {
    await AsyncStorage.setItem(
      'persist:root',
      persistedRoot({ id: 43, domain: 'langham.read.biblemesh.com' }),
    );
    expect((await renderApp({ withFix: true })).props.children).toBe(
      'readlangham.org',
    );
  });

  it('saw the old domain without onBeforeLift (the bug)', async () => {
    await AsyncStorage.setItem(
      'persist:root',
      persistedRoot({ id: 43, domain: 'langham.read.biblemesh.com' }),
    );
    expect((await renderApp({ withFix: false })).props.children).toBe(
      'langham.read.biblemesh.com',
    );
  });

  it('keeps a locked persisted idp', async () => {
    await AsyncStorage.setItem(
      'persist:root',
      persistedRoot({ id: 43, domain: 'example.org', locked: true }),
    );
    expect((await renderApp({ withFix: true })).props.children).toBe(
      'example.org',
    );
  });
});

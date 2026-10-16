// Stand-in for expo-av, which has no release for Expo SDK 55 or later. Until
// the players are rebuilt on expo-audio and expo-video, nothing can be played:
// mediaAvailable is false, which also switches off the ways into audiobooks
// and audio tools. The other exports keep the shape of the parts of expo-av
// that the components use, so that their code stays unchanged.

import { StyleSheet } from 'react-native';

import MediaUnavailable from '../components/basic/MediaUnavailable';

export const mediaAvailable = false;

const styles = StyleSheet.create({
  videoText: {
    color: 'white',
  },
});

// A sound that never loads; the components show MediaUnavailable instead
const sound = {
  setStatusAsync: async () => {},
  setRateAsync: async () => {},
  unloadAsync: async () => {},
};

export const Audio = {
  setAudioModeAsync: async () => {},
  Sound: {
    createAsync: async () => ({ sound }),
  },
};

export const ResizeMode = {
  CONTAIN: 'contain',
};

export const VideoFullscreenUpdate = {
  PLAYER_DID_PRESENT: 1,
  PLAYER_WILL_DISMISS: 2,
};

// Fills the frame that the video would have played in
export const Video = ({ style }) => (
  <MediaUnavailable style={style} textStyle={styles.videoText} />
);

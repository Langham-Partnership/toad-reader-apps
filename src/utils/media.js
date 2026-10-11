// Audio and video playback.
//
// The app played both through expo-av, which has no release for Expo SDK 55 or
// later. Until the players are rebuilt on expo-audio and expo-video, nothing
// can be played: mediaAvailable is false, the components that used expo-av
// (AudioPlayer, AudiobookPlayer, AudiobookDialog and VideoTool) show the
// MediaUnavailable notice, and the ways into audiobooks and audio tools are
// switched off (Library, AppMenu, toolInfo).
//
// The other exports have the shape of the parts of expo-av that those four
// components use, so that their code is unchanged and ready for the rebuild.

import { StyleSheet } from 'react-native';

import MediaUnavailable, {
  getMediaUnavailableText,
} from '../components/basic/MediaUnavailable';

export const mediaAvailable = false;

const styles = StyleSheet.create({
  videoText: {
    color: 'white',
  },
});

const getStatus = () => ({
  isLoaded: false,
  error: getMediaUnavailableText(),
});

export const Audio = {
  setAudioModeAsync: async () => {},
  Sound: {
    // Resolves with a sound that never loads; its status says why
    createAsync: async (source, initialStatus, onPlaybackStatusUpdate) => {
      const status = getStatus();

      if (onPlaybackStatusUpdate) onPlaybackStatusUpdate(status);

      return {
        sound: {
          setStatusAsync: async () => getStatus(),
          setRateAsync: async () => getStatus(),
          unloadAsync: async () => getStatus(),
        },
        status,
      };
    },
  },
};

export const ResizeMode = {
  CONTAIN: 'contain',
};

export const VideoFullscreenUpdate = {
  PLAYER_WILL_PRESENT: 0,
  PLAYER_DID_PRESENT: 1,
  PLAYER_WILL_DISMISS: 2,
  PLAYER_DID_DISMISS: 3,
};

// Fills the frame that the video would have played in
export const Video = ({ style }) => (
  <MediaUnavailable style={style} textStyle={styles.videoText} />
);

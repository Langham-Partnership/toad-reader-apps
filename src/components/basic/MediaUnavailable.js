import { StyleSheet, Text, View } from 'react-native';
import { i18n } from 'inline-i18n';

const styles = StyleSheet.create({
  container: {
    padding: 20,
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export const getMediaUnavailableText = () =>
  i18n('Audio and video are not available in this version of the app.');

// Shown in place of a player while utils/media.js has nothing to play with
const MediaUnavailable = ({ style, textStyle }) => (
  <View style={[styles.container, style]}>
    <Text style={[styles.text, textStyle]}>{getMediaUnavailableText()}</Text>
  </View>
);

export default MediaUnavailable;

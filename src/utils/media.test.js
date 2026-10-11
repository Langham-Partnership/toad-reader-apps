// Audio and video are switched off until the players are rebuilt (see media.js).
//
//     npx jest src/utils/media.test.js

import fs from 'fs';
import path from 'path';
import { render, screen } from '@testing-library/react-native';

import { Audio, Video, mediaAvailable } from './media';
import { getToolInfo } from './toolInfo';
import AudioPlayer from '../components/major/AudioPlayer';
import AudiobookPlayer from '../components/major/AudiobookPlayer';
import VideoTool from '../components/major/VideoTool';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: {} },
  },
}));

jest.mock('./toolbox', () => ({
  getReqOptionsWithAdditions: (options) => options,
}));

jest.mock('../components/major/WebView', () => 'WebView');

const notice = 'Audio and video are not available in this version of the app.';

const readJson = (filename) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, '../..', filename), 'utf8'));

describe('expo-av', () => {
  // It has no release for Expo SDK 55 or later and breaks the native builds,
  // which lint, jest and the web export do not notice.
  it('is not in package.json', () => {
    const { dependencies, devDependencies } = readJson('package.json');
    expect(Object.keys({ ...dependencies, ...devDependencies })).not.toContain(
      'expo-av',
    );
  });

  it('is not in package-lock.json', () => {
    const { packages } = readJson('package-lock.json');
    expect(
      Object.keys(packages).filter((key) =>
        /(^|\/)node_modules\/expo-av$/.test(key),
      ),
    ).toEqual([]);
    expect(
      Object.keys(packages).filter(
        (key) =>
          'expo-av' in
          {
            ...packages[key].dependencies,
            ...packages[key].devDependencies,
            ...packages[key].optionalDependencies,
          },
      ),
    ).toEqual([]);
  });
});

describe('media', () => {
  it('says that nothing can be played', () => {
    expect(mediaAvailable).toBe(false);
  });

  it('gives a sound that never loads and says why', async () => {
    const onPlaybackStatusUpdate = jest.fn();
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound, status } = await Audio.Sound.createAsync(
      { uri: 'https://example.com/audio.mp3' },
      {},
      onPlaybackStatusUpdate,
      true,
    );

    expect(status).toEqual({ isLoaded: false, error: notice });
    expect(onPlaybackStatusUpdate).toHaveBeenCalledWith(status);
    expect(await sound.setStatusAsync({ shouldPlay: true })).toEqual(status);
    expect(await sound.setRateAsync(2, true)).toEqual(status);
    expect(await sound.unloadAsync()).toEqual(status);
  });

  it('shows the notice where a video would play', () => {
    render(<Video source={{ uri: 'https://example.com/video.mp4' }} />);
    expect(screen.getByText(notice)).toBeTruthy();
  });
});

describe('components that played audio or video', () => {
  it('AudioPlayer shows the notice instead of a player', async () => {
    const { unmount } = render(
      <AudioPlayer source={{ uri: 'https://example.com/audio.mp3' }} />,
    );
    expect(await screen.findByText(notice)).toBeTruthy();
    expect(screen.queryByText('/')).toBeNull();
    unmount();
  });

  it('AudiobookPlayer shows the notice instead of a player', async () => {
    const endRecordReading = jest.fn();
    const { unmount } = render(
      <AudiobookPlayer
        uriBase="https://example.com/epub_content/book_1/"
        localSourceBase="file://test/1/"
        cookie="cookie"
        downloadProgressByFilename={{}}
        endRecordReading={endRecordReading}
        goStartRecordReading={jest.fn()}
        updateLatestLocation={jest.fn()}
        audiobookInfo={{
          spines: [{ filename: 'one.mp3', label: 'One', durationMS: 1000 }],
        }}
      />,
    );
    expect(await screen.findByText(notice)).toBeTruthy();
    expect(screen.queryByText('One')).toBeNull();
    unmount();
  });

  it('VideoTool shows the notice for a link to a video file', () => {
    render(<VideoTool videoLink="https://example.com/video.mp4" />);
    expect(screen.getByText(notice)).toBeTruthy();
  });

  it('VideoTool still embeds a YouTube or Vimeo video', () => {
    const { UNSAFE_getByType, rerender } = render(
      <VideoTool videoLink="https://www.youtube.com/watch?v=Y80wHFoYrrQ" />,
    );
    expect(screen.queryByText(notice)).toBeNull();
    expect(UNSAFE_getByType('WebView').props.source.uri).toContain(
      'https://www.youtube.com/embed/Y80wHFoYrrQ',
    );

    rerender(<VideoTool videoLink="https://vimeo.com/76979871" />);
    expect(screen.queryByText(notice)).toBeNull();
    expect(UNSAFE_getByType('WebView').props.source.uri).toContain(
      'https://player.vimeo.com/video/76979871',
    );
  });
});

describe('tool types', () => {
  it('does not offer the audio tool, but still knows it', () => {
    const { toolTypes, toolInfoByType } = getToolInfo();
    const offered = toolTypes.map(({ toolType }) => toolType);

    expect(offered).not.toContain('AUDIO');
    expect(offered).toContain('VIDEO');
    expect(toolInfoByType.AUDIO.text).toBe('Audio');
  });

  it('asks for a YouTube or Vimeo link for the video tool', () => {
    const { toolInfoByType } = getToolInfo();
    expect(toolInfoByType.VIDEO.dataStructure[0].label).toBe(
      'YouTube or Vimeo link',
    );
  });
});

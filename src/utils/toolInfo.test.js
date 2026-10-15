// Tool types and the video link, while audio and video files cannot be played (READER-156).
//
//     npx jest src/utils/toolInfo.test.js

import { render, screen } from '@testing-library/react-native';

import { getToolInfo, getToolTypeChoice } from './toolInfo';
import VideoTool from '../components/major/VideoTool';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('../components/major/WebView', () => 'WebView');

const notice = 'Audio and video are not available in this version of the app.';

describe('getToolTypeChoice', () => {
  const { toolTypes, toolInfoByType } = getToolInfo();

  it('selects an offered type as before, locked once the tool has data', () => {
    toolTypes.forEach(({ toolType }) => {
      [{}, { videoLink: 'https://youtu.be/Y80wHFoYrrQ' }].forEach((data) => {
        const tool = { toolType, data };
        // what EditTool did before
        const selectedOption = toolTypes.filter(
          (option) => option.toolType === tool.toolType,
        )[0];

        expect(getToolTypeChoice({ toolTypes, toolInfoByType, tool })).toEqual({
          selectedOption,
          selectedIndex: toolTypes.indexOf(selectedOption),
          disabled: Object.keys(data).length > 0,
        });
      });
    });
  });

  it('shows an audio tool as audio, with no row selected, and locks its type', () => {
    [{}, undefined, { audioFile: 'file.mp3' }].forEach((data) => {
      expect(
        getToolTypeChoice({
          toolTypes,
          toolInfoByType,
          tool: { toolType: 'AUDIO', data },
        }),
      ).toEqual({
        selectedOption: toolInfoByType.AUDIO,
        selectedIndex: undefined,
        disabled: true,
      });
    });
  });
});

describe('the video link', () => {
  const getVideoInfo = () => getToolInfo().toolInfoByType.VIDEO;
  const getLinkError = (videoLink) =>
    getVideoInfo().dataStructure[0].hasErrorWithMessage({
      data: { videoLink },
    });
  const getReadyToPublish = (videoLink) =>
    getVideoInfo().readyToPublish({ data: { videoLink } });

  const embedded = [
    'https://www.youtube.com/watch?v=Y80wHFoYrrQ',
    'https://youtube.com/watch?v=Y80wHFoYrrQ&t=10',
    'https://youtu.be/Y80wHFoYrrQ',
    'https://youtu.be/Y80wHFoYrrQ?t=3',
    'https://vimeo.com/76979871',
    'https://www.vimeo.com/channels/staffpicks/76979871',
    'https://vimeo.com/groups/name/video/76979871',
  ];
  const notEmbedded = [
    'https://example.com/video.mp4',
    'https://example.com/video.webm',
    'https://www.youtube.com/watch?v=',
    'https://www.youtube.com/embed/Y80wHFoYrrQ',
    'https://vimeo.com/user/somebody',
  ];

  it('is accepted exactly when VideoTool can embed it', () => {
    [...embedded, ...notEmbedded].forEach((videoLink) => {
      const { unmount } = render(<VideoTool videoLink={videoLink} />);
      const embeds = !screen.queryByText(notice);
      unmount();

      expect([videoLink, !getLinkError(videoLink)]).toEqual([
        videoLink,
        embeds,
      ]);
      expect([videoLink, getReadyToPublish(videoLink)]).toEqual([
        videoLink,
        embeds,
      ]);
      expect(embeds).toBe(embedded.includes(videoLink));
    });
  });

  it('says why a link is refused', () => {
    expect(getLinkError('https://example.com/video.mp4')).toBe(
      'Use a youtube.com/watch, youtu.be or vimeo.com link.',
    );
    expect(getLinkError('http://www.youtube.com/watch?v=Y80wHFoYrrQ')).toBe(
      'Invalid URL. (Note: https required.)',
    );
    expect(getLinkError('')).toBe(false);
    expect(getLinkError(undefined)).toBe(false);
  });

  it('accepts video files again, and says so, once they can be played', () => {
    jest.isolateModules(() => {
      jest.doMock('./media', () => ({ mediaAvailable: true }));
      const { toolInfoByType } = jest.requireActual('./toolInfo').getToolInfo();
      const [videoLink] = toolInfoByType.VIDEO.dataStructure;

      expect(videoLink.label).toBe('YouTube, Vimeo, MP4 or WebM link');
      expect(
        videoLink.hasErrorWithMessage({
          data: { videoLink: 'https://example.com/video.mp4' },
        }),
      ).toBe(false);
      expect(
        toolInfoByType.VIDEO.readyToPublish({
          data: { videoLink: 'https://example.com/video.mp4' },
        }),
      ).toBe(true);
    });
  });
});

// The tool type field of the tool editor (READER-156).
//
//     npx jest src/components/major/EditTool.test.tsx
//
// An audio tool can no longer be chosen (see media.js). An existing one keeps its type: it is
// shown, with no row of the list selected, and the field is locked.

import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';

import EditTool from './EditTool';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: {} } },
}));
jest.mock('@ui-kitten/components', () => {
  const { createElement } = jest.requireActual('react');
  return {
    Select: (props) => createElement('Select', props),
    SelectItem: () => null,
    IndexPath: function IndexPath(row) {
      this.row = row;
    },
  };
});
jest.mock('uuid', () => ({ v4: () => 'new-uid' }));
jest.mock('redux', () => ({ bindActionCreators: () => ({}) }));
jest.mock('react-redux', () => ({ connect: () => (Component) => Component }));
jest.mock('../../redux/actions', () => ({
  updateTool: jest.fn(),
  createTool: jest.fn(),
}));
jest.mock('../../hooks/useWideMode', () => () => false);
jest.mock('../../hooks/useClassroomInfo', () => () => ({
  accountId: '1-1',
  classroomUid: '1-1',
  classroom: {},
  isDefaultClassroom: true,
}));
jest.mock('../../hooks/useRouterState', () => () => ({
  getRouterState: () => ({}),
  historyReplace: () => {},
}));
jest.mock('./WebView', () => 'WebView');
jest.mock('./StatusAndActions', () => () => null);
jest.mock('./EditToolData', () => () => null);
jest.mock('../basic/Input', () => () => null);
jest.mock('../basic/HeaderIcon', () => () => null);
jest.mock('../basic/SelectWebPortalWrapper', () => {
  const { createElement } = jest.requireActual('react');
  return (props) => createElement('SelectWebPortalWrapper', props);
});

const realOS = Platform.OS;
afterEach(() => {
  Platform.OS = realOS;
});

const renderToolTypeField = (tool) => {
  const updateTool = jest.fn();
  const { UNSAFE_root, unmount } = render(
    <EditTool
      bookId="1"
      tool={{ uid: 'tool-1', name: 'A tool', ...tool }}
      setViewingPreview={() => {}}
      xOutOfTool={() => {}}
      books={{}}
      userDataByBookId={{}}
      updateTool={updateTool}
      createTool={() => {}}
    />,
  );
  const [field] = UNSAFE_root.findAll(
    (node) =>
      (node.type as unknown) === 'Select' ||
      (node.type as unknown) === 'SelectWebPortalWrapper',
  );
  const { props } = field;
  unmount();
  return { props, updateTool };
};

describe('EditTool', () => {
  it('locks an audio tool on iOS and Android and selects no row', () => {
    ['ios', 'android'].forEach((os) => {
      Platform.OS = os as typeof Platform.OS;
      [{}, { audioFile: 'file.mp3' }].forEach((data) => {
        const { props } = renderToolTypeField({ toolType: 'AUDIO', data });
        expect(props.value).toBe('Audio');
        expect(props.selectedIndex).toBeUndefined();
        expect(props.disabled).toBe(true);
      });
    });
  });

  it('locks an audio tool on web', () => {
    Platform.OS = 'web';
    const { props } = renderToolTypeField({ toolType: 'AUDIO', data: {} });
    expect(props.value).toBe('Audio');
    expect(props.disabled).toBe(true);
  });

  it('still lets a new video tool change its type', () => {
    const { props, updateTool } = renderToolTypeField({
      toolType: 'VIDEO',
      data: {},
    });
    expect(props.value).toBe('Video');
    expect(props.selectedIndex.row).toBeGreaterThanOrEqual(0);
    expect(props.disabled).toBe(false);

    props.onSelect({ row: 0 });
    expect(updateTool).toHaveBeenCalledWith(
      expect.objectContaining({ toolType: 'NOTES_INSERT', data: {} }),
    );
  });

  it('locks a video tool that has data', () => {
    const { props } = renderToolTypeField({
      toolType: 'VIDEO',
      data: { videoLink: 'https://youtu.be/Y80wHFoYrrQ' },
    });
    expect(props.disabled).toBe(true);
  });
});

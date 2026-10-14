import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import MediaUnavailable from './MediaUnavailable';

const notice = 'Audio and video are not available in this version of the app.';

describe('MediaUnavailable Component', () => {
  it('should render the notice', () => {
    render(<MediaUnavailable />);
    expect(screen.getByText(notice)).toBeTruthy();
  });

  it('should apply the style and textStyle props', () => {
    render(
      <MediaUnavailable
        style={{ backgroundColor: 'black' }}
        textStyle={{ color: 'white' }}
      />,
    );
    expect(StyleSheet.flatten(screen.getByText(notice).props.style).color).toBe(
      'white',
    );
    expect(StyleSheet.flatten(screen.root.props.style).backgroundColor).toBe(
      'black',
    );
  });
});

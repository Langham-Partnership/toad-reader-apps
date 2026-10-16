import { render, screen, fireEvent } from '@testing-library/react-native';
import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import SideMenu from './SideMenu';

const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 };

describe('SideMenu Component', () => {
  it('should render its children and the menu', () => {
    render(
      <SideMenu menu={<Text>Menu</Text>}>
        <Text>Page</Text>
      </SideMenu>,
    );
    expect(screen.getByText('Page')).toBeTruthy();
    expect(screen.getByText('Menu')).toBeTruthy();
  });

  it('should not render the cover when closed', () => {
    render(
      <SideMenu>
        <Text>Page</Text>
      </SideMenu>,
    );
    expect(screen.UNSAFE_queryByType(TouchableWithoutFeedback)).toBeNull();
  });

  it('should call onClose when the cover is pressed while open', () => {
    const onClose = jest.fn();
    render(
      <SideMenu open onClose={onClose}>
        <Text>Page</Text>
      </SideMenu>,
    );
    fireEvent.press(screen.UNSAFE_getByType(TouchableWithoutFeedback));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should stretch the children container and the cover over the parent', () => {
    render(
      <SideMenu open>
        <Text>Page</Text>
      </SideMenu>,
    );
    const [childrenContainer] = screen.UNSAFE_getAllByType(View);
    const cover = screen.UNSAFE_getByType(TouchableWithoutFeedback).props
      .children;
    expect(StyleSheet.flatten(childrenContainer.props.style)).toMatchObject(
      fill,
    );
    expect(StyleSheet.flatten(cover.props.style)).toMatchObject(fill);
  });
});

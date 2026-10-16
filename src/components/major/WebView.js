import { WebView as RDWebView } from 'react-native-webview';

const WebView = ({
  forwardRef, // I do this so I can be consistent with WebView.web.js
  ...props
}) => (
  <RDWebView
    ref={forwardRef}
    allowsLinkPreview={true} // Due to a bug, iPhone SE, X, 11, etc don't allow text selection without this.
    // The reader hides the iOS status bar by turning it white. Left on, a web view puts back the
    // style it found when it was created each time a window appears (the keyboard, for one),
    // which can leave the status bar white outside the reader.
    autoManageStatusBarEnabled={false}
    {...props}
  />
);

export default WebView;

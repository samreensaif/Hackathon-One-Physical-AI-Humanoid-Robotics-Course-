import React from 'react';
import ChatBot from '@site/src/components/ChatBot';

// Docusaurus swizzled Root – wraps every page with the ChatBot widget.
// See: https://docusaurus.io/docs/swizzling#wrapper-your-site-with-root
export default function Root({ children }) {
  return (
    <>
      {children}
      <ChatBot />
    </>
  );
}

import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Module 1: ROS2',
      items: [
        'module1-ros2/chapter1',
        'module1-ros2/chapter2',
        'module1-ros2/chapter3',
        'module1-ros2/chapter4',
      ],
    },
    {
      type: 'category',
      label: 'Module 2: Simulation',
      items: [
        'module2-simulation/chapter1',
        'module2-simulation/chapter2',
        'module2-simulation/chapter3',
      ],
    },
    {
      type: 'category',
      label: 'Module 3: Isaac',
      items: [
        'module3-isaac/chapter1',
        'module3-isaac/chapter2',
        'module3-isaac/chapter3',
        'module3-isaac/chapter4',
      ],
    },
    {
      type: 'category',
      label: 'Module 4: VLA',
      items: [
        'module4-vla/chapter1',
        'module4-vla/chapter2',
        'module4-vla/chapter3',
        'module4-vla/chapter4',
      ],
    },
  ],
};

export default sidebars;

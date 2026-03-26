import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    defaults: { headers: { common: {} } },
    create: jest.fn(() => ({
      interceptors: {
        request: {
          use: jest.fn(),
        },
      },
      get: jest.fn(),
      post: jest.fn(),
      defaults: { headers: { common: {} } },
    })),
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import { App } from './index';

describe('LeninKart frontend shell', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('renders the public login experience for anonymous users', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('LeninKart E-Commerce Portal');
    expect(html).toContain('Sign in to workspace');
    expect(html).toContain('Create account');
  });
});

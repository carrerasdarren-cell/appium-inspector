import {load} from 'cheerio';
import {createInstance} from 'i18next';
import {renderToStaticMarkup} from 'react-dom/server';
import {I18nextProvider} from 'react-i18next';
import {beforeAll, describe, expect, it, vi} from 'vitest';

import translation from '../../app/common/public/locales/en/translation.json';
import HeaderButtons from '../../app/common/renderer/components/SessionInspector/Header/HeaderButtons.jsx';
import {DRIVERS} from '../../app/common/renderer/constants/common.js';
import {APP_MODE, NATIVE_APP} from '../../app/common/renderer/constants/session-inspector.js';

vi.mock('#local-polyfills', () => ({settings: {has: () => false}, openLink: () => {}}));

const i18n = createInstance();
beforeAll(async () => {
  await i18n.init({lng: 'en', resources: {en: {translation}}});
});

function renderWindowButton(featureCaps, props = {}) {
  const html = renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <HeaderButtons featureCaps={featureCaps} sessionSettings={{}} appMode={APP_MODE.NATIVE} {...props} />
    </I18nextProvider>,
  );
  return load(html)('button[aria-label="Switch Window"]');
}

describe('WebDriver window selection in the Inspector header', () => {
  it('shows a window menu for a named browser and native desktop drivers', () => {
    for (const caps of [{browserName: 'chrome'}, {automationName: DRIVERS.MAC2}, {automationName: DRIVERS.WINCORE}]) {
      const button = renderWindowButton(caps);
      expect(button).toHaveLength(1);
      expect(button.attr('aria-haspopup')).toBe('menu');
      expect(button.attr('aria-expanded')).toBe('false');
      expect(button.is(':disabled')).toBe(false);
    }
  });

  it('shows the window menu only in an active webview for a hybrid mobile app', () => {
    const caps = {automationName: DRIVERS.UIAUTOMATOR2};
    const webview = 'WEBVIEW_com.example';
    const hybridMode = {appMode: APP_MODE.WEB_HYBRID};

    expect(renderWindowButton(caps)).toHaveLength(0);
    expect(renderWindowButton(caps, {...hybridMode, currentContext: NATIVE_APP})).toHaveLength(0);
    expect(renderWindowButton(caps, {...hybridMode, currentContext: webview})).toHaveLength(1);
    expect(renderWindowButton(caps, {appMode: APP_MODE.NATIVE, currentContext: webview})).toHaveLength(0);
  });

  it('disables window selection while a command is running or the session is ending', () => {
    const caps = {browserName: 'chrome'};
    expect(renderWindowButton(caps, {methodCallInProgress: true}).is(':disabled')).toBe(true);
    expect(renderWindowButton(caps, {isQuittingSession: true}).is(':disabled')).toBe(true);
  });
});

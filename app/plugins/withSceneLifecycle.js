const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * iOS 27 kills apps at launch unless they adopt the UIScene life cycle. Expo SDK 57
 * ships `ExpoAppSceneDelegate` but its template still uses the AppDelegate window;
 * SDK 58 switches over. Until we upgrade, wire the scene delegate in ourselves:
 *  - Info.plist declares a window scene backed by `EXExpoAppSceneDelegate`;
 *  - AppDelegate exposes its React Native factory and stops creating a window.
 * Delete this plugin when moving to SDK 58.
 */
const WINDOW_BLOCK =
  /#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([\s\S]*?\)\s*#endif\n/;
const CLASS_DECL = 'class AppDelegate: ExpoAppDelegate {';

function withSceneLifecycle(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;
    if (!src.includes(CLASS_DECL) || !WINDOW_BLOCK.test(src)) {
      throw new Error('withSceneLifecycle: AppDelegate.swift no longer matches the SDK 57 template');
    }
    src = src
      .replace(CLASS_DECL, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(WINDOW_BLOCK, '    // The window is created by ExpoAppSceneDelegate (UIScene life cycle).\n');
    cfg.modResults.contents = src;
    return cfg;
  });
}

module.exports = withSceneLifecycle;

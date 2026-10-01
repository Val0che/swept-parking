const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * expo-notifications always adds the Push Notifications capability, but Swept only
 * schedules local notifications. Free (personal) Apple teams can't sign apps that
 * declare push, so drop it. Remove this plugin if remote push is ever needed.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};

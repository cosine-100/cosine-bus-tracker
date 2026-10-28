# Navigation decisions

Workspace pages use a persistent sidebar for local map and trip sections. Profile, settings, help and session actions form a separate bottom group. Desktop users can collapse the rail; accessible names and native title hints remain available. The choice persists locally.

Below 901px, navigation becomes a labeled Menu disclosure. Links use normal browser keyboard behavior. Escape closes the disclosure and returns focus to its trigger. Clicking outside or choosing a link closes it. This is nonmodal navigation, so it does not trap focus.

Authentication pages show Home and Help rather than workspace and account-management links. Account pages retain the workspace links and Profile/Settings tabs, without adding a redundant sidebar.

Trip controls explain their dependencies next to the controls. Preview sign-in does not authorize a bus: location sharing requires the fleet operator's assigned private key.

## Guidance

- [W3C disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation-hybrid/): native links, disclosure state, and keyboard behavior; ordinary navigation does not need an ARIA menu role.
- [Nielsen Norman Group utility navigation](https://www.nngroup.com/articles/utility-navigation/): group utilities separately and preserve recognizable labels.
- [Carbon left panel](https://v10.carbondesignsystem.com/components/UI-shell-left-panel/usage/): distinguish primary header navigation from contextual secondary navigation.

## Verification

Eight application tests pass. Browser checks covered desktop collapse/expand, mobile open/Escape/focus return, and no horizontal overflow on Settings, Profile, Sign-in and Student at 320, 700 and 1280px. Driver was checked at desktop and 390px. These checks do not substitute for testing real phone GPS and fleet credentials.

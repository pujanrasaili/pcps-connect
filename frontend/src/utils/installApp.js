// Decides what to offer for "install this site as an app" (an icon on the home
// screen that opens full screen, which also keeps saved tickets one tap away).
//
//  "prompt"    -- the browser has offered an install (Chrome/Edge on Android and
//                 desktop); one button does it
//  "ios-steps" -- iPhones/iPads never offer a prompt; the person has to use
//                 Share > Add to Home Screen, so we explain that
//  "hidden"    -- already installed (opened as an app), or nothing to offer
export function installMode({ canPrompt, isStandalone, isIos }) {
  if (isStandalone) return "hidden";
  if (canPrompt) return "prompt";
  if (isIos) return "ios-steps";
  return "hidden";
}

export function detectIos(userAgent = "", maxTouchPoints = 0) {
  // iPadOS 13+ reports itself as a Mac, but a Mac has no touch screen.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

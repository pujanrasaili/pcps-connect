const { isPushServiceEndpoint } = require("../pushEndpoint");

describe("isPushServiceEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://FCM.GoogleAPIs.com:443/x",
  ])("accepts the real push service %s", (url) => {
    expect(isPushServiceEndpoint(url)).toBe(true);
  });

  it.each([
    ["an internal address", "https://internal.service.local/hook"],
    ["a cloud metadata address", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost:3000/x"],
    ["plain http", "http://fcm.googleapis.com/x"],
    ["a look-alike host", "https://fcm.googleapis.com.evil.com/x"],
    ["a look-alike prefix", "https://evilfcm.googleapis.com/x"],
    ["a login part hiding the real host", "https://fcm.googleapis.com@evil.com/x"],
    ["credentials on a real host", "https://user:pw@fcm.googleapis.com/x"],
    ["another port", "https://fcm.googleapis.com:8443/x"],
    ["not a url", "not a url"],
    ["a script address", "javascript:alert(1)"],
    ["too long", "https://fcm.googleapis.com/" + "a".repeat(1000)],
    ["a number", 5],
    ["nothing", undefined],
  ])("rejects %s", (_name, url) => {
    expect(isPushServiceEndpoint(url)).toBe(false);
  });
});

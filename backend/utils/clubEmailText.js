// Wording for the club emails (join request approved or declined, new club
// event, club message) in English and Nepali. English is the default and the
// fallback; the Nepali is a draft for a Nepali speaker to review. Values passed
// in (`name`, `club`, `when`, `where`, `reason`, `messageHtml`, `settings`)
// must already be HTML-escaped by the caller.
const { pickLanguage } = require("./emailText");

const T = {
  en: {
    hi: "Hi {name},",
    when: "When:",
    where: "Where:",
    note: "A note from the club:",
    approvedHeading: "Your request was approved",
    approvedSubject: "Welcome to {rawClub}",
    approvedBody: "The leaders of <strong>{club}</strong> approved your request. You are now a member, and you will see its events and news.",
    declinedHeading: "Your request was declined",
    declinedSubject: "Your request to join {rawClub}",
    declinedBody: "The leaders of <strong>{club}</strong> could not accept your request to join this time. You can contact the club if you have questions.",
    newEventHeading: "New event from {rawClub}",
    newEventSubject: "{rawClub}: {rawTitle}",
    newEventBody: "<strong>{club}</strong> just announced <strong>{title}</strong>:",
    newEventFooter: "Log in to PCPS Connect to register. You're getting this because you joined {club}; you can turn club updates off in {settings}.",
    messageHeading: "Message from {rawClub}",
    messageSubject: "Message from {rawClub}",
    messageBody: "The organisers of <strong>{club}</strong> sent a message to all members:",
    messageFooter: "You're getting this because you joined {club}; you can turn club updates off in {settings}.",
    settings: "Settings",
  },
  ne: {
    hi: "नमस्ते {name},",
    when: "कहिले:",
    where: "कहाँ:",
    note: "क्लबको तर्फबाट सन्देश:",
    approvedHeading: "तपाईंको अनुरोध स्वीकृत भयो",
    approvedSubject: "{rawClub} मा स्वागत छ",
    approvedBody: "<strong>{club}</strong> का नेताहरूले तपाईंको अनुरोध स्वीकृत गरे। तपाईं अब सदस्य हुनुहुन्छ, र यसका कार्यक्रम र समाचार देख्न पाउनुहुनेछ।",
    declinedHeading: "तपाईंको अनुरोध अस्वीकृत भयो",
    declinedSubject: "{rawClub} मा सामेल हुने तपाईंको अनुरोध",
    declinedBody: "<strong>{club}</strong> का नेताहरूले यसपटक तपाईंको सामेल हुने अनुरोध स्वीकार गर्न सकेनन्। प्रश्न भए क्लबसँग सम्पर्क गर्न सक्नुहुन्छ।",
    newEventHeading: "{rawClub} बाट नयाँ कार्यक्रम",
    newEventSubject: "{rawClub}: {rawTitle}",
    newEventBody: "<strong>{club}</strong> ले भर्खरै <strong>{title}</strong> घोषणा गर्‍यो:",
    newEventFooter: "दर्ता गर्न PCPS Connect मा लगइन गर्नुहोस्। तपाईं {club} मा सामेल हुनुभएकाले यो इमेल पाउनुभएको हो; क्लबका अपडेट {settings} मा बन्द गर्न सक्नुहुन्छ।",
    messageHeading: "{rawClub} बाट सन्देश",
    messageSubject: "{rawClub} बाट सन्देश",
    messageBody: "<strong>{club}</strong> का आयोजकहरूले सबै सदस्यलाई सन्देश पठाए:",
    messageFooter: "तपाईं {club} मा सामेल हुनुभएकाले यो इमेल पाउनुभएको हो; क्लबका अपडेट {settings} मा बन्द गर्न सक्नुहुन्छ।",
    settings: "सेटिङ",
  },
};

const fill = (text, v) => text.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined ? `{${k}}` : v[k]));
const hi = (t, v) => `<p style="margin: 0 0 12px;">${fill(t.hi, v)}</p>`;
const details = (t, v) => `
            <p style="margin: 0 0 4px;"><strong>${t.when}</strong> ${v.when}</p>
            <p style="margin: 0;"><strong>${t.where}</strong> ${v.where}</p>`;
const quote = (v) => `<div style="margin: 0; padding: 12px 16px; border-left: 3px solid #6366f1; background: #f8fafc;">${v.messageHtml}</div>`;

const BUILD = {
  approved: (t, v) => ({
    subject: fill(t.approvedSubject, v),
    heading: t.approvedHeading,
    bodyHtml: `${hi(t, v)}<p style="margin: 0;">${fill(t.approvedBody, v)}</p>`,
  }),
  declined: (t, v) => ({
    subject: fill(t.declinedSubject, v),
    heading: t.declinedHeading,
    bodyHtml: `${hi(t, v)}<p style="margin: 0;">${fill(t.declinedBody, v)}</p>${v.reason ? `<p style="margin: 12px 0 0;"><strong>${t.note}</strong> ${v.reason}</p>` : ""}`,
  }),
  newEvent: (t, v) => ({
    subject: fill(t.newEventSubject, v),
    heading: fill(t.newEventHeading, v),
    bodyHtml: `
            ${hi(t, v)}
            <p style="margin: 0 0 16px;">${fill(t.newEventBody, v)}</p>${details(t, v)}
            <p style="margin: 16px 0 0;">${fill(t.newEventFooter, v)}</p>
          `,
  }),
  message: (t, v) => ({
    subject: fill(t.messageSubject, v),
    heading: fill(t.messageHeading, v),
    bodyHtml: `
            ${hi(t, v)}
            <p style="margin: 0 0 16px;">${fill(t.messageBody, v)}</p>
            ${quote(v)}
            <p style="margin: 16px 0 0;">${fill(t.messageFooter, v)}</p>
          `,
  }),
};

// { lang, subject, heading, bodyHtml } for one club email.
function clubEmail(kind, language, vars) {
  const lang = pickLanguage(language);
  return { lang, ...BUILD[kind](T[lang], vars) };
}

const settingsWord = (language) => T[pickLanguage(language)].settings;

module.exports = { clubEmail, settingsWord, T };

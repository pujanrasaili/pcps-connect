// Wording for the two emails students get on a schedule (the day-before event
// reminder and the weekly digest) in English and Nepali. English is the default
// and the fallback; the Nepali is a draft for a Nepali speaker to review.
// Values passed in must already be HTML-escaped by the caller.
const { pickLanguage } = require("./emailText");

const T = {
  en: {
    hi: "Hi {name},",
    when: "When:",
    where: "Where:",
    reminderSubject: "Reminder: {rawTitle} is coming up",
    reminderHeading: "Your event is coming up",
    reminderBody: "Just a reminder that you're registered for <strong>{title}</strong>, happening soon:",
    seeYou: "See you there!",
    volSubject: "Reminder: you're helping at {rawTitle}",
    volHeading: "You're helping at an event soon",
    volBody: "Thank you for helping! A reminder that you signed up as <strong>{role}</strong> at <strong>{title}</strong>:",
    volThanks: "The organisers are counting on you. If you can no longer make it, please cancel your sign-up on the event page so someone else can take your place.",
    reminderFooter: "You can turn event reminders off in {settings}.",
    digestSubjectOne: "1 event this week from your clubs",
    digestSubjectMany: "{count} events this week from your clubs",
    digestHeading: "This week from your clubs",
    digestIntro: "Here's what your clubs have planned in the next 7 days:",
    digestMore: "...and {more} more on the Events page.",
    digestFooter: "You're getting this because you joined these clubs. Turn club updates off in {settings} to stop these emails.",
    digestCta: "See all events",
    digestSubjectOneForYou: "1 event this week for you",
    digestSubjectManyForYou: "{count} events this week for you",
    digestHeadingForYou: "This week for you",
    digestIntroForYou: "Here's what's coming up in the next 7 days, from your clubs and the topics you follow:",
    digestFooterForYou: "You're getting this because you joined clubs or follow topics. Turn club updates off in {settings} to stop these emails.",
    nudgeSubjectOne: "1 student is still waiting to join your club",
    nudgeSubjectMany: "{count} students are still waiting to join your club",
    nudgeHeading: "Students are waiting for your decision",
    nudgeIntro: "These students asked to join a club that approves its members and have not heard back yet:",
    nudgeRow: "<strong>{club}</strong>: {count} waiting, the longest for {days} days",
    nudgeLink: "Open the Members window to approve or decline",
    feedbackSubject: "How was {rawTitle}?",
    feedbackHeading: "How was the event?",
    feedbackBody: "Thanks for coming to <strong>{title}</strong>. Rate it and leave a short comment so the organisers know what worked. It takes a few seconds:",
    feedbackCta: "Rate the event",
    feedbackFooter: "You can turn these emails off with event reminders in {settings}.",
    recapSubject: "Recap: how {rawTitle} went",
    recapHeading: "How your event went",
    recapBody: "Here is how <strong>{title}</strong> went:",
    recapAttended: "<strong>{attended} of {registered}</strong> registered students attended ({percent}%).",
    recapRated: "Average rating <strong>{average} / 5</strong> from {count} rating(s).",
    recapNoRatings: "Nobody has rated it yet.",
    recapComments: "What students wrote:",
    recapLink: "Open the full report",
    recapFooter: "You are getting this because you help run the event. Turn these emails off with event reminders in {settings}.",
    settings: "Settings",
  },
  ne: {
    hi: "नमस्ते {name},",
    when: "कहिले:",
    where: "कहाँ:",
    reminderSubject: "सम्झना: {rawTitle} नजिकै छ",
    reminderHeading: "तपाईंको कार्यक्रम नजिकै छ",
    reminderBody: "तपाईं <strong>{title}</strong> मा दर्ता हुनुभएको छ, जुन चाँडै हुँदैछ भनी सम्झाउन खोजेका हौं:",
    seeYou: "त्यहाँ भेटौंला!",
    volSubject: "सम्झना: तपाईं {rawTitle} मा सहयोग गर्दै हुनुहुन्छ",
    volHeading: "तपाईं चाँडै एउटा कार्यक्रममा सहयोग गर्दै हुनुहुन्छ",
    volBody: "सहयोग गर्नुभएकोमा धन्यवाद! तपाईंले <strong>{title}</strong> मा <strong>{role}</strong> को रूपमा साइन अप गर्नुभएको सम्झाउन खोजेका हौं:",
    volThanks: "आयोजकहरू तपाईंमा भरोसा गर्छन्। तपाईं आउन सक्ने अवस्था छैन भने कार्यक्रम पेजमा साइन अप रद्द गर्नुहोस्, ताकि अर्कोले तपाईंको ठाउँ लिन सकोस्।",
    reminderFooter: "कार्यक्रमको सम्झना इमेल {settings} मा बन्द गर्न सक्नुहुन्छ।",
    digestSubjectOne: "तपाईंका क्लबबाट यो हप्ता १ कार्यक्रम",
    digestSubjectMany: "तपाईंका क्लबबाट यो हप्ता {count} कार्यक्रम",
    digestHeading: "तपाईंका क्लबबाट यो हप्ता",
    digestIntro: "तपाईंका क्लबले आउँदा ७ दिनमा यी कार्यक्रम तय गरेका छन्:",
    digestMore: "...र कार्यक्रम पृष्ठमा थप {more} वटा छन्।",
    digestFooter: "तपाईं यी क्लबमा सामेल हुनुभएकाले यो इमेल पाउनुभएको हो। यी इमेल रोक्न क्लबका अपडेट {settings} मा बन्द गर्नुहोस्।",
    digestCta: "सबै कार्यक्रम हेर्नुहोस्",
    digestSubjectOneForYou: "तपाईंका लागि यो हप्ता १ कार्यक्रम",
    digestSubjectManyForYou: "तपाईंका लागि यो हप्ता {count} कार्यक्रम",
    digestHeadingForYou: "तपाईंका लागि यो हप्ता",
    digestIntroForYou: "आउँदा ७ दिनमा तपाईंका क्लब र तपाईंले पछ्याएका विषयका यी कार्यक्रम आउँदैछन्:",
    digestFooterForYou: "तपाईं क्लबमा सामेल हुनुभएकाले वा विषय पछ्याउनुभएकाले यो इमेल पाउनुभएको हो। यी इमेल रोक्न क्लबका अपडेट {settings} मा बन्द गर्नुहोस्।",
    nudgeSubjectOne: "१ विद्यार्थी अझै तपाईंको क्लबमा सामेल हुन पर्खिरहेका छन्",
    nudgeSubjectMany: "{count} विद्यार्थी अझै तपाईंको क्लबमा सामेल हुन पर्खिरहेका छन्",
    nudgeHeading: "विद्यार्थीहरू तपाईंको निर्णयको प्रतीक्षामा छन्",
    nudgeIntro: "यी विद्यार्थीहरूले सदस्यलाई स्वीकृत गर्ने क्लबमा सामेल हुन अनुरोध गरेका थिए र अझै जवाफ पाएका छैनन्:",
    nudgeRow: "<strong>{club}</strong>: {count} जना पर्खिरहेका, सबैभन्दा लामो {days} दिनदेखि",
    nudgeLink: "स्वीकृत वा अस्वीकृत गर्न सदस्य सूची खोल्नुहोस्",
    feedbackSubject: "{rawTitle} कस्तो लाग्यो?",
    feedbackHeading: "कार्यक्रम कस्तो लाग्यो?",
    feedbackBody: "<strong>{title}</strong> मा आउनुभएकोमा धन्यवाद। यसलाई मूल्यांकन गर्नुहोस् र छोटो टिप्पणी दिनुहोस्, ताकि आयोजकहरूले के राम्रो भयो भनेर जान्न सकून्। यसमा केही सेकेन्ड मात्र लाग्छ:",
    feedbackCta: "कार्यक्रम मूल्यांकन गर्नुहोस्",
    feedbackFooter: "कार्यक्रमको सम्झनाका साथ यी इमेल पनि {settings} मा बन्द गर्न सक्नुहुन्छ।",
    recapSubject: "सारांश: {rawTitle} कस्तो भयो",
    recapHeading: "तपाईंको कार्यक्रम कस्तो भयो",
    recapBody: "<strong>{title}</strong> कस्तो भयो भन्ने सारांश यहाँ छ:",
    recapAttended: "दर्ता भएका {registered} जना विद्यार्थीमध्ये <strong>{attended} जना</strong> उपस्थित भए ({percent}%)।",
    recapRated: "{count} वटा मूल्यांकनबाट औसत मूल्यांकन <strong>{average} / 5</strong>।",
    recapNoRatings: "अहिलेसम्म कसैले मूल्यांकन गरेका छैनन्।",
    recapComments: "विद्यार्थीहरूले लेखेका कुरा:",
    recapLink: "पूरा रिपोर्ट खोल्नुहोस्",
    recapFooter: "तपाईंले कार्यक्रम सञ्चालनमा सहयोग गर्नुभएकाले यो इमेल पाउनुभएको हो। कार्यक्रमको सम्झनाका साथ यी इमेल पनि {settings} मा बन्द गर्न सक्नुहुन्छ।",
    settings: "सेटिङ",
  },
};

const fill = (text, v) => text.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined ? `{${k}}` : v[k]));
const text = (language, key, vars = {}) => fill(T[pickLanguage(language)][key], vars);
const settingsWord = (language) => T[pickLanguage(language)].settings;

// { lang, subject, heading, bodyHtml } for the event reminder.
function eventReminderEmail(language, v) {
  const lang = pickLanguage(language);
  const t = T[lang];
  return {
    lang,
    subject: fill(t.reminderSubject, v),
    heading: t.reminderHeading,
    bodyHtml: `
              <p style="margin: 0 0 12px;">${fill(t.hi, v)}</p>
              <p style="margin: 0 0 16px;">${fill(t.reminderBody, v)}</p>
              <p style="margin: 0 0 4px;"><strong>${t.when}</strong> ${v.when}</p>
              <p style="margin: 0;"><strong>${t.where}</strong> ${v.where}</p>
              <p style="margin: 16px 0 0;">${t.seeYou}</p>
              <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">${fill(t.reminderFooter, v)}</p>
            `,
  };
}

// { lang, subject, heading, bodyHtml } for the "How was the event?" email.
// v.profileLink is the full address of the page where students rate events.
function feedbackRequestEmail(language, v) {
  const lang = pickLanguage(language);
  const t = T[lang];
  return {
    lang,
    subject: fill(t.feedbackSubject, v),
    heading: t.feedbackHeading,
    bodyHtml: `
              <p style="margin: 0 0 12px;">${fill(t.hi, v)}</p>
              <p style="margin: 0 0 16px;">${fill(t.feedbackBody, v)}</p>
              <p style="margin: 0;"><a href="${v.profileLink}" style="display: inline-block; background: #4F46E5; color: #ffffff; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: 600;">${t.feedbackCta}</a></p>
              <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">${fill(t.feedbackFooter, v)}</p>
            `,
  };
}

// { lang, subject, heading, bodyHtml } for the recap sent to an event's organisers.
// v.comments is an array of already-escaped strings; v.reportLink is the full address.
function eventRecapEmail(language, v) {
  const lang = pickLanguage(language);
  const t = T[lang];
  const rated = v.count > 0 ? fill(t.recapRated, v) : t.recapNoRatings;
  const comments = (v.comments || []).length
    ? `<p style="margin: 16px 0 4px;"><strong>${t.recapComments}</strong></p>${v.comments.map((c) => `<p style="margin: 0 0 6px; padding-left: 10px; border-left: 3px solid #cbd5e1;">${c}</p>`).join("")}`
    : "";
  return {
    lang,
    subject: fill(t.recapSubject, v),
    heading: t.recapHeading,
    bodyHtml: `
              <p style="margin: 0 0 12px;">${fill(t.hi, v)}</p>
              <p style="margin: 0 0 12px;">${fill(t.recapBody, v)}</p>
              <p style="margin: 0 0 4px;">${fill(t.recapAttended, v)}</p>
              <p style="margin: 0;">${rated}</p>
              ${comments}
              <p style="margin: 16px 0 0;"><a href="${v.reportLink}" style="color: #4F46E5;">${t.recapLink}</a></p>
              <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">${fill(t.recapFooter, v)}</p>
            `,
  };
}

// { lang, subject, heading, bodyHtml } for the reminder to a student helping at an event.
function volunteerReminderEmail(language, v) {
  const lang = pickLanguage(language);
  const t = T[lang];
  return {
    lang,
    subject: fill(t.volSubject, v),
    heading: t.volHeading,
    bodyHtml: `
              <p style="margin: 0 0 12px;">${fill(t.hi, v)}</p>
              <p style="margin: 0 0 16px;">${fill(t.volBody, v)}</p>
              <p style="margin: 0 0 4px;"><strong>${t.when}</strong> ${v.when}</p>
              <p style="margin: 0;"><strong>${t.where}</strong> ${v.where}</p>
              <p style="margin: 16px 0 0;">${t.volThanks}</p>
              <p style="margin: 16px 0 0; font-size: 13px; color: #64748b;">${fill(t.reminderFooter, v)}</p>
            `,
  };
}

module.exports = { eventReminderEmail, feedbackRequestEmail, eventRecapEmail, volunteerReminderEmail, text, settingsWord, T };

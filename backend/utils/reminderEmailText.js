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
    reminderFooter: "You can turn event reminders off in {settings}.",
    digestSubjectOne: "1 event this week from your clubs",
    digestSubjectMany: "{count} events this week from your clubs",
    digestHeading: "This week from your clubs",
    digestIntro: "Here's what your clubs have planned in the next 7 days:",
    digestMore: "...and {more} more on the Events page.",
    digestFooter: "You're getting this because you joined these clubs. Turn club updates off in {settings} to stop these emails.",
    digestCta: "See all events",
    nudgeSubjectOne: "1 student is still waiting to join your club",
    nudgeSubjectMany: "{count} students are still waiting to join your club",
    nudgeHeading: "Students are waiting for your decision",
    nudgeIntro: "These students asked to join a club that approves its members and have not heard back yet:",
    nudgeRow: "<strong>{club}</strong>: {count} waiting, the longest for {days} days",
    nudgeLink: "Open the Members window to approve or decline",
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
    reminderFooter: "कार्यक्रमको सम्झना इमेल {settings} मा बन्द गर्न सक्नुहुन्छ।",
    digestSubjectOne: "तपाईंका क्लबबाट यो हप्ता १ कार्यक्रम",
    digestSubjectMany: "तपाईंका क्लबबाट यो हप्ता {count} कार्यक्रम",
    digestHeading: "तपाईंका क्लबबाट यो हप्ता",
    digestIntro: "तपाईंका क्लबले आउँदा ७ दिनमा यी कार्यक्रम तय गरेका छन्:",
    digestMore: "...र कार्यक्रम पृष्ठमा थप {more} वटा छन्।",
    digestFooter: "तपाईं यी क्लबमा सामेल हुनुभएकाले यो इमेल पाउनुभएको हो। यी इमेल रोक्न क्लबका अपडेट {settings} मा बन्द गर्नुहोस्।",
    digestCta: "सबै कार्यक्रम हेर्नुहोस्",
    nudgeSubjectOne: "१ विद्यार्थी अझै तपाईंको क्लबमा सामेल हुन पर्खिरहेका छन्",
    nudgeSubjectMany: "{count} विद्यार्थी अझै तपाईंको क्लबमा सामेल हुन पर्खिरहेका छन्",
    nudgeHeading: "विद्यार्थीहरू तपाईंको निर्णयको प्रतीक्षामा छन्",
    nudgeIntro: "यी विद्यार्थीहरूले सदस्यलाई स्वीकृत गर्ने क्लबमा सामेल हुन अनुरोध गरेका थिए र अझै जवाफ पाएका छैनन्:",
    nudgeRow: "<strong>{club}</strong>: {count} जना पर्खिरहेका, सबैभन्दा लामो {days} दिनदेखि",
    nudgeLink: "स्वीकृत वा अस्वीकृत गर्न सदस्य सूची खोल्नुहोस्",
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

module.exports = { eventReminderEmail, text, settingsWord, T };

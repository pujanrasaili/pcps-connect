// Wording for the remaining student-facing emails (account approved or not,
// new club leader, question asked, question answered) in English and Nepali.
// English is the default and the fallback; the Nepali is a draft for a Nepali
// speaker to review. Values passed in must already be HTML-escaped.
const { pickLanguage } = require("./emailText");

const T = {
  en: {
    hi: "Hi {name},",
    approvedSubject: "Your PCPS Connect account is approved",
    approvedHeading: "You're approved!",
    approvedBody: "Your PCPS Connect account has been approved. You can log in now and start exploring clubs and events.",
    approvedCta: "Log in",
    rejectedSubject: "Update on your PCPS Connect registration",
    rejectedHeading: "Registration update",
    rejectedBody: "Your PCPS Connect registration wasn't approved. If you think this is a mistake, please contact PCPS administration.",
    leaderSubject: "You're now a leader of {rawClub}",
    leaderHeading: "You're a leader of {rawClub}",
    leaderBody1: "An admin has made you a leader of <strong>{club}</strong> on PCPS Connect.",
    leaderBody2: "Log in and open <strong>Manage</strong> in the top menu to create events for the club, see who registered, mark attendance and check students in.",
    askedSubject: "New question on {rawTitle}",
    askedHeading: "A student asked a question",
    askedBody: "<strong>{asker}</strong> asked on <strong>{title}</strong>:",
    askedFooter: "Open the event page to answer. Your answer will be public.",
    askedCta: "Answer the question",
    answeredSubject: "Your question about {rawTitle} was answered",
    answeredHeading: "Your question was answered",
    youAsked: "You asked:",
    answer: "Answer:",
    answeredCta: "View the event",
  },
  ne: {
    hi: "नमस्ते {name},",
    approvedSubject: "तपाईंको PCPS Connect खाता स्वीकृत भयो",
    approvedHeading: "तपाईं स्वीकृत हुनुभयो!",
    approvedBody: "तपाईंको PCPS Connect खाता स्वीकृत भएको छ। तपाईं अब लगइन गरेर क्लब र कार्यक्रम हेर्न सुरु गर्न सक्नुहुन्छ।",
    approvedCta: "लगइन",
    rejectedSubject: "तपाईंको PCPS Connect दर्ताबारे जानकारी",
    rejectedHeading: "दर्ताबारे जानकारी",
    rejectedBody: "तपाईंको PCPS Connect दर्ता स्वीकृत भएन। यो गल्ती हो जस्तो लागेमा कृपया PCPS प्रशासनलाई सम्पर्क गर्नुहोस्।",
    leaderSubject: "तपाईं अब {rawClub} का नेता हुनुहुन्छ",
    leaderHeading: "तपाईं {rawClub} का नेता हुनुहुन्छ",
    leaderBody1: "एक एडमिनले तपाईंलाई PCPS Connect मा <strong>{club}</strong> को नेता बनाएका छन्।",
    leaderBody2: "लगइन गरेर माथिको मेनुमा <strong>व्यवस्थापन</strong> खोल्नुहोस्, जहाँबाट क्लबका कार्यक्रम बनाउन, को दर्ता भए हेर्न, उपस्थिति जनाउन र विद्यार्थीलाई चेक-इन गर्न सकिन्छ।",
    askedSubject: "{rawTitle} मा नयाँ प्रश्न",
    askedHeading: "एक विद्यार्थीले प्रश्न सोधे",
    askedBody: "<strong>{asker}</strong> ले <strong>{title}</strong> मा सोधे:",
    askedFooter: "जवाफ दिन कार्यक्रमको पृष्ठ खोल्नुहोस्। तपाईंको जवाफ सबैले देख्नेछन्।",
    askedCta: "प्रश्नको जवाफ दिनुहोस्",
    answeredSubject: "{rawTitle} बारेको तपाईंको प्रश्नको जवाफ आयो",
    answeredHeading: "तपाईंको प्रश्नको जवाफ आयो",
    youAsked: "तपाईंले सोध्नुभयो:",
    answer: "जवाफ:",
    answeredCta: "कार्यक्रम हेर्नुहोस्",
  },
};

const fill = (text, v) => text.replace(/\{(\w+)\}/g, (_, k) => (v[k] === undefined ? `{${k}}` : v[k]));
const p = (text, margin = "0 0 16px") => `<p style="margin: ${margin};">${text}</p>`;
const hi = (t, v) => p(fill(t.hi, v), "0 0 12px");

const BUILD = {
  approved: (t, v) => ({ subject: t.approvedSubject, heading: t.approvedHeading, ctaText: t.approvedCta, bodyHtml: `${hi(t, v)}${p(t.approvedBody, "0")}` }),
  rejected: (t, v) => ({ subject: t.rejectedSubject, heading: t.rejectedHeading, bodyHtml: `${hi(t, v)}${p(t.rejectedBody, "0")}` }),
  leader: (t, v) => ({
    subject: fill(t.leaderSubject, v),
    heading: fill(t.leaderHeading, v),
    bodyHtml: `${hi(t, v)}${p(fill(t.leaderBody1, v))}${p(t.leaderBody2, "0")}`,
  }),
  asked: (t, v) => ({
    subject: fill(t.askedSubject, v),
    heading: t.askedHeading,
    ctaText: t.askedCta,
    bodyHtml: `${p(fill(t.askedBody, v), "0 0 12px")}<p style="margin: 0 0 16px; padding: 12px; background: #f1f5f9; border-radius: 8px;">${v.question}</p>${p(t.askedFooter, "0")}`,
  }),
  answered: (t, v) => ({
    subject: fill(t.answeredSubject, v),
    heading: t.answeredHeading,
    ctaText: t.answeredCta,
    bodyHtml: `${hi(t, v)}
        ${p(`<strong>${t.youAsked}</strong>`, "0 0 8px")}
        <p style="margin: 0 0 16px; padding: 12px; background: #f1f5f9; border-radius: 8px;">${v.question}</p>
        ${p(`<strong>${t.answer}</strong>`, "0 0 8px")}
        <p style="margin: 0 0 16px; padding: 12px; background: #eef2ff; border-radius: 8px;">${v.answer}</p>`,
  }),
};

// { lang, subject, heading, bodyHtml, ctaText? } for one notice email.
function noticeEmail(kind, language, vars) {
  const lang = pickLanguage(language);
  return { lang, ...BUILD[kind](T[lang], vars) };
}

module.exports = { noticeEmail, T };

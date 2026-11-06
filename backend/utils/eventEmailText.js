// Wording for the event emails (registration confirmed, request received or
// declined, waitlist spot opened, event changed, cancelled, announcement) in
// English and Nepali. English is the default and the fallback. The Nepali is a
// draft for a Nepali speaker to review.
//
// Every value passed in (`name`, `title`, `when`, `where`, ...) must already be
// HTML-escaped by the caller; this file only chooses and arranges the words.
const { pickLanguage } = require("./emailText");

const GREETING = { en: "Hi {name},", ne: "नमस्ते {name}," };
const LABEL = {
  en: { when: "When:", where: "Where:", newWhen: "New date/time:", newWhere: "New location:", was: "was" },
  ne: { when: "कहिले:", where: "कहाँ:", newWhen: "नयाँ मिति/समय:", newWhere: "नयाँ स्थान:", was: "पहिले" },
};

const p = (text, after = "0 0 16px") => `<p style="margin: ${after};">${text}</p>`;
const hi = (lang, v) => `<p style="margin: 0 0 12px;">${GREETING[lang].replace("{name}", v.name)}</p>`;
const details = (lang, v) => `
  <p style="margin: 0 0 4px;"><strong>${LABEL[lang].when}</strong> ${v.when}</p>
  <p style="margin: 0;"><strong>${LABEL[lang].where}</strong> ${v.where}</p>`;

const MAIL = {
  confirmed: {
    en: (v) => ({
      subject: `You're registered: ${v.rawTitle}`,
      heading: "Registration confirmed",
      bodyHtml: `${hi("en", v)}
          ${p(`You're confirmed for <strong>${v.title}</strong>. Here are the details:`)}
          ${details("en", v)}
          ${p("You can cancel anytime from your Dashboard if your plans change.", "16px 0 0")}`,
    }),
    ne: (v) => ({
      subject: `तपाईं दर्ता हुनुभयो: ${v.rawTitle}`,
      heading: "दर्ता पुष्टि भयो",
      bodyHtml: `${hi("ne", v)}
          ${p(`तपाईं <strong>${v.title}</strong> का लागि पक्का हुनुभएको छ। विवरण यस प्रकार छ:`)}
          ${details("ne", v)}
          ${p("योजना बदलिएमा तपाईं जुनसुकै बेला ड्यासबोर्डबाट रद्द गर्न सक्नुहुन्छ।", "16px 0 0")}`,
    }),
  },
  requestReceived: {
    en: (v) => ({
      subject: `Request received: ${v.rawTitle}`,
      heading: "We got your request",
      bodyHtml: `${hi("en", v)}
          ${p(`The organisers of <strong>${v.title}</strong> approve each person who joins. Your request has been sent and a seat is being held for you.`)}
          ${details("en", v)}
          ${p("You'll get another email as soon as they decide. You can withdraw your request from your Dashboard.", "16px 0 0")}`,
    }),
    ne: (v) => ({
      subject: `अनुरोध प्राप्त भयो: ${v.rawTitle}`,
      heading: "हामीले तपाईंको अनुरोध पायौं",
      bodyHtml: `${hi("ne", v)}
          ${p(`<strong>${v.title}</strong> का आयोजकहरूले सामेल हुने हरेक व्यक्तिलाई स्वीकृत गर्छन्। तपाईंको अनुरोध पठाइएको छ र तपाईंका लागि एउटा सिट रोकिएको छ।`)}
          ${details("ne", v)}
          ${p("उनीहरूले निर्णय गर्नेबित्तिकै तपाईंलाई अर्को इमेल आउनेछ। तपाईं ड्यासबोर्डबाट आफ्नो अनुरोध फिर्ता लिन सक्नुहुन्छ।", "16px 0 0")}`,
    }),
  },
  requestDeclined: {
    en: (v) => ({
      subject: `Update on your request: ${v.rawTitle}`,
      heading: "Your request wasn't approved",
      bodyHtml: `${hi("en", v)}
          ${p(`Sorry -- the organisers couldn't approve your request to join <strong>${v.title}</strong> this time.`)}
          ${p("There are plenty of other events on PCPS Connect, and you're welcome to ask the club directly if you have questions.", "0")}`,
    }),
    ne: (v) => ({
      subject: `तपाईंको अनुरोधबारे जानकारी: ${v.rawTitle}`,
      heading: "तपाईंको अनुरोध स्वीकृत भएन",
      bodyHtml: `${hi("ne", v)}
          ${p(`माफ गर्नुहोस् -- आयोजकहरूले यसपटक <strong>${v.title}</strong> मा सामेल हुने तपाईंको अनुरोध स्वीकृत गर्न सकेनन्।`)}
          ${p("PCPS Connect मा अरू धेरै कार्यक्रम छन्, र प्रश्न भए क्लबलाई सिधै सोध्न सक्नुहुन्छ।", "0")}`,
    }),
  },
  spotOpened: {
    en: (v) => ({
      subject: `A spot opened up: ${v.rawTitle}`,
      heading: v.needsApproval ? "A spot opened up" : "You're in!",
      bodyHtml: `${hi("en", v)}
          ${p(`A spot opened up for <strong>${v.title}</strong> and you were next on the waitlist, so ${v.needsApproval ? "your request to join is now with the organisers, who approve each person. A seat is being held for you and you'll get another email when they decide" : "you're now registered"}.`)}
          ${details("en", v)}
          ${p("Can't make it any more? Unregister from your Dashboard so the next person gets the spot.", "16px 0 0")}`,
    }),
    ne: (v) => ({
      subject: `सिट खुल्यो: ${v.rawTitle}`,
      heading: v.needsApproval ? "सिट खुल्यो" : "तपाईं भित्र हुनुहुन्छ!",
      bodyHtml: `${hi("ne", v)}
          ${p(`<strong>${v.title}</strong> मा सिट खुल्यो र तपाईं प्रतीक्षा सूचीमा अर्को हुनुहुन्थ्यो, त्यसैले ${v.needsApproval ? "तपाईंको सामेल हुने अनुरोध अहिले आयोजकहरूसँग छ, जसले हरेक व्यक्तिलाई स्वीकृत गर्छन्। तपाईंको लागि एउटा सिट रोकिएको छ र उनीहरूले निर्णय गर्दा तपाईंलाई अर्को इमेल आउनेछ" : "तपाईं अहिले दर्ता हुनुभएको छ"}।`)}
          ${details("ne", v)}
          ${p("अब आउन सक्नुहुन्न? अर्को व्यक्तिले सिट पाउन ड्यासबोर्डबाट दर्ता रद्द गर्नुहोस्।", "16px 0 0")}`,
    }),
  },
  rescheduled: {
    en: (v) => ({
      heading: `Event updated: ${v.rawTitle}`,
      bodyHtml: `${hi("en", v)}
      ${p(`An event you're registered for -- <strong>${v.title}</strong> -- has changed:`)}
      ${changes("en", v)}
      ${p("If the new details don't work for you, you can cancel anytime from your Dashboard.", "16px 0 0")}`,
    }),
    ne: (v) => ({
      heading: `कार्यक्रम अपडेट: ${v.rawTitle}`,
      bodyHtml: `${hi("ne", v)}
      ${p(`तपाईं दर्ता भएको कार्यक्रम -- <strong>${v.title}</strong> -- बदलिएको छ:`)}
      ${changes("ne", v)}
      ${p("नयाँ विवरण मिलेन भने जुनसुकै बेला ड्यासबोर्डबाट रद्द गर्न सक्नुहुन्छ।", "16px 0 0")}`,
    }),
  },
  cancelled: {
    en: (v) => ({
      heading: `Event cancelled: ${v.rawTitle}`,
      bodyHtml: `${hi("en", v)}
      ${p(`<strong>${v.title}</strong>, scheduled for ${v.when}, has been cancelled. You don't need to do anything -- your registration has been removed automatically.`, "0")}`,
    }),
    ne: (v) => ({
      heading: `कार्यक्रम रद्द: ${v.rawTitle}`,
      bodyHtml: `${hi("ne", v)}
      ${p(`<strong>${v.title}</strong>, जुन ${v.when} मा तय भएको थियो, रद्द गरिएको छ। तपाईंले केही गर्नुपर्दैन -- तपाईंको दर्ता आफैं हटाइएको छ।`, "0")}`,
    }),
  },
  announcement: {
    en: (v) => ({
      heading: `Message about ${v.rawTitle}`,
      bodyHtml: `${hi("en", v)}
      ${p(`The organisers of <strong>${v.title}</strong> (${v.when}, ${v.where}) have sent a message to everyone registered:`)}
      <div style="margin: 0; padding: 12px 16px; border-left: 3px solid #6366f1; background: #f8fafc;">${v.messageHtml}</div>`,
    }),
    ne: (v) => ({
      heading: `${v.rawTitle} बारे सन्देश`,
      bodyHtml: `${hi("ne", v)}
      ${p(`<strong>${v.title}</strong> (${v.when}, ${v.where}) का आयोजकहरूले दर्ता भएका सबैलाई सन्देश पठाएका छन्:`)}
      <div style="margin: 0; padding: 12px 16px; border-left: 3px solid #6366f1; background: #f8fafc;">${v.messageHtml}</div>`,
    }),
  },
};

function changes(lang, v) {
  const l = LABEL[lang];
  return [
    v.dateChanged &&
      `<p style="margin: 0 0 4px;"><strong>${l.newWhen}</strong> ${v.when} <span style="color: #94a3b8;">(${l.was} ${v.oldWhen})</span></p>`,
    v.locationChanged &&
      `<p style="margin: 0;"><strong>${l.newWhere}</strong> ${v.where} <span style="color: #94a3b8;">(${l.was} ${v.oldWhere})</span></p>`,
  ]
    .filter(Boolean)
    .join("");
}

// { subject?, heading, bodyHtml, lang } for one event email. `rawTitle` is the
// unescaped title (used in subjects, which are plain text); `title` is escaped.
function eventEmail(kind, language, vars) {
  const lang = pickLanguage(language);
  return { lang, ...MAIL[kind][lang](vars) };
}

module.exports = { eventEmail, MAIL };

// Wording for the account emails (verify, reset, password changed, account
// deleted) in English and Nepali. English is the default and the fallback: a
// language this file doesn't know, or an account with no saved language, gets
// English. The Nepali is a draft for a Nepali speaker to review.
const LANGUAGES = ["en", "ne"];

// First valid language among the candidates, else English.
function pickLanguage(...candidates) {
  return candidates.find((value) => LANGUAGES.includes(value)) || "en";
}

const COPY = {
  verify: {
    en: {
      subject: "Verify your PCPS Connect account",
      heading: "Verify your email",
      paragraphs: [
        "Thanks for registering for PCPS Connect. Click below to verify your email address. This link expires in 24 hours.",
        "After verifying, an admin will need to approve your account before you can log in -- you'll be able to log in as soon as that happens.",
      ],
      cta: "Verify my email",
    },
    ne: {
      subject: "आफ्नो PCPS Connect खाता प्रमाणित गर्नुहोस्",
      heading: "आफ्नो इमेल प्रमाणित गर्नुहोस्",
      paragraphs: [
        "PCPS Connect मा दर्ता गर्नुभएकोमा धन्यवाद। आफ्नो इमेल ठेगाना प्रमाणित गर्न तल क्लिक गर्नुहोस्। यो लिङ्क २४ घण्टामा सकिन्छ।",
        "प्रमाणित गरेपछि, लगइन गर्न प्रशासकले तपाईंको खाता स्वीकृत गर्नुपर्छ -- स्वीकृत हुनेबित्तिकै तपाईं लगइन गर्न सक्नुहुनेछ।",
      ],
      cta: "मेरो इमेल प्रमाणित गर्नुहोस्",
    },
  },
  reset: {
    en: {
      subject: "Reset your PCPS Connect password",
      heading: "Reset your password",
      paragraphs: [
        "Someone requested a password reset for your PCPS Connect account. If this was you, click below to set a new password. This link expires in 15 minutes.",
        "If you didn't request this, you can safely ignore this email -- your password won't be changed.",
      ],
      cta: "Reset my password",
    },
    ne: {
      subject: "आफ्नो PCPS Connect पासवर्ड रिसेट गर्नुहोस्",
      heading: "आफ्नो पासवर्ड रिसेट गर्नुहोस्",
      paragraphs: [
        "कसैले तपाईंको PCPS Connect खाताको पासवर्ड रिसेट गर्न अनुरोध गरेका छन्। यो तपाईं नै हो भने नयाँ पासवर्ड राख्न तल क्लिक गर्नुहोस्। यो लिङ्क १५ मिनेटमा सकिन्छ।",
        "तपाईंले अनुरोध गर्नुभएको होइन भने यो इमेललाई बेवास्ता गर्न सक्नुहुन्छ -- तपाईंको पासवर्ड बदलिने छैन।",
      ],
      cta: "मेरो पासवर्ड रिसेट गर्नुहोस्",
    },
  },
  passwordChanged: {
    en: {
      subject: "Your PCPS Connect password was changed",
      heading: "Password changed",
      paragraphs: [
        "This is a confirmation that your PCPS Connect password was just changed.",
        "If this was you, no action is needed. If you didn't do this, your account may be compromised -- contact PCPS administration right away.",
      ],
    },
    ne: {
      subject: "तपाईंको PCPS Connect पासवर्ड बदलियो",
      heading: "पासवर्ड बदलियो",
      paragraphs: [
        "तपाईंको PCPS Connect पासवर्ड अहिले बदलिएको पुष्टि गर्न यो इमेल पठाइएको हो।",
        "यो तपाईंले नै गर्नुभएको हो भने केही गर्नुपर्दैन। तपाईंले गर्नुभएको होइन भने तपाईंको खाता जोखिममा हुन सक्छ -- तुरुन्तै PCPS प्रशासनलाई सम्पर्क गर्नुहोस्।",
      ],
    },
  },
  accountDeleted: {
    en: {
      subject: "Your PCPS Connect account was deleted",
      heading: "Account deleted",
      paragraphs: [
        "Your PCPS Connect account and its registrations, club memberships and events have been deleted. If this wasn't you, contact the college administration right away.",
      ],
    },
    ne: {
      subject: "तपाईंको PCPS Connect खाता मेटाइयो",
      heading: "खाता मेटाइयो",
      paragraphs: [
        "तपाईंको PCPS Connect खाता र त्यसका दर्ता, क्लब सदस्यता र कार्यक्रमहरू मेटाइएका छन्। यो तपाईंले गरेको होइन भने तुरुन्तै कलेज प्रशासनलाई सम्पर्क गर्नुहोस्।",
      ],
    },
  },
};

const GREETING = { en: "Hi {name},", ne: "नमस्ते {name}," };
const PASTE_LINK = { en: "Or paste this link into your browser:", ne: "वा यो लिङ्क आफ्नो ब्राउजरमा टाँस्नुहोस्:" };

// The text of one account email, ready for sendEmail/renderEmail.
// `escape` is the HTML escaper, passed in so this file stays plain data.
function accountEmail(kind, language, { name, escape }) {
  const lang = pickLanguage(language);
  const copy = COPY[kind][lang];
  const greeting = GREETING[lang].replace("{name}", escape(name));
  const bodyHtml = [
    `<p style="margin: 0 0 12px;">${greeting}</p>`,
    ...copy.paragraphs.map((text, i) => `<p style="margin: ${i === 0 ? 0 : "16px 0 0"};">${text}</p>`),
  ].join("\n        ");
  return { lang, subject: copy.subject, heading: copy.heading, bodyHtml, ctaText: copy.cta };
}

module.exports = { LANGUAGES, pickLanguage, accountEmail, PASTE_LINK, COPY };
